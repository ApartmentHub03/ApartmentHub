import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin } from '@/services/crmAuth';
import { isUuid, failed } from '@/services/crmHttp';

// Collaborations API (point 9 · admin) — per-office edit/delete.
// apartments.real_estate_agent_id is ON DELETE SET NULL, so deleting a realtor
// clears the FK on any listings that referenced it — no orphans, no cascade.

const OFFER_TYPES = ['Normal', 'Hausing', 'Grand relocation'];

function normalizeOfferType(value) {
    if (!value) return 'Normal';
    if (OFFER_TYPES.includes(value)) return value;
    return 'Normal';
}

// PATCH — update any subset of fields on a realtor office.
export async function PATCH(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ success: false, message: 'A valid collaboration id is required' }, { status: 400 });
        }

        const b = await request.json();
        const update = {};

        if (b.name != null) {
            const name = (b.name || '').trim();
            if (!name) {
                return NextResponse.json({ success: false, message: 'Office name cannot be empty' }, { status: 400 });
            }
            update.name = name;
        }
        if (b.contact_person_name !== undefined) {
            update.contact_person_name = (b.contact_person_name || '').trim() || null;
        }
        if (b.phone_number !== undefined) {
            update.phone_number = (b.phone_number || '').trim() || null;
        }
        if (b.email !== undefined) {
            update.email = (b.email || '').trim() || null;
        }
        if (b.default_offer_type != null) {
            update.default_offer_type = normalizeOfferType(b.default_offer_type);
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: false, message: 'Nothing to update' }, { status: 400 });
        }

        const { data, error } = await serviceClient()
            .from('real_estate_agents')
            .update(update)
            .eq('id', id)
            .select('id, name, contact_person_name, phone_number, email, default_offer_type')
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, agent: data });
    } catch (err) {
        return failed('crm/collaborations PATCH', err, 'Could not update this collaboration.');
    }
}

// DELETE — remove a realtor office. Apartments referencing it have their
// real_estate_agent_id set to NULL by the foreign key's ON DELETE SET NULL.
export async function DELETE(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const { id } = await params;
        if (!isUuid(id)) {
            return NextResponse.json({ success: false, message: 'A valid collaboration id is required' }, { status: 400 });
        }

        const { error } = await serviceClient()
            .from('real_estate_agents')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (err) {
        return failed('crm/collaborations DELETE', err, 'Could not delete this collaboration.');
    }
}