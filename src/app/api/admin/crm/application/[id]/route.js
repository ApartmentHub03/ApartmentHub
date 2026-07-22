import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import {
    fetchIn, isMainTenant, personName, phoneCandidates, roleLabel, storagePath,
} from '@/services/crmApplications';

// Full application detail for one account — tenant info, offer, co-tenants, and
// signed download URLs for every uploaded document. CRM-authed.
//
// People and documents come from the dossiers -> personen -> documenten chain.
// The accounts.co_tenants / accounts.documents JSONB mirrors are only a
// fallback for legacy rows with no dossier: nothing server-side maintains
// co_tenants, so reading it showed no co-tenants at all.

const BUCKET = 'dossier-documents';

export async function GET(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const supabase = serviceClient();
        const { data: account, error } = await supabase
            .from('accounts')
            .select('id, tenant_name, whatsapp_number, email, nationality, work_status, monthly_income, current_address, current_zipcode, preferred_location, move_in_date, negotiation_notes, co_tenants, documents, documentation_status, offered_apartments, apartments_applied_for, account_role, status')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!account) return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });

        // 1. The dossier behind this account, keyed on phone. We also pull the
        //    dossier-level bid fields (bid_amount / start_date / motivation /
        //    months_advance) — the Aanvraag submit writes the bid here, not to
        //    the `biedingen` table, so without this we'd have no bid to show
        //    for Aanvraag-originated applications.
        const { data: dossierRows } = await supabase
            .from('dossiers')
            .select('id, bid_amount, start_date, motivation, months_advance, candidate_bio, guarantor_bio, ai_profile, ai_profile_at, linkedin_url')
            .in('phone_number', phoneCandidates(account.whatsapp_number))
            .order('created_at', { ascending: false })
            .limit(1);
        const dossier = dossierRows?.[0] || null;
        const dossierId = dossier?.id || null;

        // 2. Its people, and every document they uploaded. Selected with `*`
        //    deliberately: personen/documenten have been reshaped over time
        //    (naam -> voornaam/achternaam, file_path -> bestandspad) and naming
        //    a column that no longer exists would fail the whole request.
        const personen = dossierId
            ? await fetchIn(supabase, 'personen', '*', 'dossier_id', [dossierId])
            : [];
        const documenten = personen.length
            ? await fetchIn(supabase, 'documenten', '*', 'persoon_id', personen.map((p) => p.id))
            : [];

        const personById = new Map(personen.map((p) => [p.id, p]));

        // 2b. Latest bid (if any) for this dossier — gives us offered rent,
        //     motivation, start date. Deposit is typically 2× the bid amount.
        //     Falls back to the dossier-level bid_amount/start_date/motivation
        //     when no `biedingen` row exists: the Aanvraag form writes the bid
        //     to `dossiers` (not `biedingen`), so without this fallback every
        //     Aanvraag-submitted application would show `bid: null` in the CRM.
        let bid = null;
        if (dossierId) {
            const { data: bidRows } = await supabase
                .from('biedingen')
                .select('id, amount, motivation, start_date, status, created_at')
                .eq('dossier_id', dossierId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (bidRows && bidRows.length > 0) {
                const b = bidRows[0];
                bid = {
                    amount: Number(b.amount) || 0,
                    deposit: (Number(b.amount) || 0) * 2,
                    motivation: b.motivation || '',
                    start_date: b.start_date || null,
                    status: b.status || 'pending',
                    created_at: b.created_at || null,
                };
            } else if (dossier && dossier.bid_amount != null) {
                const amt = Number(dossier.bid_amount) || 0;
                bid = {
                    amount: amt,
                    deposit: amt * 2,
                    motivation: dossier.motivation || '',
                    start_date: dossier.start_date || null,
                    status: 'pending',
                    created_at: null,
                };
            }
        }

        // 3. Co-tenants added through the CRM live as their own accounts row,
        //    linked back to this one, and may not be in personen.
        const { data: linkedAccounts } = await supabase
            .from('accounts')
            .select('id, tenant_name, whatsapp_number, email, account_role')
            .eq('linked_account_id', id);

        const coTenants = personen
            .filter((p) => !isMainTenant(p))
            .map((p) => ({
                name: personName(p),
                role: roleLabel(p),
                email: p.email || null,
                phone: p.telefoon || null,
            }));

        const seen = new Set(coTenants.map((c) => c.name.toLowerCase()));
        for (const l of linkedAccounts || []) {
            const name = (l.tenant_name || '').trim();
            if (name && seen.has(name.toLowerCase())) continue;
            if (name) seen.add(name.toLowerCase());
            coTenants.push({
                name: name || l.whatsapp_number || 'Unnamed',
                role: l.account_role === 'guarantor' ? 'Guarantor' : 'Co-tenant',
                email: l.email || null,
                phone: l.whatsapp_number || null,
                accountId: l.id,
            });
        }

        // 4. Normalise documents to one shape, then sign each for download (1h).
        const rawDocs = documenten.length
            ? documenten.map((d) => {
                const p = personById.get(d.persoon_id);
                return {
                    type: d.type,
                    status: d.status,
                    file_name: d.bestandsnaam,
                    file_path: d.bestandspad || d.file_path,
                    uploaded_at: d.uploaded_at,
                    person: p ? personName(p) : null,
                    person_role: p ? roleLabel(p) : null,
                };
            })
            : (Array.isArray(account.documents) ? account.documents : []).map((d) => ({
                ...d, person: account.tenant_name || null, person_role: 'Main tenant',
            }));

        const documents = await Promise.all(rawDocs.map(async (d) => {
            let url = null;
            if (d.file_path) {
                const { data: signed } = await supabase.storage
                    .from(BUCKET).createSignedUrl(storagePath(d.file_path), 3600);
                url = signed?.signedUrl || null;
            }
            return { ...d, url };
        }));

        return NextResponse.json({
            success: true,
            account: {
                ...account,
                documents,
                coTenants,
                dossierId,
                personen,
                bid,
                candidate_bio: dossier?.candidate_bio || null,
                guarantor_bio: dossier?.guarantor_bio || null,
                ai_profile: dossier?.ai_profile || null,
                ai_profile_at: dossier?.ai_profile_at || null,
                linkedin_url: dossier?.linkedin_url || null,
            },
        });
    } catch (err) {
        return failed('crm/application GET', err, 'Failed to load the application');
    }
}
