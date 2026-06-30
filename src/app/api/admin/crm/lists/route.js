import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';

// Read API backing the CRM tabs (Apartments, Candidates, Agents, Bookings) +
// dashboard KPIs. Service-role for data access, gated to active team members.

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const supabase = serviceClient();

        const [apartments, candidates, agents] = await Promise.all([
            supabase
                .from('apartments')
                .select('id, "Full Address", street, area, zip_code, rental_price, bedrooms, square_meters, status, viewing_participants, viewing_cancellations, booking_reschedules')
                .order('created_at', { ascending: false }),
            supabase
                .from('accounts')
                .select('id, tenant_name, whatsapp_number, email, status, preferred_location, move_in_date, contract_start_date, contract_end_date, created_at')
                .order('created_at', { ascending: false })
                .limit(200),
            supabase
                .from('crm_agents')
                .select('id, name, whatsapp_number, email, salesforce_agent_id')
                .order('created_at', { ascending: false }),
        ]);

        for (const r of [apartments, candidates, agents]) {
            if (r.error) throw r.error;
        }

        // Flatten the per-apartment viewing JSON into booking rows for the
        // Bookings tab (current / cancelled / rescheduled).
        const bookings = { current: [], cancelled: [], rescheduled: [] };
        for (const apt of apartments.data || []) {
            const address = apt['Full Address'] || apt.street || '—';
            const push = (bucket, list) => {
                (Array.isArray(list) ? list : []).forEach((p) => {
                    bucket.push({
                        apartmentId: apt.id,
                        apartment: address,
                        name: p?.name || '—',
                        whatsapp: p?.whatsapp_number || null,
                        eventUrl: p?.event_url || null,
                        cancelledBy: p?.cancelled_by || null,
                        when: p?.created_at || p?.updated_at || null,
                    });
                });
            };
            push(bookings.current, apt.viewing_participants);
            push(bookings.cancelled, apt.viewing_cancellations);
            push(bookings.rescheduled, apt.booking_reschedules);
        }

        // Don't ship the heavy viewing JSON arrays to the client twice — the
        // Bookings tab already gets them flattened above.
        const apartmentRows = (apartments.data || []).map((a) => ({
            id: a.id,
            'Full Address': a['Full Address'],
            street: a.street,
            area: a.area,
            zip_code: a.zip_code,
            rental_price: a.rental_price,
            bedrooms: a.bedrooms,
            square_meters: a.square_meters,
            status: a.status,
        }));

        return NextResponse.json({
            success: true,
            apartments: apartmentRows,
            candidates: candidates.data || [],
            agents: agents.data || [],
            bookings,
        });
    } catch (err) {
        console.error('[crm/lists GET]', err);
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}
