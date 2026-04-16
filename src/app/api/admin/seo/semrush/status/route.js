import { NextResponse } from 'next/server';
import { getApiUnitsRemaining } from '@/lib/seo/semrushClient';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

// Live API units remaining — no caching, cheap endpoint.
export async function GET(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    try {
        const status = await getApiUnitsRemaining();
        return NextResponse.json({
            success: true,
            baseEndpoint: 'https://api.semrush.com/',
            ...status,
        });
    } catch (err) {
        return errorResponse(err);
    }
}
