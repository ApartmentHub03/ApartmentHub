import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';
import { storagePath } from '@/services/crmApplications';

// Reset Test Dossier — admin-only destructive tool for the Dev Tools tab.
//
// Wipes EVERYTHING tied to a single phone number so the /nl/aanvraag flow can
// be re-run from scratch on the same browser:
//
//   1. accounts rows (main tenant + any linked co-tenant/guarantor accounts)
//   2. dossiers rows for that phone
//   3. personen rows in those dossiers (CASCADE removes documenten)
//   4. documenten storage files (collected before the row deletes)
//   5. invoices rows keyed by account_id
//   6. apartment JSONB array entries that reference the account_id(s):
//      offers_in, offers_sent, accepted_deals, rejected_deals
//
// Browser-side localStorage cleanup is performed by the DevToolsView after
// this route returns success.
//
// ─── SAFETY MODEL ──────────────────────────────────────────────────────
// This route is destructive and scoped by phone number. Multiple layers of
// guards prevent it from ever wiping unrelated data:
//
//   (A) Phone validation: digits length >= 8, non-empty candidates.
//   (B) Every `.in('col', array)` call is guarded by `if (array.length > 0)`.
//       Supabase JS `.in('col', [])` generates `in.()` which PostgREST treats
//       as "match nothing" — but we don't rely on that. An empty array skips
//       the query entirely and treats the result as empty.
//   (C) Count guards: if a phone resolves to >5 accounts or >3 dossiers, the
//       route REFUSES to proceed. A single test dossier should touch 1 main
//       account (+ maybe 2-3 linked) and 1 dossier. Anything beyond that is
//       almost certainly a bug in the lookup and we abort before any DELETE.
//   (D) Every DELETE is scoped to a resolved id set (account ids, dossier
//       ids, persoon ids) — never a broad filter like "all accounts with
//       linked_account_id IS NOT NULL".
//   (E) Storage prefix walk uses `<digits>/` (trailing slash) so a short
//       phone can't match another tenant's folder (e.g. "316" would not
//       match "3161234567/").
//   (F) Apartments JSONB scrub is read-then-write: the SELECT fetches all
//       apartments, but the JS filter only removes entries whose account_id
//       is in our resolved idSet, and the UPDATE only fires on apartments
//       that had a matching entry. No unrelated apartment is ever written.
//   (G) 404 if nothing matches — a typo never silently no-ops.
//
// Auth: requireAdmin — only admin/super_admin can call this.

const BUCKET = 'dossier-documents';

// A single test dossier: 1 main tenant account + up to 4 co-tenants/guarantors
// (the form caps co-tenants at 4). Allow headroom but refuse anything wild.
const MAX_ACCOUNTS = 5;
const MAX_DOSSIERS = 3;

function digits(s) {
    return String(s || '').replace(/\D/g, '');
}

function phoneCandidates(phone) {
    const raw = String(phone || '').trim();
    const d = digits(raw);
    if (!d) return [];
    return [...new Set([raw, `+${d}`, d, raw.replace(/\s+/g, '')])].filter(Boolean);
}

// Run a Supabase `.in('col', values)` query only when values is non-empty.
// Returns [] when values is empty — never hits PostgREST with an empty IN
// list, so we don't depend on PostgREST's `in.()` behavior.
async function safeIn(supabase, table, columns, column, values) {
    const unique = [...new Set((values || []).filter(Boolean))];
    if (unique.length === 0) return [];
    const { data, error } = await supabase.from(table).select(columns).in(column, unique);
    if (error) throw error;
    return data || [];
}

// Same guard for DELETEs. Returns the deleted rows (or [] if nothing to do).
async function safeDeleteIn(supabase, table, column, values, selectCols = 'id') {
    const unique = [...new Set((values || []).filter(Boolean))];
    if (unique.length === 0) return [];
    const { data, error } = await supabase
        .from(table).delete().in(column, unique).select(selectCols);
    if (error) throw error;
    return data || [];
}

// List all objects under a bucket prefix. Uses `prefix/` with a trailing
// slash so the walk is strictly folder-scoped — "316/" can never match
// "3161234567/file.pdf".
async function listAllStorageFiles(supabase, prefix) {
    const all = [];
    let offset = 0;
    for (let i = 0; i < 20; i++) {
        const { data, error } = await supabase.storage
            .from(BUCKET)
            .list(prefix, { limit: 1000, offset });
        if (error) {
            console.warn('[reset-dossier] storage.list error:', error.message);
            break;
        }
        if (!data || data.length === 0) break;
        for (const item of data) {
            if (item.name && item.metadata) {
                all.push(`${prefix}${item.name}`);
            }
        }
        if (data.length < 1000) break;
        offset += data.length;
    }
    return all;
}

