import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// Update / delete a CRM invoice. CRM-authed.

const EDITABLE = ['invoice_number', 'amount', 'currency', 'description', 'status', 'due_date', 'issued_at', 'pdf_path'];

export async function PATCH(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
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
        const { data, error } = await serviceClient().from('invoices').update(update).eq('id', id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, invoice: data });
    } catch (err) {
        console.error('[crm/invoices PATCH]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}

export async function DELETE(request, { params }) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    try {
        const { error } = await serviceClient().from('invoices').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[crm/invoices DELETE]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
