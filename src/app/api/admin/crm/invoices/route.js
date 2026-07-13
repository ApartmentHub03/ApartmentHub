import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// List / create CRM invoices for the post-deal invoicing phase.
// Reading is open to any team member with the "offers" permission; creating an
// invoice is money, so it is admin-only.

export async function GET(request) {
    const auth = await requirePermission(request, 'offers');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const accountId = new URL(request.url).searchParams.get('account_id');
        if (accountId && !isUuid(accountId)) return invalidId();

        let q = serviceClient().from('invoices').select('*').order('created_at', { ascending: false });
        if (accountId) q = q.eq('account_id', accountId);
        const { data, error } = await q;
        if (error) throw error;
        return NextResponse.json({ success: true, invoices: data || [] });
    } catch (err) {
        return failed('crm/invoices GET', err, 'Failed to load invoices');
    }
}

export async function POST(request) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const b = await request.json();
        if (!isUuid(b.account_id)) {
            return NextResponse.json({ success: false, message: 'A valid account_id is required' }, { status: 400 });
        }
        if (b.apartment_id && !isUuid(b.apartment_id)) return invalidId();

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
        if (row.amount != null && !Number.isFinite(row.amount)) {
            return NextResponse.json({ success: false, message: 'Amount must be a number' }, { status: 400 });
        }

        const { data, error } = await serviceClient().from('invoices').insert(row).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, invoice: data });
    } catch (err) {
        return failed('crm/invoices POST', err, 'Failed to create invoice');
    }
}
