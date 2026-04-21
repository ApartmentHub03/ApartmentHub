import { NextResponse } from 'next/server';
import { getCachedOrFetch } from '@/lib/seo/cacheManager';
import { getTopPosts } from '@/lib/seo/metaClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const { searchParams } = new URL(request.url);
        const limit = Number(searchParams.get('limit')) || 10;

        const result = await getCachedOrFetch(
            `meta:top_posts:${limit}`,
            () => getTopPosts(limit),
            21600
        );

        return NextResponse.json({
            success: true,
            topPosts: result.data,
            source: result.source,
            fetchedAt: result.fetchedAt,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
