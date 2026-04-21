import { getSupabaseServer } from '../supabaseServer';

// TTL-based cache manager backed by the `seo_cache` Supabase table.
// Implements stale-while-revalidate: if data is expired but present, return
// it immediately while the caller refreshes in the background.

/**
 * Read a cached entry by key.
 * @param {string} cacheKey
 * @returns {Promise<{data: any, isFresh: boolean, fetchedAt: string} | null>}
 */
export async function getCached(cacheKey) {
    const supabase = getSupabaseServer();
    if (!supabase) return null;

    const { data: row, error } = await supabase
        .from('seo_cache')
        .select('data, fetched_at, ttl_seconds')
        .eq('cache_key', cacheKey)
        .maybeSingle();

    if (error || !row) return null;

    const fetchedAt = new Date(row.fetched_at).getTime();
    const expiresAt = fetchedAt + row.ttl_seconds * 1000;
    const isFresh = Date.now() < expiresAt;

    return { data: row.data, isFresh, fetchedAt: row.fetched_at };
}

/**
 * Write a cached entry.
 * @param {string} cacheKey
 * @param {any} data
 * @param {number} ttlSeconds
 */
export async function setCache(cacheKey, data, ttlSeconds = 3600) {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    const { error } = await supabase
        .from('seo_cache')
        .upsert(
            {
                cache_key: cacheKey,
                data,
                ttl_seconds: ttlSeconds,
                fetched_at: new Date().toISOString(),
            },
            { onConflict: 'cache_key' }
        );

    if (error) {
        console.error('[cacheManager] setCache error:', error.message);
    }
}

/**
 * Delete cache entries matching a pattern (SQL LIKE).
 * @param {string} pattern - e.g. "ga4:%" to invalidate all GA4 cache
 */
export async function invalidateCache(pattern) {
    const supabase = getSupabaseServer();
    if (!supabase) return;

    const { error } = await supabase
        .from('seo_cache')
        .delete()
        .like('cache_key', pattern);

    if (error) {
        console.error('[cacheManager] invalidateCache error:', error.message);
    }
}

/**
 * Get-or-fetch helper: return fresh cache, or call fetcher and cache result.
 * On fetcher error, returns stale data if available (resilience).
 * @param {string} cacheKey
 * @param {() => Promise<any>} fetcher
 * @param {number} ttlSeconds
 */
export async function getCachedOrFetch(cacheKey, fetcher, ttlSeconds = 3600) {
    const cached = await getCached(cacheKey);

    if (cached && cached.isFresh) {
        return { data: cached.data, source: 'cache-fresh', fetchedAt: cached.fetchedAt };
    }

    try {
        const fresh = await fetcher();
        await setCache(cacheKey, fresh, ttlSeconds);
        return { data: fresh, source: 'api', fetchedAt: new Date().toISOString() };
    } catch (err) {
        console.error(`[cacheManager] fetcher failed for ${cacheKey}:`, err.message);
        // Return stale data if we have it, otherwise re-throw
        if (cached) {
            return { data: cached.data, source: 'cache-stale', fetchedAt: cached.fetchedAt };
        }
        throw err;
    }
}
