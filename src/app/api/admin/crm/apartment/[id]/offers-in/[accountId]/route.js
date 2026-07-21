import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// Patch a single offers_in entry on an apartment.
//
// Lets the agent correct bid_amount / start_date / motivation on an offer that
// is still in Offers In. This is the persistent counterpart to the in-memory
// "Adjust Offer" editor in ApplicationDetailView: after the agent negotiates
// with the landlord, the adjusted terms are saved back to offers_in so the
// next Generate offer / Send offer uses the negotiated values without the
// agent having to re-type them.
//
// Mirrors the atomic single-UPDATE pattern used by offers-sent/[accountId].
//
// Auth: requires the "offers" permission (same as send-offer / mark-deal).
//
// No migration — offers_in is jsonb and already carries bid_amount /
// start_date / motivation (see send-offer/route.js and link-offers).

export async function PATCH(request, { params }) {
    const auth = await requirePermission(request, 'offers');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id, accountId } = await params;
    if (!isUuid(id) || !isUuid(accountId)) return invalidId();

    try {
        const body = await request.json().catch(() => ({}));
        const { bid_amount, start_date, motivation } = body || {};

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

        if (Object.keys(update).length === 0) {
            return NextResponse.json({ success: false, message: 'No editable fields supplied (bid_amount, start_date, motivation)' }, { status: 400 });
        }

        const supabase = serviceClient();

        // 1. Fetch apartment with offers_in.
        const { data: apt, error: aptErr } = await supabase
            .from('apartments')
            .select('id, offers_in')
            .eq('id', id)
            .maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const offersIn = Array.isArray(apt.offers_in) ? apt.offers_in : [];

        // 2. Find the matching offers_in entry by account_id.
        const idx = offersIn.findIndex((o) => o?.account_id === accountId);
        if (idx === -1) {
            return NextResponse.json({
                success: false,
                message: 'No matching offer in offers_in for this account',
            }, { status: 404 });
        }

        // 3. Atomic single UPDATE — replace only the matched entry.
        const nextOffersIn = offersIn.map((o, i) => i === idx ? { ...o, ...update } : o);
        const { error: updateErr } = await supabase
            .from('apartments')
            .update({ offers_in: nextOffersIn })
            .eq('id', id);
        if (updateErr) throw updateErr;

        return NextResponse.json({
            success: true,
            message: 'Offer updated',
            apartment_id: id,
            account_id: accountId,
            offer: nextOffersIn[idx],
        });
    } catch (err) {
        return failed('crm/offers-in PATCH', err, 'Failed to update offer');
    }
}
