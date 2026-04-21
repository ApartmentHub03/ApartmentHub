import { NextResponse } from 'next/server';
import { invalidateCache } from '@/lib/seo/cacheManager';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// Force cache invalidation. Accepts a `pattern` query param (SQL LIKE).
// Examples:
//   POST /api/admin/seo/cache/refresh            -> invalidate ALL
//   POST /api/admin/seo/cache/refresh?pattern=ga4:%   -> invalidate GA4
//   POST /api/admin/seo/cache/refresh?pattern=semrush:%  -> invalidate Semrush

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const pattern = searchParams.get('pattern') || '%';
        await invalidateCache(pattern);
        return NextResponse.json({
            success: true,
            message: `Cache invalidated for pattern: ${pattern}`,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
