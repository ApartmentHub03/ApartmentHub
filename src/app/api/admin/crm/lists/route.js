import { NextResponse } from 'next/server';
import { serviceClient, requireCrmUser } from '@/services/crmAuth';
import { failed } from '@/services/crmHttp';

// Read API backing the CRM tabs (Apartments, Candidates, Agents, Bookings) +
// dashboard KPIs. Service-role for data access, gated to active team members.

// Compute pipeline_stage for an apartment row based on JSONB array contents.
// Order of precedence: deals > offers_out > waiting > active > not_active.
//
// "Not active" rule: if the viewing happened 2+ weeks ago (or the apartment was
// created 2+ weeks ago with no viewing) AND nothing more happened (no offers,
// no deals), the apartment drops to not_active so it no longer needs attention.
function computePipelineStage(apt) {
    const accepted = Array.isArray(apt.accepted_deals) ? apt.accepted_deals : [];
    const rejected = Array.isArray(apt.rejected_deals) ? apt.rejected_deals : [];
    const offersSent = Array.isArray(apt.offers_sent) ? apt.offers_sent : [];
    const offersIn = Array.isArray(apt.offers_in) ? apt.offers_in : [];

    // Deals — any accepted or rejected deal means this apartment is in the deals bucket
    if (accepted.length > 0 || rejected.length > 0) return 'deals';

    // Offers out — any sent offer that's still pending (not yet accepted/declined)
    const pendingOffers = offersSent.filter((o) => {
        const s = String(o?.status || '').toUpperCase().trim();
        return s !== 'DEAL_ACCEPTED' && s !== 'OFFER_DECLINED';
    });
    if (pendingOffers.length > 0) return 'offers_out';

    // Waiting for offers — offers came in but none sent out yet
    if (offersIn.length > 0) return 'waiting';

    // Closed listings are not active
    if (apt.status === 'Closed') return 'not_active';

    // 2-week rule: if the viewing (or creation if no viewing) was 2+ weeks ago
    // and nothing more happened, drop to not_active.
    const referenceDate = apt.viewing_moment || apt.created_at;
    if (referenceDate) {
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const refMs = new Date(referenceDate).getTime();
        if (!isNaN(refMs) && refMs < twoWeeksAgo) {
            return 'not_active';
        }
    }

    return 'active';
}

