import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// Edit / delete a CRM agent. CRM-authed.

const EDITABLE = ['name', 'whatsapp_number', 'email', 'employee_id', 'salesforce_agent_id', 'internal_notes'];

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
            if (k in body) update[k] = body[k] === '' ? null : body[k];
        }
        if (update.name === null) {
            return NextResponse.json({ success: false, message: 'Name cannot be empty' }, { status: 400 });
        }
        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
        }
        const { data, error } = await serviceClient().from('crm_agents').update(update).eq('id', id).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, agent: data });
    } catch (err) {
        console.error('[crm/agents PATCH]', err);
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
        const { error } = await serviceClient().from('crm_agents').delete().eq('id', id);
        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('[crm/agents DELETE]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
