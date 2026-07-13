import { NextResponse } from 'next/server';
import { anonClient, serviceClient } from '@/services/crmAuth';

// Exchanges a refresh token for a fresh access token.
//
// Supabase access tokens expire after an hour. Without this the CRM threw
// everyone back to the login screen mid-shift — losing whatever form or drawer
// they had open — even though the refresh token was sitting unused in storage.

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }

    const refreshToken = body?.refreshToken;
    if (!refreshToken) {
        return NextResponse.json({ success: false, message: 'Missing refresh token' }, { status: 400 });
    }

    const { data, error } = await anonClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data?.session) {
        return NextResponse.json({ success: false, message: 'Session expired' }, { status: 401 });
    }

    // Re-check membership on every refresh: a member deactivated mid-session
    // must not be able to extend their access by refreshing.
    const { data: crm, error: crmErr } = await serviceClient()
        .from('crm_users')
        .select('name, role, permissions, city')
        .eq('auth_user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

    if (crmErr) {
        console.error('[crm/refresh]', crmErr);
        return NextResponse.json({ success: false, message: 'Request failed' }, { status: 500 });
    }
    if (!crm) {
        return NextResponse.json({ success: false, message: 'This account is no longer active.' }, { status: 403 });
    }

    return NextResponse.json({
        success: true,
        token: data.session.access_token,
        refreshToken: data.session.refresh_token,
        name: crm.name,
        role: crm.role,
        permissions: crm.permissions,
        city: crm.city,
    });
}
