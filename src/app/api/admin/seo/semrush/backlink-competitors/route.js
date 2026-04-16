import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getBacklinkCompetitors } from '@/lib/seo/semrushClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain') || 'apartmenthub.nl';
        const limit = Number(searchParams.get('limit') || 10);

        const result = await getCachedOrFetch(
            `semrush:backlink_competitors:${domain}:${limit}`,
            () => getBacklinkCompetitors(domain, limit),
            86400
        );

        return NextResponse.json({
            success: true,
            competitors: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
