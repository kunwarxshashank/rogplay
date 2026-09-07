/**
 * Lightweight in-memory async cache with TTL + in-flight request de-duplication.
 *
 * - Repeated calls with the same key within the TTL return the cached value.
 * - Concurrent calls for the same key share a single in-flight promise, so we
 *   never fire the same network request twice at the same time (a common cause
 *   of redundant loads when several list sections mount together).
 */

interface CacheEntry<T> {
    expires: number;
    data: T;
}

const DEFAULT_TTL = 1000 * 60 * 30; // 30 minutes
const MAX_ENTRIES = 300; // cap memory growth over long sessions

const store = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

function evictIfNeeded() {
    if (store.size <= MAX_ENTRIES) return;
    // Drop the oldest ~10% of entries (insertion order preserved by Map).
    const toDrop = Math.ceil(MAX_ENTRIES * 0.1);
    let i = 0;
    for (const key of store.keys()) {
        store.delete(key);
        if (++i >= toDrop) break;
    }
}

/**
 * Returns a cached value for `key`, or runs `fetcher()` (deduping concurrent
 * callers) and caches the result. On fetch error nothing is cached.
 */
export async function cachedFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = DEFAULT_TTL
): Promise<T> {
    const now = Date.now();

    const entry = store.get(key);
    if (entry && entry.expires > now) {
        return entry.data as T;
    }

    const pending = inflight.get(key);
    if (pending) return pending as Promise<T>;

    const promise = (async () => {
        try {
            const data = await fetcher();
            store.set(key, { data, expires: Date.now() + ttl });
            evictIfNeeded();
            return data;
        } finally {
            inflight.delete(key);
        }
    })();

    inflight.set(key, promise);
    return promise;
}

/** Remove a single cache entry (e.g. to force refresh). */
export function invalidate(key: string) {
    store.delete(key);
}

/** Clear the entire cache. */
export function clearAsyncCache() {
    store.clear();
    inflight.clear();
}
