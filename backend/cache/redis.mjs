import { createClient } from "redis";

const DEFAULT_CACHE_TTL_SECONDS = 60 * 60;
const PAGE_BLOCK_SIZE = 10;

let clientPromise = null;

function isRedisConfigured() {
  return Boolean(process.env.REDIS_HOST && process.env.REDIS_PASSWORD);
}

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

function secondsUntilNextWeeklyReset(now = new Date()) {
  const start = now.getTime();
  const minuteMs = 60 * 1000;

  for (let minutes = 1; minutes <= 8 * 24 * 60; minutes += 1) {
    const candidate = new Date(start + minutes * minuteMs);
    const parts = osloDateParts(candidate);
    if (parts.weekday === "Mon" && parts.hour === "03" && parts.minute === "00") {
      return Math.max(60, Math.ceil((candidate.getTime() - start) / 1000));
    }
  }

  return DEFAULT_CACHE_TTL_SECONDS;
}

async function getCachedJson(key) {
  const client = await getRedisClient();
  if (!client) {
    return null;
  }

  const cached = await client.get(key);
  return cached ? JSON.parse(cached) : null;
}

async function setCachedJson(key, value, ttlSeconds = Number(process.env.REDIS_CACHE_TTL_SECONDS || DEFAULT_CACHE_TTL_SECONDS)) {
  const client = await getRedisClient();
  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value), {
    EX: ttlSeconds,
  });
}

function pageBlockStart(page, blockSize = PAGE_BLOCK_SIZE) {
  return Math.floor((page - 1) / blockSize) * blockSize + 1;
}

function pageFromWindow(windowPayload, page, pageSize, items) {
  return {
    ...windowPayload,
    page,
    pageSize,
    bestItem: page === 1 ? windowPayload.bestItem : items[0] || null,
    items,
  };
}

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
