import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';

// "Generate Offer" — fires the n8n webhook (send-offer-to-the-tenant) directly
// from the API. Previously this wrote the tenant phone to apartments.generate_offer
// and relied on a DB trigger to fire the webhook + clear the column, but that
// trigger was broken in prod (references the dropped `name` column, and the
// `generate_offer` column itself has a drifted name). Firing the webhook from
// the API matches the broadcast/route.js pattern and removes the DB-trigger
// dependency entirely. No DB write, no audit trail — n8n's execution log is the
// record. The dormant trigger + column are left untouched (harmless).

const N8N_WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/send-offer-to-the-tenant';

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'candidates');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const { tenant_phone, account_id } = body;

        // Accept either tenant_phone or account_id. If account_id is given,
        // look up the whatsapp_number from accounts.
        let phone = null;

        if (tenant_phone && typeof tenant_phone === 'string' && tenant_phone.trim() !== '') {
            phone = tenant_phone.trim();
        } else if (account_id && typeof account_id === 'string' && account_id.trim() !== '') {
            const supabase = serviceClient();
            const { data: account, error: acctErr } = await supabase
                .from('accounts')
                .select('whatsapp_number')
                .eq('id', account_id)
                .maybeSingle();
            if (acctErr) throw acctErr;
            if (!account || !account.whatsapp_number) {
                return NextResponse.json({ success: false, message: 'Account not found or has no whatsapp_number' }, { status: 404 });
            }
            phone = account.whatsapp_number.trim();
        }

        if (!phone) {
            return NextResponse.json({ success: false, message: 'Either tenant_phone or account_id is required' }, { status: 400 });
        }

        // Fetch the apartment with the fields n8n needs to draft the offer email.
        const supabase = serviceClient();
        const { data: apt, error: fetchErr } = await supabase
            .from('apartments')
            .select('id, "Full Address", street, area, zip_code, rental_price, bedrooms, square_meters, status, event_link, eventlink_video, additional_notes, booking_details')
            .eq('id', id)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const apartmentName = apt['Full Address'] || apt.street || '';

        // Build the payload — matches the shape the old DB trigger sent, minus
        // salesforce_id and tags (neither exists on the apartments table in prod
        // and n8n's offer-drafting workflow doesn't read them).
        const payload = {
            event_type: 'generate_offer',
            tenant_phone: phone,
            apartment_id: apt.id,
            apartment_name: apartmentName,
            full_address: apartmentName || null,
            area: apt.area,
            rental_price: apt.rental_price,
            bedrooms: apt.bedrooms,
            square_meters: apt.square_meters,
            event_link: apt.event_link,
            status: apt.status,
            additional_notes: apt.additional_notes,
            timestamp: new Date().toISOString(),
        };

        // Fire the n8n webhook (same pattern as broadcast/route.js)
        try {
            const res = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                console.error('[crm/generate-offer] n8n webhook returned', res.status);
                return NextResponse.json({ success: false, message: `n8n webhook returned ${res.status}` }, { status: 502 });
            }
        } catch (webhookErr) {
            console.error('[crm/generate-offer] n8n webhook network error:', webhookErr);
            return NextResponse.json({ success: false, message: 'Could not reach n8n webhook' }, { status: 502 });
        }

        return NextResponse.json({
            success: true,
            message: 'Generate offer triggered — n8n webhook fired',
            apartment_id: id,
            tenant_phone: phone,
        });
    } catch (err) {
        return failed('crm/generate-offer POST', err, 'Failed to trigger generate offer');
    }
}