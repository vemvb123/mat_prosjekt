import { createClient } from "redis";

// Redis-cache for søkeresultater.
//
// Filen inneholder all cache-logikk backend-rutene trenger:
// - kobling mot Redis når miljøvariabler finnes
// - stabile cache-nøkler for søk
// - ukentlig utløp mandag kl. 03:00 norsk tid
// - henting av ti sider om gangen, slik at paging føles raskere
const DEFAULT_CACHE_TTL_SECONDS = 60 * 60;
const PAGE_BLOCK_SIZE = 10;

let clientPromise = null;

// Redis er valgfritt. Hvis dette mangler, skal resten av appen fortsatt søke direkte.
function isRedisConfigured() {
  return Boolean(process.env.REDIS_HOST && process.env.REDIS_PASSWORD);
}

// Oppretter Redis-klienten én gang og gjenbruker samme tilkobling videre.
function getRedisClient() {
  if (!isRedisConfigured()) {
    return null;
  }

  if (!clientPromise) {
    const port = Number(process.env.REDIS_PORT || "10000");
    const socket = {
      host: process.env.REDIS_HOST,
      port,
      tls: process.env.REDIS_TLS !== "false",
    };

    const clientOptions = {
      password: process.env.REDIS_PASSWORD,
      socket,
    };
    if (process.env.REDIS_USERNAME) {
      clientOptions.username = process.env.REDIS_USERNAME;
    }

    const client = createClient(clientOptions);

    client.on("error", (error) => {
      console.error("Redis client error:", error);
    });

    clientPromise = client.connect().then(() => client);
  }

  return clientPromise;
}

// Lager en cache-nøkkel som skiller på søkemodus, tekst, kjeder, enhet og side.
function buildCacheKey(namespace, params) {
  const chains = [...params.chains].sort().join(",");
  return [
    namespace,
    params.mode,
    params.query.toLowerCase().trim(),
    `chains=${chains}`,
    `compareUnit=${params.compareUnit}`,
    `page=${params.page}`,
    `pageSize=${params.pageSize}`,
  ].join(":");
}

// Henter ukedag og klokkeslett for en dato i norsk tid.
function osloDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Oslo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

// Regner ut hvor lenge en cache-verdi kan leve før neste mandag kl. 03:00.
function secondsUntilNextWeeklyReset(now = new Date()) {
  const start = now.getTime();
  const minuteMs = 60 * 1000;

  // Vi søker minutt for minutt for å slippe kantfeil rundt sommertid/vintertid.
  for (let minutes = 1; minutes <= 8 * 24 * 60; minutes += 1) {
    const candidate = new Date(start + minutes * minuteMs);
    const parts = osloDateParts(candidate);
    if (parts.weekday === "Mon" && parts.hour === "03" && parts.minute === "00") {
      return Math.max(60, Math.ceil((candidate.getTime() - start) / 1000));
    }
  }

  return DEFAULT_CACHE_TTL_SECONDS;
}

// Leser og parser JSON fra Redis. Returnerer null ved cache miss eller uten Redis.
async function getCachedJson(key) {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const cached = await client.get(key);
  return cached ? JSON.parse(cached) : null;
}

// Lagrer JSON i Redis med TTL. Verdien må være JSON-serialiserbar.
async function setCachedJson(key, value, ttlSeconds = Number(process.env.REDIS_CACHE_TTL_SECONDS || DEFAULT_CACHE_TTL_SECONDS)) {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });
}

// Finn første side i blokken på ti sider som den forespurte siden tilhører.
function pageBlockStart(page, blockSize = PAGE_BLOCK_SIZE) {
  return Math.floor((page - 1) / blockSize) * blockSize + 1;
}

// Bygger vanlig side-respons fra et større vindu med søkeresultater.
function pageFromWindow(windowPayload, page, pageSize, items) {
  return {
    ...windowPayload,
    page,
    pageSize,
    bestItem: page === 1 ? windowPayload.bestItem : items[0] || null,
    items,
  };
}

// Cache-wrapper for paginerte søk.
//
// Når brukeren ber om én side, henter vi ti sider fra databasen, splitter dem opp
// og legger hver side i Redis. Neste paging-klikk kan derfor ofte svares direkte
// fra cache.
async function withPagedJsonCache(params, loadWindow, context = console) {
  const requestedKey = buildCacheKey("search", params);
  try {
    const cached = await getCachedJson(requestedKey);
    if (cached) {
      context.log?.(`Redis cache hit: ${requestedKey}`);
      return {
        ...cached,
        cache: "hit",
      };
    }
  } catch (error) {
    context.warn?.("Redis cache read failed, continuing without cache:", error);
  }

  const blockStart = pageBlockStart(params.page);
  const windowLimit = params.pageSize * PAGE_BLOCK_SIZE;
  const windowOffset = (blockStart - 1) * params.pageSize;
  const windowPayload = await loadWindow(blockStart, windowLimit, windowOffset);
  const ttlSeconds = secondsUntilNextWeeklyReset();
  const pages = [];

  // Del databasevinduet tilbake i samme sideformat som frontend forventer.
  for (let index = 0; index < PAGE_BLOCK_SIZE; index += 1) {
    const page = blockStart + index;
    const start = index * params.pageSize;
    const items = (windowPayload.items || []).slice(start, start + params.pageSize);
    if (items.length === 0 && page > windowPayload.totalPages) {
      continue;
    }

    pages.push(pageFromWindow(windowPayload, page, params.pageSize, items));
  }

  try {
    await Promise.all(pages.map((payload) => setCachedJson(buildCacheKey("search", { ...params, page: payload.page }), payload, ttlSeconds)));
    context.log?.(`Redis cache stored pages ${blockStart}-${blockStart + PAGE_BLOCK_SIZE - 1}`);
  } catch (error) {
    context.warn?.("Redis cache write failed, returning uncached result:", error);
  }

  const requestedPage = pages.find((payload) => payload.page === params.page) || pageFromWindow(windowPayload, params.page, params.pageSize, []);
  return {
    ...requestedPage,
    cache: "miss",
  };
}

// Enkel cache-wrapper for ikke-paginerte JSON-responser.
async function withJsonCache(key, loadValue, context = console) {
  try {
    const cached = await getCachedJson(key);
    if (cached) {
      context.log?.(`Redis cache hit: ${key}`);
      return {
        ...cached,
        cache: "hit",
      };
    }
  } catch (error) {
    context.warn?.("Redis cache read failed, continuing without cache:", error);
  }

  const value = await loadValue();

  try {
    await setCachedJson(key, value);
    context.log?.(`Redis cache stored: ${key}`);
  } catch (error) {
    context.warn?.("Redis cache write failed, returning uncached result:", error);
  }

  return {
    ...value,
    cache: "miss",
  };
}

export { buildCacheKey, secondsUntilNextWeeklyReset, withJsonCache, withPagedJsonCache };
