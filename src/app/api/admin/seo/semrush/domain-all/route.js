import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getDomainOverviewAllDatabases } from '@/lib/seo/semrushClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain') || 'apartmenthub.nl';

        const result = await getCachedOrFetch(
            `semrush:domain_all:${domain}`,
            () => getDomainOverviewAllDatabases(domain),
            86400
        );

        return NextResponse.json({
            success: true,
            databases: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
