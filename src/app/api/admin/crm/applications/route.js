import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';
import { fetchIn, isMainTenant, isUploaded, phoneCandidates, phoneKey } from '@/services/crmApplications';

// Applications list — accounts that have started/submitted an application
// (mirrors the website /aanvraag form). CRM-authed.
//
// Counts come from the dossiers -> personen -> documenten chain, not from the
// accounts.co_tenants / accounts.documents JSONB mirrors: nothing server-side
// maintains co_tenants, so counting it reported 0 co-tenants for every
// application. The mirrors are still used as a floor so legacy rows that have
// no dossier keep their counts.

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const supabase = serviceClient();
        const { data, error } = await supabase
            .from('accounts')
            .select('id, tenant_name, whatsapp_number, email, work_status, monthly_income, documentation_status, documents, co_tenants, linked_account_id, account_role, status, created_at')
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) throw error;
        const accounts = data || [];

        // Resolve each account's dossier by phone, then pull its people and docs.
        const candidates = accounts.flatMap((a) => phoneCandidates(a.whatsapp_number));
        const dossiers = await fetchIn(supabase, 'dossiers', 'id, phone_number', 'phone_number', candidates);

        const dossierByPhone = new Map(dossiers.map((d) => [phoneKey(d.phone_number), d.id]));
        const personen = await fetchIn(
            supabase, 'personen', 'id, dossier_id, rol, type', 'dossier_id', dossiers.map((d) => d.id),
        );
        const documenten = await fetchIn(
            supabase, 'documenten', 'persoon_id, status', 'persoon_id', personen.map((p) => p.id),
        );

        const dossierOfPerson = new Map(personen.map((p) => [p.id, p.dossier_id]));

        const coTenantsPerDossier = new Map();
        for (const p of personen) {
            if (isMainTenant(p)) continue;
            coTenantsPerDossier.set(p.dossier_id, (coTenantsPerDossier.get(p.dossier_id) || 0) + 1);
        }

        const docsPerDossier = new Map();
        for (const d of documenten) {
            if (!isUploaded(d.status)) continue;
            const dossierId = dossierOfPerson.get(d.persoon_id);
            if (!dossierId) continue;
            docsPerDossier.set(dossierId, (docsPerDossier.get(dossierId) || 0) + 1);
        }

        // Co-tenants added through the CRM get their own accounts row linked back
        // to the main tenant, without necessarily landing in personen.
        const linkedPerAccount = new Map();
        for (const a of accounts) {
            if (!a.linked_account_id) continue;
            linkedPerAccount.set(a.linked_account_id, (linkedPerAccount.get(a.linked_account_id) || 0) + 1);
        }

        const applications = accounts
            .map((a) => {
                const dossierId = dossierByPhone.get(phoneKey(a.whatsapp_number));
                const legacyDocs = Array.isArray(a.documents) ? a.documents.length : 0;
                const legacyCoTenants = Array.isArray(a.co_tenants) ? a.co_tenants.length : 0;
                return {
                    id: a.id,
                    tenant_name: a.tenant_name,
                    whatsapp_number: a.whatsapp_number,
                    email: a.email,
                    work_status: a.work_status,
                    monthly_income: a.monthly_income,
                    documentation_status: a.documentation_status,
                    account_role: a.account_role,
                    docCount: Math.max(docsPerDossier.get(dossierId) || 0, legacyDocs),
                    coTenantCount: Math.max(
                        coTenantsPerDossier.get(dossierId) || 0,
                        linkedPerAccount.get(a.id) || 0,
                        legacyCoTenants,
                    ),
                    status: a.status,
                };
            })
            .filter((a) => a.docCount > 0 || a.coTenantCount > 0 || a.documentation_status);

        return NextResponse.json({ success: true, applications });
    } catch (err) {
        return failed('crm/applications GET', err, 'Failed to load applications');
    }
}
