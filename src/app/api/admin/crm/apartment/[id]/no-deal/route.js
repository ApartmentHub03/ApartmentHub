import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// "No deal" — flips an offer in apartments.offers_sent to OFFER_DECLINED.
// The DB trigger `trigger_deal_response` (BEFORE UPDATE OF offers_sent) then
// syncs the rejected_deals into accounts + apartments tables and fires the
// n8n webhook. This route does NOT call n8n directly.

function normalizeForMatch(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.length > 9 ? digits.slice(-9) : digits;
}

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const { account_id, whatsapp_number } = body;

        if (!account_id && !whatsapp_number) {
            return NextResponse.json({ success: false, message: 'Either account_id or whatsapp_number is required' }, { status: 400 });
        }

        const supabase = serviceClient();

        // Fetch apartment with offers_sent
        const { data: apt, error: fetchErr } = await supabase
            .from('apartments')
            .select('id, offers_sent')
            .eq('id', id)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const offersSent = Array.isArray(apt.offers_sent) ? apt.offers_sent : [];
        if (offersSent.length === 0) {
            return NextResponse.json({ success: false, message: 'No offers sent for this apartment' }, { status: 404 });
        }

        // Find matching offer by account_id (preferred) or whatsapp_number
        let matchIdx = -1;
        if (account_id) {
            matchIdx = offersSent.findIndex((o) => o?.account_id === account_id);
        }
        if (matchIdx === -1 && whatsapp_number) {
            const phoneNorm = normalizeForMatch(whatsapp_number);
            matchIdx = offersSent.findIndex((o) => {
                const oPhone = o?.whatsapp_number || o?.phone_number || '';
                return normalizeForMatch(oPhone) === phoneNorm && phoneNorm !== '';
            });
        }

        if (matchIdx === -1) {
            return NextResponse.json({ success: false, message: 'No matching offer found' }, { status: 404 });
        }

        // Check if already responded
        const currentStatus = String(offersSent[matchIdx].status || '').toUpperCase().trim();
        if (currentStatus === 'DEAL_ACCEPTED' || currentStatus === 'OFFER_DECLINED') {
            return NextResponse.json({
                success: false,
                message: `This offer has already been ${currentStatus === 'DEAL_ACCEPTED' ? 'accepted' : 'declined'}`,
            }, { status: 409 });
        }

        // Flip to OFFER_DECLINED — DB trigger fires n8n + syncs rejected_deals
        offersSent[matchIdx] = {
            ...offersSent[matchIdx],
            status: 'OFFER_DECLINED',
            responded_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
            .from('apartments')
            .update({ offers_sent: offersSent })
            .eq('id', id);
        if (updateErr) throw updateErr;

        return NextResponse.json({
            success: true,
            message: 'Offer declined — n8n webhook fired by DB trigger',
            apartment_id: id,
            offer_index: matchIdx,
        });
    } catch (err) {
        return failed('crm/no-deal POST', err, 'Failed to decline offer');
    }
}