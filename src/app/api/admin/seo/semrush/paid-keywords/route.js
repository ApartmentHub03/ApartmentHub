import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getPaidKeywords } from '@/lib/seo/semrushClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const domain = searchParams.get('domain') || 'apartmenthub.nl';
        const database = searchParams.get('database') || 'nl';
        const limit = Number(searchParams.get('limit') || 50);

        const result = await getCachedOrFetch(
            `semrush:paid_keywords:${domain}:${database}:${limit}`,
            () => getPaidKeywords(domain, database, limit),
            86400
        );

        return NextResponse.json({
            success: true,
            keywords: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
