import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// Applications list — accounts that have started/submitted an application
// (mirrors the website /aanvraag form). CRM-authed.

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const { data, error } = await serviceClient()
            .from('accounts')
            .select('id, tenant_name, whatsapp_number, email, work_status, monthly_income, documentation_status, documents, co_tenants, status, created_at')
            .order('created_at', { ascending: false })
            .limit(500);
        if (error) throw error;

        // Surface applications: those with documents, co-tenants, or a doc status.
        const applications = (data || [])
            .map((a) => ({
                id: a.id,
                tenant_name: a.tenant_name,
                whatsapp_number: a.whatsapp_number,
                email: a.email,
                work_status: a.work_status,
                monthly_income: a.monthly_income,
                documentation_status: a.documentation_status,
                docCount: Array.isArray(a.documents) ? a.documents.length : 0,
                coTenantCount: Array.isArray(a.co_tenants) ? a.co_tenants.length : 0,
                status: a.status,
            }))
            .filter((a) => a.docCount > 0 || a.coTenantCount > 0 || a.documentation_status);

        return NextResponse.json({ success: true, applications });
    } catch (err) {
        console.error('[crm/applications GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
