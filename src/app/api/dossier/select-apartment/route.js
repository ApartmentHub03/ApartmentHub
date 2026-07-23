import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Persist a tenant's selected apartment(s) to accounts.apartment_selected,
// server-side via the service role (no RLS).
//
// Replaces the browser-side `sb.from('accounts').update({ apartment_selected })`
// that AppartementenSelectie.jsx ran on Continue. That browser write was
// silently failing under RLS: supabase-js returns `{ error }` on permission
// denial without throwing, and the caller's outer try/catch only catches
// thrown exceptions — so the user saw a green "selected" highlight on the
// picker, got navigated back to /aanvraag, and the old apartment (or none)
// was rehydrated because the write never landed. This affected returning
// tenants especially, since AuthContext.accountId is often null/stale for
// freshly-provisioned accounts (Login.jsx's RLS-gated lookup fails), and the
// stale id targeted the wrong row (or wrote to localStorage pending and was
// stranded there when accountId never resolved).
//
// This route uses the service role and resolves the account server-side by
// phone when accountId is missing (mirroring /api/dossier/save and
// /api/dossier/link-offers), so the selection always lands on the right row.
// It fully replaces apartment_selected (matching prior behavior: picking on
// /appartementen replaces the previous selection).
//
// The client writes the resolved accountId back to localStorage so the rest
// of the session (autoSave on /aanvraag, link-offers on submit) uses the
// correct id.

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
    // Verify the browser-supplied accountId actually exists before trusting it.
    // Login.jsx's RLS-gated lookup can return a stale or wrong id (e.g. an
    // account row that was since deleted/replaced), and PostgREST silently
    // no-ops an UPDATE that matches 0 rows (returns 200, { error: null }),
    // so the selection would appear to save but never land. Verify, and fall
    // back to a phone-based lookup if the id is bogus.
    if (accountId) {
        const { data, error } = await supabase
            .from('accounts')
            .select('id')
            .eq('id', accountId)
            .maybeSingle();
        if (error) throw error;
        if (data?.id) return data.id;
    }
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
        const { accountId, phone, apartments = [] } = body || {};
        if (!accountId && !phone) {
            return NextResponse.json({ success: false, message: 'accountId or phone is required' }, { status: 400 });
        }
        if (!Array.isArray(apartments) || apartments.length === 0) {
            return NextResponse.json({ success: false, message: 'apartments array is required' }, { status: 400 });
        }

        const supabase = admin();

        // Resolve the account server-side if the browser didn't send an accountId
        // (common for fresh sessions where Login.jsx's RLS-gated lookup failed).
        const resolvedAccountId = await resolveAccountId(supabase, accountId, phone);
        if (!resolvedAccountId) {
            // Fresh user: no accounts row yet (OTP login doesn't create one —
            // /api/dossier/save creates it on form submit, with a real tenant_name
            // which has a NOT NULL constraint). We can't provision here without
            // a name, so return a sentinel the client recognizes: it stashes the
            // selection to localStorage and /api/dossier/save picks it up later
            // (after it provisions the account).
            return NextResponse.json({
                success: false,
                code: 'no_account',
                message: 'no accounts row yet — selection should be stashed client-side and flushed by /api/dossier/save',
            }, { status: 404 });
        }

        // Normalize the entries. Keep only fields we own; drop any client-only
        // extras so we don't write stray keys into the jsonb column.
        const normalized = apartments
            .filter(a => a && a.apartment_id)
            .map(a => ({
                apartment_id: a.apartment_id,
                address: a.address || '',
                rental_price: a.rental_price ?? null,
                selected_at: a.selected_at || new Date().toISOString(),
            }));

        if (normalized.length === 0) {
            return NextResponse.json({ success: false, message: 'no valid apartment entries (missing apartment_id)' }, { status: 400 });
        }

        const { error: upErr } = await supabase
            .from('accounts')
            .update({ apartment_selected: normalized })
            .eq('id', resolvedAccountId);
        if (upErr) {
            return NextResponse.json({ success: false, message: upErr.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, accountId: resolvedAccountId });
    } catch (err) {
        console.error('[select-apartment POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

// GET — return the caller's accounts row (apartment_selected + offered_apartments)
// using the service role (no RLS). The browser Supabase client is publishable-key
// / RLS-gated and this app uses a custom OTP auth (not Supabase Auth), so a direct
// browser read of `accounts` silently returns no rows even for an authenticated
// tenant, leaving apartment_selected empty on /aanvraag. This route mirrors the
// POST's account resolution (id first, phone fallback) and returns the data the
// Aanvraag loadData effect needs: the selected apartment entries plus the
// offered_apartments ids (for the "My Applications" card) and, for convenience,
// each offered apartment's offers_in entry for this account.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const accountId = searchParams.get('accountId');
        const phone = searchParams.get('phone');
        if (!accountId && !phone) {
            return NextResponse.json({ success: false, message: 'accountId or phone is required' }, { status: 400 });
        }

        const supabase = admin();
        const resolvedAccountId = await resolveAccountId(supabase, accountId, phone);
        if (!resolvedAccountId) {
            // No account yet (fresh user, form not submitted). Return a sentinel
            // so the client knows to fall back to the localStorage stash instead
            // of treating this as a hard error.
            return NextResponse.json({
                success: false,
                code: 'no_account',
                message: 'no accounts row yet',
            }, { status: 404 });
        }

        const { data: acc, error: accErr } = await supabase
            .from('accounts')
            .select('apartment_selected, offered_apartments, documentation_status')
            .eq('id', resolvedAccountId)
            .maybeSingle();
        if (accErr) {
            return NextResponse.json({ success: false, message: accErr.message }, { status: 500 });
        }

        const apartmentSelected = Array.isArray(acc?.apartment_selected) ? acc.apartment_selected : [];
        const offeredIds = Array.isArray(acc?.offered_apartments) ? acc.offered_apartments : [];

        // Resolve offer details (bid, status, submitted_at) for each offered
        // apartment so the client can render the "My Applications" card without
        // a second round-trip.
        let offeredApartments = [];
        if (offeredIds.length > 0) {
            const { data: aptRows } = await supabase
                .from('apartments')
                .select('id, "Full Address", street, area, rental_price, offers_in')
                .in('id', offeredIds);
            offeredApartments = (Array.isArray(aptRows) ? aptRows : [])
                .map(row => {
                    const offersIn = Array.isArray(row.offers_in) ? row.offers_in : [];
                    const myOffer = offersIn.find(o => o?.account_id === resolvedAccountId) || null;
                    const address = row["Full Address"]
                        || [row.street, row.area].filter(Boolean).join(', ')
                        || '';
                    return {
                        apartmentId: row.id,
                        address,
                        rentalPrice: row.rental_price || null,
                        bidAmount: myOffer?.bid_amount ?? null,
                        status: myOffer?.status || 'Pending',
                        submittedAt: myOffer?.submitted_at || null,
                    };
                })
                .filter(c => c.apartmentId);
        }

        return NextResponse.json({
            success: true,
            accountId: resolvedAccountId,
            apartment_selected: apartmentSelected,
            documentation_status: acc?.documentation_status || null,
            offered_apartments: offeredApartments,
        });
    } catch (err) {
        console.error('[select-apartment GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}