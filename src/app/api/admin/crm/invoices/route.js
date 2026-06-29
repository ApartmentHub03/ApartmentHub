import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// List / create CRM invoices for the post-deal invoicing phase. CRM-authed.

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const accountId = new URL(request.url).searchParams.get('account_id');
        let q = serviceClient().from('invoices').select('*').order('created_at', { ascending: false });
        if (accountId) q = q.eq('account_id', accountId);
        const { data, error } = await q;
        if (error) throw error;
        return NextResponse.json({ success: true, invoices: data || [] });
    } catch (err) {
        console.error('[crm/invoices GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function POST(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const b = await request.json();
        if (!b.account_id) {
            return NextResponse.json({ success: false, message: 'account_id is required' }, { status: 400 });
        }
        const row = {
            account_id: b.account_id,
            apartment_id: b.apartment_id || null,
            invoice_number: b.invoice_number || null,
            amount: b.amount != null && b.amount !== '' ? Number(b.amount) : null,
            currency: b.currency || 'EUR',
            description: b.description || null,
            status: ['draft', 'sent', 'paid', 'cancelled'].includes(b.status) ? b.status : 'draft',
            due_date: b.due_date || null,
            created_by: auth.crm.id,
        };
        const { data, error } = await serviceClient().from('invoices').insert(row).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, invoice: data });
    } catch (err) {
        console.error('[crm/invoices POST]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
