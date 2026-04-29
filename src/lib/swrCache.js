// Stale-while-revalidate cache helper.
// Returns cached value immediately (0ms), then runs the fetcher in background
// and notifies via callback when fresh data arrives.

const PREFIX = 'swr:';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export function readCache(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    return { value: v, timestamp: t };
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify({ v: value, t: Date.now() }));
  } catch { /* storage full or blocked */ }
}

export function clearCache(key) {
  try { localStorage.removeItem(PREFIX + key); } catch { /* noop */ }
}

/**
 * SWR pattern: returns cached value sync, refreshes async.
 * @param {string} key - unique cache key
 * @param {() => Promise<T>} fetcher - async function returning fresh data
 * @param {(value: T) => void} onFresh - called when fresh data arrives
 * @param {number} ttl - max age before forcing refetch (ms)
 * @returns {T | null} cached value (synchronous)
 */
export function swr(key, fetcher, onFresh, ttl = DEFAULT_TTL) {
  const cached = readCache(key);
  const isStale = !cached || (Date.now() - cached.timestamp) > ttl;

  // Always refetch in background (stale-while-revalidate)
  fetcher()
    .then((fresh) => {
      if (fresh !== undefined && fresh !== null) {
        writeCache(key, fresh);
        onFresh(fresh);
      }
    })
    .catch((e) => console.warn('[swr]', key, e));

  return cached && !isStale ? cached.value : (cached?.value ?? null);
}
