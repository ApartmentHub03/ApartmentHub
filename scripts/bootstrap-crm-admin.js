// One-shot: bootstrap the first CRM super_admin so the Team UI can take over.
// Run: node scripts/bootstrap-crm-admin.js
//
// Creates (or reuses) the Supabase Auth user for david@apartmenthub.nl, then
// upserts the crm_users row. Idempotent — safe to re-run. Requires
// NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const EMAIL = process.env.BOOTSTRAP_EMAIL || 'david@apartmenthub.nl';
const PASSWORD = process.env.BOOTSTRAP_PASSWORD || 'davidvanwachem';
const NAME = process.env.BOOTSTRAP_NAME || 'David van Wachem';
const PHONE = process.env.BOOTSTRAP_PHONE || '+31683221189';

if (!URL || !KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
}

const sb = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

async function main() {
    // 1. Find an existing auth user by email, or create one.
    const { data: list, error: listErr } = await sb.auth.admin.listUsers();
    if (listErr) throw listErr;
    let user = list.users.find((u) => u.email.toLowerCase() === EMAIL.toLowerCase());

    if (user) {
        // Ensure the password matches what we want + email is confirmed.
        const { error: updErr } = await sb.auth.admin.updateUserById(user.id, {
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { ...(user.user_metadata || {}), name: NAME, crm: true },
        });
        if (updErr) throw updErr;
        console.log(`[bootstrap] reused auth user ${user.id} (${EMAIL})`);
    } else {
        const { data: created, error: createErr } = await sb.auth.admin.createUser({
            email: EMAIL,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { name: NAME, crm: true },
        });
        if (createErr) throw createErr;
        user = created.user;
        console.log(`[bootstrap] created auth user ${user.id} (${EMAIL})`);
    }

    // 2. Upsert the crm_users row as super_admin.
    const { data: row, error: rowErr } = await sb
        .from('crm_users')
        .upsert(
            {
                auth_user_id: user.id,
                name: NAME,
                email: EMAIL,
                phone: PHONE,
                role: 'super_admin',
                permissions: { apartments: true, candidates: true, offers: true, team: true },
                is_active: true,
            },
            { onConflict: 'auth_user_id' }
        )
        .select()
        .single();

    if (rowErr) throw rowErr;
    console.log('[bootstrap] crm_users row ready:');
    console.log(JSON.stringify(row, null, 2));
    console.log('\nDone. Log in at /crm-admin with:');
    console.log(`  email:    ${EMAIL}`);
    console.log(`  password: ${PASSWORD}`);
}

main().catch((err) => {
    console.error('[bootstrap] failed:', err.message || err);
    process.exit(1);
});