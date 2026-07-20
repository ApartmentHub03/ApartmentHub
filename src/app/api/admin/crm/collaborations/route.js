import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Collaborations API (point 9 · admin).
// Each row in real_estate_agents is an external realtor office that listings
// can reference via apartments.real_estate_agent_id. Admin-only writes mirror
// the team endpoints — the roster carries every external office's contact
// details and default offer type, which feed the Generate-offer Gmail draft.

const OFFER_TYPES = ['Normal', 'Hausing', 'Grand relocation'];

function normalizeOfferType(value) {
    if (!value) return 'Normal';
    if (OFFER_TYPES.includes(value)) return value;
    return 'Normal';
}

// POST — add a realtor office.
export async function POST(request) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const b = await request.json();
        const name = (b.name || '').trim();
        if (!name) {
            return NextResponse.json({ success: false, message: 'Office name is required' }, { status: 400 });
        }

        const row = {
            name,
            contact_person_name: (b.contact_person_name || '').trim() || null,
            phone_number: (b.phone_number || '').trim() || null,
            email: (b.email || '').trim() || null,
            default_offer_type: normalizeOfferType(b.default_offer_type),
        };

        const { data, error } = await serviceClient()
            .from('real_estate_agents')
            .insert(row)
            .select('id, name, contact_person_name, phone_number, email, default_offer_type')
            .single();

        if (error) throw error;
        return NextResponse.json({ success: true, agent: data });
    } catch (err) {
        return failed('crm/collaborations POST', err, 'Could not add this collaboration.');
    }
}