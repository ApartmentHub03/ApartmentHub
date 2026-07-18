import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Update / delete a CRM invoice. Admin-only: re-pricing an invoice, marking it
// paid, or deleting it are all money operations, and there is no audit trail.

const EDITABLE = [
    'invoice_number', 'amount', 'currency', 'description', 'status', 'due_date', 'issued_at', 'pdf_path',
    'recipient_name', 'recipient_address', 'recipient_zipcode', 'recipient_city', 'recipient_country',
];

export async function GET(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const { data, error } = await serviceClient().from('invoices').select('*').eq('id', id).maybeSingle();
        if (error) throw error;
        if (!data) return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });
        return NextResponse.json({ success: true, invoice: data });
    } catch (err) {
        return failed('crm/invoices GET', err, 'Failed to load invoice');
    }
}

export async function PATCH(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const update = {};
        for (const k of EDITABLE) {
            if (!(k in body)) continue;
            if (k === 'amount') update.amount = body.amount === '' || body.amount == null ? null : Number(body.amount);
            else if (k === 'status' && !['draft', 'sent', 'paid', 'cancelled'].includes(body.status)) continue;
            else update[k] = body[k] === '' ? null : body[k];
        }
        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
        }
        if (update.amount != null && !Number.isFinite(update.amount)) {
            return NextResponse.json({ success: false, message: 'Amount must be a number' }, { status: 400 });
        }

        const { data, error } = await serviceClient().from('invoices').update(update).eq('id', id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, invoice: data });
    } catch (err) {
        return failed('crm/invoices PATCH', err, 'Failed to update invoice');
    }
}

export async function DELETE(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const { error } = await serviceClient().from('invoices').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return failed('crm/invoices DELETE', err, 'Failed to delete invoice');
    }
}
