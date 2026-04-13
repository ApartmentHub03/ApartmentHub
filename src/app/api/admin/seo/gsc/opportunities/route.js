import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getOpportunities } from '@/lib/seo/gscClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// The "money" endpoint — returns high-impression, low-CTR pages.
// This is the core of the self-improvement loop.
export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const minImpressions = Number(searchParams.get('minImpressions') || 100);
        const maxCtr = Number(searchParams.get('maxCtr') || 0.02);
        const days = Number(searchParams.get('days') || 30);
        const limit = Number(searchParams.get('limit') || 20);

        const cacheKey = `gsc:opportunities:${minImpressions}:${maxCtr}:${days}:${limit}`;

        const result = await getCachedOrFetch(
            cacheKey,
            () => getOpportunities({ minImpressions, maxCtr, days, limit }),
            21600 // 6hr
        );

        return NextResponse.json({
            success: true,
            opportunities: result.data,
            thresholds: { minImpressions, maxCtr, days, limit },
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
