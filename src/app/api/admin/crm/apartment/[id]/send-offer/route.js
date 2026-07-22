import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { phoneCandidates } from '@/services/crmApplications';

// "Send offer" — moves an offer from apartments.offers_in to apartments.offers_sent.
//
// This is the missing pipeline step between "tenant submitted an offer"
// (offers_in, populated by /api/dossier/link-offers when /nl/aanvraag submits)
// and "agent responds to the offer" (mark-deal / no-deal, which operate on
// offers_sent). Without this route, the Offers Out subtab is always empty
// and the Deal / No Deal buttons are unreachable from the UI — nothing else
// in the codebase writes to offers_sent.
//
// Auth: requires the "offers" permission (same as mark-deal). If you can
// confirm a deal, you can send an offer.
//
// Idempotent: if offers_sent already has a PENDING entry for this account_id,
// returns 200 "already sent" instead of duplicating.
//
// Atomic: a single UPDATE writes both offers_sent (append) and offers_in
// (remove the entry) in one shot — no race window where the offer appears in
// both tabs or neither.
//
// DB trigger safety: trigger_deal_response fires BEFORE UPDATE OF
// offers_sent, but its function body skips any entry whose status isn't
// DEAL_ACCEPTED or OFFER_DECLINED (migration 20260226040000 line 75). A PENDING
// entry no-ops the trigger. Verified safe.

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'offers');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const { account_id, offer_type = 'normal', bid_amount, start_date, motivation, candidate_bio, guarantor_bio } = body || {};

        if (!isUuid(account_id)) {
            return NextResponse.json({ success: false, message: 'A valid account_id is required' }, { status: 400 });
        }
        const validOfferTypes = ['normal', 'hausing', 'grand'];
        if (!validOfferTypes.includes(offer_type)) {
            return NextResponse.json({ success: false, message: `offer_type must be one of: ${validOfferTypes.join(', ')}` }, { status: 400 });
        }

        const supabase = serviceClient();

        // 1. Fetch apartment with offer arrays + realtor/agent links so we can
        //    persist the recipient email on the offers_sent record.
        const { data: apt, error: aptErr } = await supabase
            .from('apartments')
            .select('id, offers_in, offers_sent, real_estate_agent_id, assigned_crm_user_id')
            .eq('id', id)
            .maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        // Resolve the offer email recipient using the same fallback chain as
        // generate-offer: external realtor -> assigned CRM user -> logged-in agent.
        let realtorEmail = null;
        let recipientSource = 'self';

        if (apt.real_estate_agent_id) {
            const { data: agentRow, error: agentErr } = await supabase
                .from('real_estate_agents')
                .select('id, name, contact_person_name, email')
                .eq('id', apt.real_estate_agent_id)
                .maybeSingle();
            if (agentErr) throw agentErr;
            if (agentRow && agentRow.email) {
                realtorEmail = agentRow.email;
                recipientSource = 'real_estate_agent';
            }
        }

        if (!realtorEmail && apt.assigned_crm_user_id) {
            const { data: assignedUser, error: assignedErr } = await supabase
                .from('crm_users')
                .select('id, name, email')
                .eq('id', apt.assigned_crm_user_id)
                .maybeSingle();
            if (assignedErr) throw assignedErr;
            if (assignedUser && assignedUser.email) {
                realtorEmail = assignedUser.email;
                recipientSource = 'assigned_crm_user';
            }
        }

        if (!realtorEmail) {
            // Final fallback: the logged-in agent themselves. They can fill in
            // the real recipient in Gmail before sending. crm.email is guaranteed
            // by requirePermission.
            if (!auth.crm?.email) {
                return NextResponse.json({
                    success: false,
                    message: 'No recipient available — set a real estate agent or assign a CRM user on the listing, or ensure your CRM account has an email.',
                }, { status: 400 });
            }
            realtorEmail = auth.crm.email;
            recipientSource = 'self';
        }

        const offersIn = Array.isArray(apt.offers_in) ? apt.offers_in : [];
        const offersSent = Array.isArray(apt.offers_sent) ? apt.offers_sent : [];

        // 2. Find the matching offers_in entry by account_id.
        const inIdx = offersIn.findIndex((o) => o?.account_id === account_id);
        if (inIdx === -1) {
            return NextResponse.json({
                success: false,
                message: 'No matching offer in offers_in for this account — tenant must submit /nl/aanvraag first',
            }, { status: 404 });
        }
        const inOffer = offersIn[inIdx];

        // 3. Idempotency: if offers_sent already has a PENDING entry for this
        //    account, don't duplicate. Return success so the UI's loadApt()
        //    refresh shows the existing entry in Offers Out.
        const existingSentIdx = offersSent.findIndex((o) => o?.account_id === account_id);
        if (existingSentIdx !== -1) {
            const existingStatus = String(offersSent[existingSentIdx].status || '').toUpperCase().trim();
            if (existingStatus === 'PENDING') {
                return NextResponse.json({
                    success: true,
                    message: 'Offer already sent — entry exists in offers_sent with PENDING status',
                    apartment_id: id,
                    account_id,
                    offer: offersSent[existingSentIdx],
                    already_sent: true,
                });
            }
            // If existing entry is already DEAL_ACCEPTED or OFFER_DECLINED,
            // don't allow re-sending — the deal is closed.
            return NextResponse.json({
                success: false,
                message: `This offer has already been ${existingStatus === 'DEAL_ACCEPTED' ? 'accepted' : 'declined'} — cannot re-send`,
            }, { status: 409 });
        }

        // 4. Resolve tenant whatsapp_number from accounts — the deal-response
        //    trigger + Offers Out UI both read this field off the offers_sent
        //    entry, and offers_in doesn't carry it (link-offers writes
        //    {account_id, tenant_name, bid_amount, start_date, motivation,
        //     status, submitted_at} only).
        const { data: account, error: acctErr } = await supabase
            .from('accounts')
            .select('whatsapp_number')
            .eq('id', account_id)
            .maybeSingle();
        if (acctErr) throw acctErr;

        // 5. Build the offers_sent entry. Shape matches what mark-deal /
        //    no-deal read (account_id + status) and what the deal-response
        //    trigger reads (tenant_name, whatsapp_number, responded_at).
        //    Caller-provided bid_amount / start_date / motivation override the
        //    offers_in snapshot values — this is how the agent's Adjust Offer
        //    edits (from ApplicationDetailView) get persisted into the new
        //    offers_sent entry on send.
        const sentAt = new Date().toISOString();
        const newSent = {
            account_id,
            tenant_name: inOffer.tenant_name || null,
            whatsapp_number: account?.whatsapp_number || null,
            bid_amount: bid_amount != null ? Number(bid_amount) : (Number(inOffer.bid_amount) || 0),
            start_date: (typeof start_date === 'string' && start_date.trim() !== '') ? start_date : (inOffer.start_date || null),
            motivation: motivation != null ? motivation : (inOffer.motivation || null),
            offer_type,
            status: 'PENDING',
            sent_at: sentAt,
            realtor_email: realtorEmail,
            recipient_source: recipientSource,
        };

        // 6. Single atomic UPDATE — append to offers_sent + remove from
        //    offers_in in one write. No race window between the two arrays.
        const nextOffersIn = offersIn.filter((o) => o?.account_id !== account_id);
        const nextOffersSent = [...offersSent, newSent];

        const { error: updateErr } = await supabase
            .from('apartments')
            .update({ offers_in: nextOffersIn, offers_sent: nextOffersSent })
            .eq('id', id);
        if (updateErr) throw updateErr;

        // 7. Persist candidate_bio / guarantor_bio to the dossier so edits
        //    made in the Adjust Offer screen are saved even if the auto-drafted
        //    generate-offer call fails or is skipped (already_sent path).
        //    Mirrors the upsert logic in generate-offer route.js.
        if (account?.whatsapp_number && (candidate_bio != null || guarantor_bio != null)) {
            try {
                const { data: dossierRows } = await supabase
                    .from('dossiers')
                    .select('id, candidate_bio, guarantor_bio')
                    .in('phone_number', phoneCandidates(account.whatsapp_number))
                    .order('created_at', { ascending: false })
                    .limit(1);
                const dossier = dossierRows?.[0];
                if (dossier) {
                    const update = {};
                    if (candidate_bio != null && candidate_bio !== (dossier.candidate_bio || '')) {
                        update.candidate_bio = candidate_bio;
                    }
                    if (guarantor_bio != null && guarantor_bio !== (dossier.guarantor_bio || '')) {
                        update.guarantor_bio = guarantor_bio;
                    }
                    if (Object.keys(update).length > 0) {
                        const { error: bioErr } = await supabase
                            .from('dossiers')
                            .update(update)
                            .eq('id', dossier.id);
                        if (bioErr) console.error('[send-offer] bio persist failed (continuing):', bioErr);
                    }
                }
            } catch (bioPersistErr) {
                console.error('[send-offer] bio persist error (continuing):', bioPersistErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Offer sent — moved from Offers In to Offers Out',
            apartment_id: id,
            account_id,
            offer: newSent,
        });
    } catch (err) {
        return failed('crm/send-offer POST', err, 'Failed to send offer');
    }
}