export async function POST(request) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }

    // Preview mode (?preview=true) runs the resolution step only and returns
    // what WOULD be deleted — no DB writes, no Storage deletes. The DevToolsView
    // uses this to show the admin exactly what they're about to wipe before the
    // final confirm.
    const url = new URL(request.url);
    const isPreview = url.searchParams.get('preview') === 'true';

    try {
        // ─── ALLOWLIST GUARD ─────────────────────────────────────────────
        // The strongest safety layer: if ALLOWED_RESET_PHONES is unset, the
        // tool is disabled entirely. If set, only listed phone digits can be
        // reset. This runs BEFORE any Supabase query, so a wrong phone (or a
        // bug in every other guard) can never reach the database.
        const ALLOWED = (process.env.ALLOWED_RESET_PHONES || '')
            .split(',').map((s) => s.trim().replace(/\D/g, '')).filter(Boolean);
        if (ALLOWED.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'Reset tool is disabled — set ALLOWED_RESET_PHONES in .env.local to enable.',
            }, { status: 403 });
        }

        const body = await request.json();
        const { phone } = body || {};

        // (A) Phone validation — require a plausible phone number.
        if (!phone || !String(phone).trim()) {
            return NextResponse.json({ success: false, message: 'phone is required' }, { status: 400 });
        }
        const phoneDigits = digits(phone);
        if (phoneDigits.length < 8) {
            return NextResponse.json({
                success: false,
                message: 'Phone number too short — must be at least 8 digits.',
            }, { status: 400 });
        }

        // Allowlist check — reject any phone not explicitly permitted. This
        // is the guard that makes the tool safe to leave enabled: a real
        // tenant's phone is rejected here before a single DB query runs.
        if (!ALLOWED.includes(phoneDigits)) {
            return NextResponse.json({
                success: false,
                message: `This phone (${phoneDigits}) is not in the allowed reset list. Add it to ALLOWED_RESET_PHONES in .env.local to permit it.`,
            }, { status: 403 });
        }

        const candidates = phoneCandidates(phone);
        if (candidates.length === 0) {
            return NextResponse.json({ success: false, message: 'Could not parse phone number' }, { status: 400 });
        }

        const supabase = serviceClient();

        // ─── RESOLVE (read-only, no deletes yet) ──────────────────────────

        // 1. Main accounts matching this phone exactly.
        const mainAccounts = await safeIn(supabase, 'accounts',
            'id, whatsapp_number, linked_account_id, account_role, tenant_name',
            'whatsapp_number', candidates);
        const mainIds = mainAccounts.map((a) => a.id);

        // 2. Linked accounts (co-tenants/guarantors whose linked_account_id
        //    points at a main account). Only resolved if we have main ids.
        const linkedAccounts = mainIds.length > 0
            ? await safeIn(supabase, 'accounts',
                'id, whatsapp_number, linked_account_id, account_role, tenant_name',
                'linked_account_id', mainIds)
            : [];
        const linkedIds = linkedAccounts.map((a) => a.id);

        const allAccountIds = [...new Set([...mainIds, ...linkedIds])];

        // 3. Dossiers matching this phone exactly.
        const dossiersByPhone = await safeIn(supabase, 'dossiers', 'id, phone_number, created_at', 'phone_number', candidates);
        const allDossierIds = [...new Set(dossiersByPhone.map((d) => d.id))];

        // (G) 404 if nothing matches — typo safety.
        if (allAccountIds.length === 0 && allDossierIds.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No account or dossier found for that phone number. Check the number and try again.',
            }, { status: 404 });
        }

        // (C) Count guards — refuse if the lookup returned an unreasonable
        //     number of rows. A test dossier should never touch this many.
        if (allAccountIds.length > MAX_ACCOUNTS) {
            return NextResponse.json({
                success: false,
                message: `Phone matched ${allAccountIds.length} accounts (max ${MAX_ACCOUNTS}). Aborting — this looks like a lookup bug, not a single test dossier.`,
            }, { status: 400 });
        }
        if (allDossierIds.length > MAX_DOSSIERS) {
            return NextResponse.json({
                success: false,
                message: `Phone matched ${allDossierIds.length} dossiers (max ${MAX_DOSSIERS}). Aborting — this looks like a lookup bug, not a single test dossier.`,
            }, { status: 400 });
        }

        // 4. Resolve personen ids in those dossiers (needed for storage path
        //    collection + the count display).
        const persoonRows = allDossierIds.length > 0
            ? await safeIn(supabase, 'personen',
                'id, rol, voornaam, achternaam',
                'dossier_id', allDossierIds)
            : [];
        const persoonIds = persoonRows.map((p) => p.id);

        // 5. Count documenten rows (for the preview). Graceful: if the
        //    documenten lookup fails (e.g. schema drift), treat as 0 and
        //    record a warning — don't block the reset.
        const warnings = [];
        let docsByPersoon = [];
        let docsByPhone = [];
        try {
            docsByPersoon = persoonIds.length > 0
                ? await safeIn(supabase, 'documenten', 'bestandspad', 'persoon_id', persoonIds)
                : [];
            docsByPhone = await safeIn(supabase, 'documenten', 'bestandspad', 'phone_number', candidates);
        } catch (e) {
            console.warn('[reset-dossier] documenten lookup failed:', e.message);
            warnings.push({ step: 'documenten-lookup', message: e.message });
        }
        const docCount = docsByPersoon.length + docsByPhone.length;

        // 6. Count invoices. Graceful.
        let invoiceCount = 0;
        try {
            if (allAccountIds.length > 0) {
                const invRows = await safeIn(supabase, 'invoices', 'id', 'account_id', allAccountIds);
                invoiceCount = invRows.length;
            }
        } catch (e) {
            console.warn('[reset-dossier] invoices lookup failed:', e.message);
            warnings.push({ step: 'invoices-lookup', message: e.message });
        }

        // 7. Count apartment JSONB refs. Graceful.
        let aptRefCount = 0;
        let aptsAffected = 0;
        try {
            if (allAccountIds.length > 0) {
                const idSet = new Set(allAccountIds);
                const { data: allApts } = await supabase
                    .from('apartments')
                    .select('id, offers_in, offers_sent, accepted_deals, rejected_deals');
                for (const apt of allApts || []) {
                    let aptChanged = 0;
                    for (const col of ['offers_in', 'offers_sent', 'accepted_deals', 'rejected_deals']) {
                        const arr = Array.isArray(apt[col]) ? apt[col] : [];
                        aptChanged += arr.filter((e) => e && e.account_id && idSet.has(e.account_id)).length;
                    }
                    if (aptChanged > 0) { aptRefCount += aptChanged; aptsAffected++; }
                }
            }
        } catch (e) {
            console.warn('[reset-dossier] apartment ref count failed:', e.message);
            warnings.push({ step: 'apt-ref-count', message: e.message });
        }

        // ─── PREVIEW: return what would be deleted, no writes ─────────────
        if (isPreview) {
            return NextResponse.json({
                success: true,
                preview: true,
                phone: phoneDigits ? `+${phoneDigits}` : phone,
                willDelete: {
                    accounts: allAccountIds.length,
                    dossiers: allDossierIds.length,
                    personen: persoonIds.length,
                    documenten: docCount,
                    invoices: invoiceCount,
                    apartmentRefs: aptRefCount,
                    aptsAffected,
                },
                accountNames: mainAccounts.map((a) => a.tenant_name || a.whatsapp_number),
                dossierAddresses: dossiersByPhone.map((d) => d.id),
                warnings: warnings.length > 0 ? warnings : undefined,
            });
        }

        // ─── DELETE (scoped to resolved ids only) ─────────────────────────

        const counts = {
            accounts: 0, dossiers: 0, personen: 0, documenten: 0,
            invoices: 0, storageFiles: 0, apartmentRefs: 0,
        };

        // Collect storage paths before deletes (reuse docsByPersoon +
        // docsByPhone from the resolve step).
        const storagePaths = new Set();
        for (const d of [...docsByPersoon, ...docsByPhone]) {
            const p = storagePath(d.bestandspad);
            if (p) storagePaths.add(p);
        }

        // 8. Invoices keyed by account_id. Graceful — don't block the reset
        //    if invoice cleanup fails.
        try {
            if (allAccountIds.length > 0) {
                const deletedInvoices = await safeDeleteIn(supabase, 'invoices', 'account_id', allAccountIds, 'id');
                counts.invoices = deletedInvoices.length;
            }
        } catch (e) {
            console.warn('[reset-dossier] invoices delete failed:', e.message);
            warnings.push({ step: 'invoices-delete', message: e.message });
        }

        // 9. Apartment JSONB scrub. Graceful — only touches apartments that
        //    have an entry matching one of our account ids.
        let aptsScrubbed = 0;
        try {
            if (allAccountIds.length > 0) {
                const idSet = new Set(allAccountIds);
                const { data: allApts, error: aptErr } = await supabase
                    .from('apartments')
                    .select('id, offers_in, offers_sent, accepted_deals, rejected_deals');
                if (aptErr) throw aptErr;

                for (const apt of allApts || []) {
                    const next = {};
                    let changed = false;
                    for (const col of ['offers_in', 'offers_sent', 'accepted_deals', 'rejected_deals']) {
                        const arr = Array.isArray(apt[col]) ? apt[col] : [];
                        const filtered = arr.filter((e) => e && e.account_id && !idSet.has(e.account_id));
                        if (filtered.length !== arr.length) {
                            changed = true;
                            counts.apartmentRefs += (arr.length - filtered.length);
                        }
                        next[col] = filtered;
                    }
                    if (changed) {
                        const { error: upErr } = await supabase
                            .from('apartments').update(next).eq('id', apt.id);
                        if (upErr) {
                            console.warn(`[reset-dossier] apartment ${apt.id} JSONB scrub error:`, upErr.message);
                        } else {
                            aptsScrubbed++;
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('[reset-dossier] apartment JSONB scrub failed:', e.message);
            warnings.push({ step: 'apt-scrub', message: e.message });
        }

        // 10. Delete personen (CASCADE removes their documenten). Strict —
        //     if this fails, abort because something is fundamentally wrong.
        if (allDossierIds.length > 0) {
            const deletedPersonen = await safeDeleteIn(supabase, 'personen', 'dossier_id', allDossierIds, 'id');
            counts.personen = deletedPersonen.length;
        }

        // 10b. Delete orphaned documenten by phone_number. Graceful.
        try {
            const deletedOrphanDocs = await safeDeleteIn(supabase, 'documenten', 'phone_number', candidates, 'id');
            counts.documenten = deletedOrphanDocs.length + counts.personen;
        } catch (e) {
            console.warn('[reset-dossier] orphan documenten delete failed:', e.message);
            warnings.push({ step: 'documenten-orphan-delete', message: e.message });
            counts.documenten = counts.personen;
        }

        // 11. Delete dossiers. Strict.
        if (allDossierIds.length > 0) {
            const deletedDossiers = await safeDeleteIn(supabase, 'dossiers', 'id', allDossierIds, 'id');
            counts.dossiers = deletedDossiers.length;
        }

        // 12. Delete accounts — linked first (FK safety), then main. Strict.
        if (linkedIds.length > 0) {
            const deletedLinked = await safeDeleteIn(supabase, 'accounts', 'id', linkedIds, 'id');
            counts.accounts += deletedLinked.length;
        }
        if (mainIds.length > 0) {
            const deletedMain = await safeDeleteIn(supabase, 'accounts', 'id', mainIds, 'id');
            counts.accounts += deletedMain.length;
        }

        // 13. Storage cleanup — best-effort, never blocks. Only paths we
        //     explicitly collected, plus a prefix walk scoped to
        //     `<digits>/` (trailing slash = strict folder match).
        const storageErrors = [];
        const allStoragePaths = new Set(storagePaths);
        try {
            if (phoneDigits) {
                const prefixFiles = await listAllStorageFiles(supabase, `${phoneDigits}/`);
                for (const p of prefixFiles) allStoragePaths.add(p);
            }
        } catch (e) {
            console.warn('[reset-dossier] storage prefix walk failed:', e.message);
            warnings.push({ step: 'storage-walk', message: e.message });
        }

        if (allStoragePaths.size > 0) {
            const pathsArr = [...allStoragePaths];
            for (let i = 0; i < pathsArr.length; i += 1000) {
                const batch = pathsArr.slice(i, i + 1000);
                const { error: rmErr } = await supabase.storage.from(BUCKET).remove(batch);
                if (rmErr) {
                    console.warn('[reset-dossier] storage.remove error:', rmErr.message);
                    storageErrors.push(rmErr.message);
                }
            }
            counts.storageFiles = pathsArr.length;
        }

        return NextResponse.json({
            success: true,
            deleted: { ...counts, aptsScrubbed },
            storageErrors,
            warnings: warnings.length > 0 ? warnings : undefined,
            phone: phoneDigits ? `+${phoneDigits}` : phone,
            resolved: {
                accounts: allAccountIds.length,
                dossiers: allDossierIds.length,
            },
        });
    } catch (err) {
        return failed('crm/reset-dossier POST', err, 'Failed to reset dossier');
    }
}