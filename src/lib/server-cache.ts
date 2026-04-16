const MAX_CACHE_ENTRIES = 200;

type CacheEntry = {
  expiresAt: number;
  value: unknown;
};

declare global {
  var __atlasServerCache: Map<string, CacheEntry> | undefined;
  var __atlasServerCacheInFlight: Map<string, Promise<unknown>> | undefined;
}

function getCacheStore() {
  if (!global.__atlasServerCache) {
    global.__atlasServerCache = new Map<string, CacheEntry>();
  }

  return global.__atlasServerCache;
}

function getInFlightStore() {
  if (!global.__atlasServerCacheInFlight) {
    global.__atlasServerCacheInFlight = new Map<string, Promise<unknown>>();
  }

  return global.__atlasServerCacheInFlight;
}

export async function cachedAsync<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const cacheStore = getCacheStore();
  const inFlightStore = getInFlightStore();
  const now = Date.now();
  const cached = cacheStore.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const inFlight = inFlightStore.get(key);

  if (inFlight) {
    return inFlight as Promise<T>;
  }

  const promise = load()
    .then((value) => {
      // Evict expired entries
      const now2 = Date.now();
      for (const [k, v] of cacheStore) {
        if (v.expiresAt < now2) cacheStore.delete(k);
      }
      // If still at capacity, delete oldest entry (Map insertion order)
      if (cacheStore.size >= MAX_CACHE_ENTRIES) {
        const oldest = cacheStore.keys().next().value;
        if (oldest !== undefined) cacheStore.delete(oldest);
      }

      cacheStore.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .finally(() => {
      inFlightStore.delete(key);
    });

  inFlightStore.set(key, promise);
  return promise;
}
