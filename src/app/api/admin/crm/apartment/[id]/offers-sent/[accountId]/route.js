import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Patch a single offers_sent entry on an apartment.
//
// Lets the agent correct bid_amount / start_date / motivation / offer_type on
// an offer that's already been moved from Offers In to Offers Out, without
// re-running send-offer (which 404s once the offers_in entry is gone). Mirrors
// the atomic single-UPDATE pattern used by send-offer/route.js.
//
// Closed deals are not editable: a DEAL_ACCEPTED or OFFER_DECLINED entry is
// frozen. Mirrors send-offer's 409 guard.
//
// Auth: requires the "offers" permission (same as send-offer / mark-deal).
//
// No migration — offers_sent is jsonb and already carries bid_amount /
// start_date / motivation / offer_type (see send-offer/route.js step 5).

export async function PATCH(request, { params }) {
    const auth = await requirePermission(request, 'offers');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id, accountId } = await params;
    if (!isUuid(id) || !isUuid(accountId)) return invalidId();

    try {
        const body = await request.json().catch(() => ({}));
        const { bid_amount, start_date, motivation, offer_type } = body || {};

        // Only allow known bid fields. Unknown keys are ignored.
        const update = {};
        if (bid_amount != null) {
            const n = Number(bid_amount);
            if (Number.isFinite(n) && n >= 0) update.bid_amount = n;
            else return NextResponse.json({ success: false, message: 'bid_amount must be a non-negative number' }, { status: 400 });
        }
        if (start_date != null) {
            if (typeof start_date === 'string' && start_date.trim() !== '') update.start_date = start_date;
            else return NextResponse.json({ success: false, message: 'start_date must be a non-empty string' }, { status: 400 });
        }
        if (motivation != null) {
            if (typeof motivation === 'string') update.motivation = motivation;
            else return NextResponse.json({ success: false, message: 'motivation must be a string' }, { status: 400 });
        }
        if (offer_type != null) {
            const validOfferTypes = ['normal', 'hausing', 'grand'];
            if (!validOfferTypes.includes(offer_type)) {
                return NextResponse.json({ success: false, message: `offer_type must be one of: ${validOfferTypes.join(', ')}` }, { status: 400 });
            }
            update.offer_type = offer_type;
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: false, message: 'No editable fields supplied (bid_amount, start_date, motivation, offer_type)' }, { status: 400 });
        }

        const supabase = serviceClient();

        // 1. Fetch apartment with offers_sent.
        const { data: apt, error: aptErr } = await supabase
            .from('apartments')
            .select('id, offers_sent')
            .eq('id', id)
            .maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const offersSent = Array.isArray(apt.offers_sent) ? apt.offers_sent : [];

        // 2. Find the matching offers_sent entry by account_id.
        const idx = offersSent.findIndex((o) => o?.account_id === accountId);
        if (idx === -1) {
            return NextResponse.json({
                success: false,
                message: 'No matching offer in offers_sent for this account',
            }, { status: 404 });
        }

        // 3. Closed deals are frozen.
        const status = String(offersSent[idx].status || '').toUpperCase().trim();
        if (status === 'DEAL_ACCEPTED' || status === 'OFFER_DECLINED') {
            return NextResponse.json({
                success: false,
                message: `This offer has already been ${status === 'DEAL_ACCEPTED' ? 'accepted' : 'declined'} — cannot edit`,
            }, { status: 409 });
        }

        // 4. Atomic single UPDATE — replace only the matched entry.
        const nextOffersSent = offersSent.map((o, i) => i === idx ? { ...o, ...update } : o);
        const { error: updateErr } = await supabase
            .from('apartments')
            .update({ offers_sent: nextOffersSent })
            .eq('id', id);
        if (updateErr) throw updateErr;

        return NextResponse.json({
            success: true,
            message: 'Offer updated',
            apartment_id: id,
            account_id: accountId,
            offer: nextOffersSent[idx],
        });
    } catch (err) {
        return failed('crm/offers-sent PATCH', err, 'Failed to update offer');
    }
}