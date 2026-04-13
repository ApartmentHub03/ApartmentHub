import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getTopPages } from '@/lib/seo/ga4Client';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get('limit') || 20);

        const result = await getCachedOrFetch(
            `ga4:top_pages:${limit}`,
            () => getTopPages(limit),
            3600
        );

        return NextResponse.json({
            success: true,
            pages: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
