import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin } from '@/services/crmAuth';
import { isUuid, failed } from '@/services/crmHttp';

// Team-management API for the CRM (point 6 · admin).
// Uses the service-role key to create Supabase Auth users and crm_users rows.
// Admin-only throughout: the roster carries every colleague's email, phone and
// role, and these endpoints mint and revoke CRM access.

const ROLES = ['super_admin', 'admin', 'agent'];

// GET — list team members.
export async function GET(request) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const supabase = serviceClient();
        const { data, error } = await supabase
            .from('crm_users')
            .select('id, name, email, phone, role, permissions, city, start_date, is_active, created_at')
            .order('created_at', { ascending: true });
        if (error) throw error;
        return NextResponse.json({ success: true, members: data || [] });
    } catch (err) {
        return failed('crm/team GET', err, 'Failed to load the team');
    }
}

// POST — add an employee: create the Auth user, then the crm_users row.
// Returns a one-time temporary password the admin shares with the new member.
export async function POST(request) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const body = await request.json();
        const { name, email, phone, role = 'agent', permissions, city, start_date } = body || {};

        if (!name || !email) {
            return NextResponse.json({ success: false, message: 'Name and email are required' }, { status: 400 });
        }
        if (!ROLES.includes(role)) {
            return NextResponse.json({ success: false, message: `Invalid role: ${role}` }, { status: 400 });
        }

        const supabase = serviceClient();

        // Temporary password — the admin shares it and the member resets it.
        // Must come from a CSPRNG: Math.random() is predictable from a handful
        // of prior outputs, and this password unlocks the whole CRM.
        const tempPassword = `Ah-${randomBytes(12).toString('base64url')}`;

        const { data: created, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { name, crm: true },
        });
        if (authErr) {
            // Deliberately vague: the raw error distinguishes "already registered"
            // from other failures, which turns this into a user-enumeration oracle.
            console.error('[crm/team POST] createUser', authErr);
            return NextResponse.json(
                { success: false, message: 'Could not create this user. The email may already be in use.' },
                { status: 400 }
            );
        }

        const { data: row, error: rowErr } = await supabase
            .from('crm_users')
            .insert({
                auth_user_id: created.user.id,
                name,
                email,
                phone: phone || null,
                role,
                permissions: permissions || undefined, // fall back to table default
                city: city || null,
                start_date: start_date || null,
            })
            .select()
            .single();

        if (rowErr) {
            // Roll back the auth user so we don't leave an orphan.
            await supabase.auth.admin.deleteUser(created.user.id).catch(() => {});
            return failed('crm/team POST', rowErr, 'Could not add this team member.', 400);
        }

        return NextResponse.json({ success: true, member: row, tempPassword });
    } catch (err) {
        return failed('crm/team POST', err, 'Could not add this team member.');
    }
}

// PATCH — edit a member, or deactivate them on offboarding. Deactivating is the
// revoke path: requireCrmUser reads is_active on every request, so it takes
// effect immediately.
export async function PATCH(request) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const body = await request.json();
        const { id, name, phone, role, permissions, city, is_active } = body || {};

        if (!isUuid(id)) {
            return NextResponse.json({ success: false, message: 'A valid member id is required' }, { status: 400 });
        }
        if (role != null && !ROLES.includes(role)) {
            return NextResponse.json({ success: false, message: `Invalid role: ${role}` }, { status: 400 });
        }
        // Don't let an admin lock themselves out and leave the CRM unmanageable.
        if (id === auth.crm.id && (is_active === false || (role != null && role === 'agent'))) {
            return NextResponse.json(
                { success: false, message: 'You cannot remove your own admin access.' },
                { status: 400 }
            );
        }

        const update = {};
        if (name != null) update.name = name;
        if (phone !== undefined) update.phone = phone || null;
        if (role != null) update.role = role;
        if (permissions != null) update.permissions = permissions;
        if (city !== undefined) update.city = city || null;
        if (is_active != null) update.is_active = Boolean(is_active);

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
        }

        const { data, error } = await serviceClient()
            .from('crm_users')
            .update(update)
            .eq('id', id)
            .select('id, name, email, phone, role, permissions, city, start_date, is_active, created_at')
            .single();
        if (error) throw error;

        return NextResponse.json({ success: true, member: data });
    } catch (err) {
        return failed('crm/team PATCH', err, 'Could not update this team member.');
    }
}
