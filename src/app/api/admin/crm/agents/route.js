import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Create a CRM agent (point of contact shown on offers). CRM-authed.

export async function POST(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const b = await request.json();
        const name = (b.name || '').trim();
        if (!name) {
            return NextResponse.json({ success: false, message: 'Agent name is required' }, { status: 400 });
        }
        const row = {
            name,
            whatsapp_number: b.whatsapp_number || null,
            email: b.email || null,
            employee_id: b.employee_id || null,
            salesforce_agent_id: b.salesforce_agent_id || null,
            internal_notes: b.internal_notes || null,
        };
        const { data, error } = await serviceClient().from('crm_agents').insert(row).select().single();
        if (error) throw error;
        return NextResponse.json({ success: true, agent: data });
    } catch (err) {
        return failed('crm/agents POST', err, 'Failed to create agent');
    }
}
