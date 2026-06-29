import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// Full application detail for one account — tenant info, offer, co-tenants, and
// signed download URLs for every uploaded document. CRM-authed.

const BUCKET = 'dossier-documents';

export async function GET(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const supabase = serviceClient();
        const { data: account, error } = await supabase
            .from('accounts')
            .select('id, tenant_name, whatsapp_number, email, nationality, work_status, monthly_income, current_address, current_zipcode, preferred_location, move_in_date, negotiation_notes, co_tenants, documents, documentation_status, offered_apartments, apartments_applied_for, status')
            .eq('id', id)
            .maybeSingle();
        if (error) throw error;
        if (!account) return NextResponse.json({ success: false, message: 'Application not found' }, { status: 404 });

        // Sign each document for download (1 hour).
        const docs = Array.isArray(account.documents) ? account.documents : [];
        const documents = await Promise.all(docs.map(async (d) => {
            let url = null;
            if (d.file_path) {
                const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(d.file_path, 3600);
                url = signed?.signedUrl || null;
            }
            return { ...d, url };
        }));

        return NextResponse.json({ success: true, account: { ...account, documents } });
    } catch (err) {
        console.error('[crm/application GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
