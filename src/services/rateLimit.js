// Fixed-window in-memory rate limiter for public API routes.
//
// Per-instance only: a serverless deployment running N instances allows up to
// N x limit. That is fine for the abuse it exists to stop (one caller hammering
// an endpoint); if we ever need exact global limits, back it with Redis/KV.

const buckets = new Map();

// Bounds the map so a flood of distinct keys can't grow it without limit.
const MAX_KEYS = 10_000;

export function rateLimit(key, { limit, windowMs }) {
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
        if (buckets.size >= MAX_KEYS) {
            for (const [k, v] of buckets) {
                if (now >= v.resetAt) buckets.delete(k);
            }
            if (buckets.size >= MAX_KEYS) buckets.clear();
        }
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
    }

    if (bucket.count >= limit) {
        return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }

    bucket.count += 1;
    return { allowed: true, retryAfterSeconds: 0 };
}

// Best-effort client IP. Vercel sets x-forwarded-for; the left-most entry is the
// client. Falls back to a shared key so a missing header fails closed (shared
// budget) rather than open (unlimited per-request budget).
export function clientIp(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}
