import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser, requireAdmin } from '@/services/crmAuth';

// Team-management API for the CRM (point 6 · admin).
// Uses the service-role key to create Supabase Auth users and crm_users rows.
// GET is open to any active team member; POST (add employee) is admin-only,
// enforced server-side by validating the caller's Supabase access token.

const ROLES = ['super_admin', 'admin', 'agent'];

// GET — list team members (any active team member).
export async function GET(request) {
    const auth = await requireCrmUser(request);
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
        console.error('[crm/team GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
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

        // Temporary password — admin shares it; the member can reset later.
        const tempPassword = `Ah-${Math.random().toString(36).slice(2, 10)}${Math.floor(1000 + Math.random() * 9000)}`;

        const { data: created, error: authErr } = await supabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { name, crm: true },
        });
        if (authErr) {
            return NextResponse.json({ success: false, message: `Auth: ${authErr.message}` }, { status: 400 });
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
            return NextResponse.json({ success: false, message: rowErr.message }, { status: 400 });
        }

        return NextResponse.json({ success: true, member: row, tempPassword });
    } catch (err) {
        console.error('[crm/team POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
