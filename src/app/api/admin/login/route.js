import { NextResponse } from 'next/server';
import { anonClient, serviceClient } from '@/services/crmAuth';

// CRM team login — Supabase Auth (email + password), restricted to active
// members of crm_users. Replaces the previous shared username/password.
// Separate from the client WhatsApp/OTP flow.

export async function POST(request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 });
    }

    const { email, password } = body || {};
    if (!email || !password) {
        return NextResponse.json({ success: false, message: 'Email and password are required' }, { status: 400 });
    }

    // 1. Authenticate against Supabase Auth.
    const { data: auth, error: authErr } = await anonClient().auth.signInWithPassword({ email, password });
    if (authErr || !auth?.session) {
        return NextResponse.json({ success: false, message: 'Invalid email or password' }, { status: 401 });
    }

    // 2. Confirm the user is an active team member and load their role/permissions.
    const { data: crm, error: crmErr } = await serviceClient()
        .from('crm_users')
        .select('name, role, permissions, city, is_active')
        .eq('auth_user_id', auth.user.id)
        .eq('is_active', true)
        .maybeSingle();

    if (crmErr) {
        return NextResponse.json({ success: false, message: crmErr.message }, { status: 500 });
    }
    if (!crm) {
        return NextResponse.json(
            { success: false, message: 'This account is not a CRM team member.' },
            { status: 403 }
        );
    }

    return NextResponse.json({
        success: true,
        token: auth.session.access_token,
        refreshToken: auth.session.refresh_token,
        name: crm.name,
        role: crm.role,
        permissions: crm.permissions,
        city: crm.city,
    });
}
