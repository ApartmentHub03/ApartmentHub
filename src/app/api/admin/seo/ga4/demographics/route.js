import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getDemographics } from '@/lib/seo/ga4Client';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const result = await getCachedOrFetch(
            'ga4:demographics',
            () => getDemographics(),
            21600 // 6hr — demographics change slowly
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
