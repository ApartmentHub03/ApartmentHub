import { NextResponse } from 'next/server';
import { checkAdminAuth, errorResponse } from '@/lib/seo/routeAuth';

export async function POST(request) {
    const unauth = checkAdminAuth(request);
    if (unauth) return unauth;

    const dispatchUrl = process.env.MCP_DISPATCH_URL;
    const dispatchToken = process.env.MCP_DISPATCH_TOKEN;

    if (!dispatchUrl || !dispatchToken) {
        return NextResponse.json(
            {
                success: false,
                error: 'Dispatch not configured — set MCP_DISPATCH_URL and MCP_DISPATCH_TOKEN',
            },
            { status: 500 }
        );
    }

    let payload;
    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
    }

    const { suggestion, type, dashboardContext, userPrompt } = payload || {};
    if (!suggestion || !type) {
        return NextResponse.json(
            { success: false, error: 'suggestion and type are required' },
            { status: 400 }
        );
    }

    const trimmedPrompt = typeof userPrompt === 'string' ? userPrompt.trim() : '';

    try {
        const url = `${dispatchUrl.replace(/\/$/, '')}/dispatch/seo-develop`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${dispatchToken}`,
            },
            body: JSON.stringify({
                suggestion,
                type,
                dashboardContext,
                ...(trimmedPrompt ? { userPrompt: trimmedPrompt } : {}),
            }),
        });

        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
            return NextResponse.json(
                {
                    success: false,
                    error: json.error || `Dispatch server responded ${res.status}`,
                },
                { status: 502 }
            );
        }

        return NextResponse.json({ success: true, jobId: json.jobId });
    } catch (err) {
        return errorResponse(err);
    }
}
