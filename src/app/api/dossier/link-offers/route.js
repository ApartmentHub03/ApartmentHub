import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Link a tenant's submitted offers to the selected apartments, server-side.
//
// Replaces the browser-side `sb.from('apartments').update({ offers_in })` loop
// that Aanvraag.jsx used to run after /api/dossier/save. That browser-side
// write was silently failing under RLS: supabase-js returns `{ error }` on
// permission denial without throwing, and the form's outer try/catch only
// catches thrown exceptions — so the offer never landed on the apartment row
// and the user saw a "successful" submit with no offer in the CRM.
//
// This route uses the service role (no RLS), mirrors /api/dossier/save, and
// updates BOTH the per-apartment `offers_in` JSONB AND the account's own
// `offered_apartments` array. Each apartment's `offers_in` is upserted by
// `account_id` so a re-submit replaces the prior offer instead of duplicating.
//
// Account resolution mirrors /api/dossier/save: the browser's `accountId`
// (from Login.jsx's RLS-gated lookup) is often null for freshly-provisioned
// accounts, so we accept `phone` as a fallback and resolve server-side. The
// caller passes both when available; we prefer the explicit accountId and
// fall back to a phone-based lookup otherwise.
//
// Non-blocking on the form side: a failure here is logged and surfaced in the
// response, but Aanvraag.jsx still redirects to the LOI page so the user
// isn't stuck. The CRM visibility depends on this route succeeding.

function admin() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase service-role credentials not configured');
    return createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}

// Same normalization / candidate set as services/crmApplications.js:phoneCandidates,
// inlined here so this route doesn't pull a client-only module into a server route.
function phoneCandidates(phone) {
    const raw = String(phone || '');
    const digits = String(phone || '').replace(/\D/g, '');
    if (!digits) return [];
    return [...new Set([raw, `+${digits}`, digits, raw.replace(/\s+/g, '')])].filter(Boolean);
}

async function resolveAccountId(supabase, accountId, phone) {
    if (accountId) return accountId;
    if (!phone) return null;
    const candidates = phoneCandidates(phone);
    if (candidates.length === 0) return null;
    const { data, error } = await supabase
        .from('accounts')
        .select('id')
        .in('whatsapp_number', candidates)
        .order('created_at', { ascending: false })
        .limit(1);
    if (error) throw error;
    return data?.[0]?.id || null;
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { accountId, phone, offers = [] } = body || {};
        if (!accountId && !phone) {
            return NextResponse.json({ success: false, message: 'accountId or phone is required' }, { status: 400 });
        }
        if (!Array.isArray(offers) || offers.length === 0) {
            return NextResponse.json({ success: true, updated: [], skipped: 'no offers provided' });
        }

        const supabase = admin();

        // Resolve the account server-side if the browser didn't send an accountId
        // (common for fresh sessions where Login.jsx's RLS-gated lookup failed).
        const resolvedAccountId = await resolveAccountId(supabase, accountId, phone);
        if (!resolvedAccountId) {
            return NextResponse.json({
                success: false,
                message: 'could not resolve account — no accountId and no accounts row matches phone',
            }, { status: 400 });
        }

        const updated = [];
        const errors = [];

        // 1. Upsert each offer into the apartment's `offers_in` JSONB array,
        //    keyed by account_id (re-submit replaces, doesn't duplicate).
        for (const o of offers) {
            const aptId = o.apartmentId;
            if (!aptId) { errors.push({ apartmentId: null, message: 'missing apartmentId' }); continue; }

            const { data: apt, error: aptErr } = await supabase
                .from('apartments')
                .select('offers_in')
                .eq('id', aptId)
                .maybeSingle();
            if (aptErr || !apt) {
                errors.push({ apartmentId: aptId, message: aptErr?.message || 'apartment not found' });
                continue;
            }

            const offersIn = Array.isArray(apt.offers_in) ? apt.offers_in : [];
            const offerObj = {
                account_id: resolvedAccountId,
                tenant_name: o.tenantName || '',
                bid_amount: Number(o.bidAmount) || 0,
                start_date: o.startDate || null,
                motivation: o.motivation || null,
                status: 'Pending',
                submitted_at: new Date().toISOString(),
            };

            const existingIdx = offersIn.findIndex((e) => e?.account_id === resolvedAccountId);
            if (existingIdx >= 0) {
                offersIn[existingIdx] = offerObj;
            } else {
                offersIn.push(offerObj);
            }

            const { error: upErr } = await supabase
                .from('apartments')
                .update({ offers_in: offersIn })
                .eq('id', aptId);
            if (upErr) {
                errors.push({ apartmentId: aptId, message: upErr.message });
            } else {
                updated.push(aptId);
            }
        }

        // 2. Mirror the apartment ids onto accounts.offered_apartments so the
        //    account's own "I applied to these" list stays current. Idempotent —
        //    only pushes ids not already present.
        const { data: acc, error: accErr } = await supabase
            .from('accounts')
            .select('offered_apartments')
            .eq('id', resolvedAccountId)
            .maybeSingle();
        if (accErr || !acc) {
            // Non-fatal: the apartments update is the critical one for CRM
            // visibility. Log and continue.
            console.warn('[link-offers] could not load accounts.offered_apartments:', accErr?.message);
        } else {
            const existing = Array.isArray(acc.offered_apartments) ? acc.offered_apartments : [];
            const merged = [...existing];
            for (const aptId of updated) {
                if (!merged.includes(aptId)) merged.push(aptId);
            }
            // Only write if the array actually changed.
            if (merged.length !== existing.length) {
                const { error: accUpErr } = await supabase
                    .from('accounts')
                    .update({ offered_apartments: merged })
                    .eq('id', resolvedAccountId);
                if (accUpErr) {
                    console.warn('[link-offers] could not update accounts.offered_apartments:', accUpErr.message);
                }
            }
        }

        if (errors.length > 0) {
            return NextResponse.json({
                success: updated.length > 0,
                updated,
                errors,
                accountId: resolvedAccountId,
                message: `${updated.length} ok, ${errors.length} failed`,
            }, { status: updated.length > 0 ? 200 : 500 });
        }

        return NextResponse.json({ success: true, updated, accountId: resolvedAccountId });
    } catch (err) {
        console.error('[link-offers POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}