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

    if (crmErr) {
        console.error('[crmAuth] crm_users lookup', crmErr);
        return { error: 'Request failed', status: 500 };
    }
    // 401, not 403: a deactivated member has a dead session, which is what the
    // client's sign-out-and-retry path keys on. 403 is reserved for "you are
    // signed in, but this action is not yours" — which must NOT sign you out.
    if (!crm) return { error: 'This account is no longer active.', status: 401 };

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
    if (!isAdminRole(result.crm.role)) {
        return { response: { body: { success: false, message: 'Admin access required' }, status: 403 } };
    }
    return { crm: result.crm };
}

export function isAdminRole(role) {
    return ['admin', 'super_admin'].includes(role);
}

// Guard requiring an active team member who holds a specific permission.
//
// `permissions` is the jsonb the admin sets when adding an employee
// (apartments / candidates / offers / team). A key that is explicitly false
// denies access; a key that is absent allows it, so members created before
// permissions were enforced keep working. Admins bypass the check.
export async function requirePermission(request, key) {
    const result = await getCrmUserFromRequest(request);
    if (result.error) {
        return { response: { body: { success: false, message: result.error }, status: result.status } };
    }

    const { role, permissions } = result.crm;
    if (!isAdminRole(role) && permissions && permissions[key] === false) {
        return {
            response: {
                body: { success: false, message: `You do not have access to ${key}.` },
                status: 403,
            },
        };
    }

    return { crm: result.crm };
}
