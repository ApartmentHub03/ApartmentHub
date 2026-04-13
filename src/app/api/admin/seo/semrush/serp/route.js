import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getSerpResults } from '@/lib/seo/semrushClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('query');
        const database = searchParams.get('database') || 'nl';
        const limit = Number(searchParams.get('limit')) || 10;

        if (!query) {
            return NextResponse.json(
                { success: false, error: 'Missing query parameter' },
                { status: 400 }
            );
        }

        const result = await getCachedOrFetch(
            `semrush:serp:${database}:${query}:${limit}`,
            () => getSerpResults(query, database, limit),
            86400
        );

        return NextResponse.json({
            success: true,
            results: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
