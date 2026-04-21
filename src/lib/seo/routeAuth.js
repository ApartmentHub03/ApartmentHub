import { NextResponse } from 'next/server';

// Simple bearer token presence check for admin SEO routes.
// Matches the existing admin pattern (token-based sessionStorage) where
// validation is lightweight — tokens are generated at login and just
// required to be present.
// Future: validate against a server-side token store.

export function checkAdminAuth(request) {
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
        return NextResponse.json(
            { success: false, message: 'Unauthorized — missing admin token' },
            { status: 401 }
        );
    }
    return null;
}

export function errorResponse(err, status = 500) {
    const message = err?.message || 'Internal server error';
    console.error('[SEO API]', message);
    return NextResponse.json({ success: false, error: message }, { status });
}