export async function GET(request) {
    const auth = await requireCrmUser(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    try {
        const supabase = serviceClient();

        const [apartments, candidates, agents, realEstateAgents, invoices, crmUsers] = await Promise.all([
            supabase
                .from('apartments')
                .select('id, "Full Address", street, area, zip_code, rental_price, bedrooms, square_meters, status, viewing_participants, viewing_cancellations, booking_reschedules, offers_in, offers_sent, accepted_deals, rejected_deals, real_estate_agent_id, assigned_crm_user_id, event_link, eventlink_video, booking_details, created_at')
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
            supabase
                .from('real_estate_agents')
                .select('id, name, contact_person_name, email, default_offer_type')
                .order('created_at', { ascending: false }),
            supabase
                .from('invoices')
                .select('id, account_id, apartment_id, status, amount_inc_vat, closed_by, created_at')
                .order('created_at', { ascending: false }),
            supabase
                .from('crm_users')
                .select('id, name')
                .eq('is_active', true)
                .order('name', { ascending: true }),
        ]);

        for (const r of [apartments, candidates, agents, realEstateAgents, invoices, crmUsers]) {
            if (r.error) throw r.error;
        }

        // Build a lookup map for real estate agent names
        const agentNameMap = new Map();
        for (const rea of realEstateAgents.data || []) {
            agentNameMap.set(rea.id, rea.name);
        }

        // Build a lookup map for CRM user (closer) names
        const crmUserMap = new Map();
        for (const cu of crmUsers.data || []) {
            crmUserMap.set(cu.id, cu.name);
        }

        // Build a lookup map for invoices by (apartment_id + account_id)
        const invoiceMap = new Map();
        for (const inv of invoices.data || []) {
            const key = `${inv.apartment_id}:${inv.account_id}`;
            // Keep the most recent invoice per apartment+account
            if (!invoiceMap.has(key)) {
                invoiceMap.set(key, inv);
            }
        }

        // Build account lookup for tenant names (by id)
        const accountMap = new Map();
        for (const acct of candidates.data || []) {
            accountMap.set(acct.id, acct);
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

        // Build apartment rows with pipeline_stage, counts, and agent name.
        // Don't ship the heavy viewing JSON arrays — the Bookings tab already
        // gets them flattened above. Keep offers_in/offers_sent/accepted_deals/
        // rejected_deals for the pipeline computation only.
        const apartmentRows = (apartments.data || []).map((a) => {
            const offersInArr = Array.isArray(a.offers_in) ? a.offers_in : [];
            const offersSentArr = Array.isArray(a.offers_sent) ? a.offers_sent : [];
            const viewingParticipants = Array.isArray(a.viewing_participants) ? a.viewing_participants : [];
            const acceptedDeals = Array.isArray(a.accepted_deals) ? a.accepted_deals : [];
            const rejectedDeals = Array.isArray(a.rejected_deals) ? a.rejected_deals : [];

            // Extract viewing moment from booking_details JSONB
            // Live data stores it in booking_details.latest_slot.start
            let viewingMoment = null;
            if (a.booking_details && typeof a.booking_details === 'object') {
                const bd = a.booking_details;
                viewingMoment = bd.latest_slot?.start
                    || bd.date
                    || bd.start_date
                    || bd.when
                    || null;
            }

            return {
                id: a.id,
                'Full Address': a['Full Address'],
                street: a.street,
                area: a.area,
                zip_code: a.zip_code,
                rental_price: a.rental_price,
                bedrooms: a.bedrooms,
                square_meters: a.square_meters,
                status: a.status,
                real_estate_agent_id: a.real_estate_agent_id,
                real_estate_agent_name: a.real_estate_agent_id ? (agentNameMap.get(a.real_estate_agent_id) || null) : null,
                assigned_crm_user_id: a.assigned_crm_user_id,
                assigned_crm_user_name: a.assigned_crm_user_id ? (crmUserMap.get(a.assigned_crm_user_id) || null) : null,
                event_link: a.event_link,
                viewing_moment: viewingMoment,
                joined_count: viewingParticipants.length,
                offers_in_count: offersInArr.length,
                offers_out_count: offersSentArr.length,
                pipeline_stage: computePipelineStage({
                    accepted_deals: acceptedDeals,
                    rejected_deals: rejectedDeals,
                    offers_sent: offersSentArr,
                    offers_in: offersInArr,
                    status: a.status,
                    viewing_moment: viewingMoment,
                    created_at: a.created_at,
                }),
            };
        });

        // Flatten accepted_deals from all apartments into won_deals list
        const wonDeals = [];
        for (const apt of apartments.data || []) {
            const accepted = Array.isArray(apt.accepted_deals) ? apt.accepted_deals : [];
            const address = apt['Full Address'] || apt.street || '—';
            for (const deal of accepted) {
                const acctId = deal.account_id || null;
                const acct = acctId ? accountMap.get(acctId) : null;
                const invKey = `${apt.id}:${acctId}`;
                const inv = invoiceMap.get(invKey);
                wonDeals.push({
                    apartment_id: apt.id,
                    apartment_address: address,
                    account_id: acctId,
                    tenant_name: deal.tenant_name || acct?.tenant_name || '—',
                    rent_price: apt.rental_price || null,
                    contract_start_date: acct?.contract_start_date || null,
                    responded_at: deal.responded_at || null,
                    closer_name: inv?.closed_by ? (crmUserMap.get(inv.closed_by) || '—') : '—',
                    invoice_id: inv?.id || null,
                    invoice_status: inv?.status || null,
                    invoice_amount_inc_vat: inv?.amount_inc_vat || null,
                });
            }
        }
        // Sort: most recent first
        wonDeals.sort((a, b) => (b.responded_at || '').localeCompare(a.responded_at || ''));

        return NextResponse.json({
            success: true,
            apartments: apartmentRows,
            candidates: candidates.data || [],
            agents: agents.data || [],
            real_estate_agents: realEstateAgents.data || [],
            bookings,
            won_deals: wonDeals,
            crm_users: crmUsers.data || [],
        });
    } catch (err) {
        return failed('crm/lists GET', err, 'Failed to load CRM data');
    }
}
