import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getDomainOverview } from '@/lib/seo/semrushClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain') || 'apartmenthub.nl';
        const database = searchParams.get('database') || 'nl';

        const result = await getCachedOrFetch(
            `semrush:domain_overview:${domain}:${database}`,
            () => getDomainOverview(domain, database),
            86400 // 24hr — Semrush updates daily
        );

        return NextResponse.json({
            success: true,
            overview: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
