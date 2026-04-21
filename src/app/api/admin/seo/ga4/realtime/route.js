import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getRealtimeData } from '@/lib/seo/ga4Client';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const result = await getCachedOrFetch(
            'ga4:realtime',
            () => getRealtimeData(),
            300 // 5-minute TTL — near-realtime but not every request
        );

        return NextResponse.json({
            success: true,
            ...result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
