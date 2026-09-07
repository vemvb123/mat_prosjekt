import { createClient } from "redis";

const DEFAULT_CACHE_TTL_SECONDS = 60 * 60;

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

export { buildCacheKey, withJsonCache };
