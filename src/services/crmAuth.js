import { createClient } from '@supabase/supabase-js';

// Server-side helpers for CRM team authentication (Supabase Auth + crm_users).
// Kept fully separate from the client WhatsApp/OTP flow.

const URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;

// Service-role client — bypasses RLS, used for membership lookups + admin ops.
export function serviceClient() {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!URL || !key) throw new Error('Supabase service-role credentials not configured');
    return createClient(URL, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

// Anon client — used for password sign-in (issues a normal user session).
export function anonClient() {
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!URL || !key) throw new Error('Supabase anon credentials not configured');
    return createClient(URL, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

// Validate the Bearer access token on a request and resolve the active team
// member behind it. Returns { error } or { user, crm }.
export async function getCrmUserFromRequest(request) {
    const header = request.headers.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return { error: 'Missing access token', status: 401 };

    const supabase = serviceClient();
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return { error: 'Invalid or expired session', status: 401 };

    const { data: crm, error: crmErr } = await supabase
        .from('crm_users')
        .select('id, name, email, role, permissions, is_active, city')
        .eq('auth_user_id', userData.user.id)
        .eq('is_active', true)
        .maybeSingle();

    if (crmErr) return { error: crmErr.message, status: 500 };
    if (!crm) return { error: 'Not an active team member', status: 403 };

    return { user: userData.user, crm };
}

// Guard requiring any active team member. Returns { crm } or { response }.
export async function requireCrmUser(request) {
    const result = await getCrmUserFromRequest(request);
    if (result.error) {
        return { response: { body: { success: false, message: result.error }, status: result.status } };
    }
    return { crm: result.crm };
}

// Guard requiring admin / super_admin.
export async function requireAdmin(request) {
    const result = await getCrmUserFromRequest(request);
    if (result.error) {
        return { response: { body: { success: false, message: result.error }, status: result.status } };
    }
    if (!['admin', 'super_admin'].includes(result.crm.role)) {
        return { response: { body: { success: false, message: 'Admin access required' }, status: 403 } };
    }
    return { crm: result.crm };
}
