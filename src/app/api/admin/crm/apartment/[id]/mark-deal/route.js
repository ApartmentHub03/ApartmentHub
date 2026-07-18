import { NextResponse } from 'next/server';
import { serviceClient, requirePermission } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { calculateCommission } from '@/utils/commission';
import { deleteCalEvents } from '@/services/calcom';

// "Mark as Deal" — confirms a deal from the offers_out subtab.
//
// 1. Flips the matching offers_sent entry to DEAL_ACCEPTED (DB trigger fires
//    n8n + syncs accepted_deals to accounts + apartments).
// 2. Sets accounts.contract_start_date to the provided value.
// 3. Computes commission (1 or 2 months rent ex-VAT, 21% BTW) and creates
//    a draft invoice row.
//
// Auth: requires the "offers" permission.

// Auto-generates a human-readable invoice number: DDMMYYYY-XXXX. The date
// prefix makes invoices easy to sort/scan; the random suffix keeps multiple
// invoices issued on the same day unique without a DB sequence.
function generateInvoiceNumber() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${dd}${mm}${yyyy}-${suffix}`;
}

export async function POST(request, { params }) {
    const auth = await requirePermission(request, 'offers');
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        const body = await request.json();
        const { account_id, closer_user_id, contract_start_date, final_rent_price } = body;

        if (!isUuid(account_id)) {
            return NextResponse.json({ success: false, message: 'A valid account_id is required' }, { status: 400 });
        }
        if (!contract_start_date) {
            return NextResponse.json({ success: false, message: 'contract_start_date is required' }, { status: 400 });
        }

        const supabase = serviceClient();

        // Fetch apartment with offers_sent + rental_price + commission_months + Cal.com IDs
        const { data: apt, error: aptErr } = await supabase
            .from('apartments')
            .select('id, "Full Address", rental_price, commission_months, offers_sent, status, cal_event_type_id, cal_event_type_id_video, cal_schedule_id')
            .eq('id', id)
            .maybeSingle();
        if (aptErr) throw aptErr;
        if (!apt) return NextResponse.json({ success: false, message: 'Apartment not found' }, { status: 404 });

        const offersSent = Array.isArray(apt.offers_sent) ? apt.offers_sent : [];

        // Find matching offer by account_id
        const matchIdx = offersSent.findIndex((o) => o?.account_id === account_id);
        if (matchIdx === -1) {
            return NextResponse.json({ success: false, message: 'No matching offer found for this account' }, { status: 404 });
        }

        // Check if already responded
        const currentStatus = String(offersSent[matchIdx].status || '').toUpperCase().trim();
        if (currentStatus === 'DEAL_ACCEPTED' || currentStatus === 'OFFER_DECLINED') {
            return NextResponse.json({
                success: false,
                message: `This offer has already been ${currentStatus === 'DEAL_ACCEPTED' ? 'accepted' : 'declined'}`,
            }, { status: 409 });
        }

        // Determine the rent price to use for commission
        const rentPrice = final_rent_price != null && final_rent_price !== ''
            ? Number(final_rent_price)
            : Number(apt.rental_price) || 0;

        // Flip offer to DEAL_ACCEPTED — DB trigger fires n8n + syncs accepted_deals
        offersSent[matchIdx] = {
            ...offersSent[matchIdx],
            status: 'DEAL_ACCEPTED',
            responded_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
            .from('apartments')
            .update({ offers_sent: offersSent })
            .eq('id', id);
        if (updateErr) throw updateErr;

        // Set accounts.contract_start_date
        const { error: acctErr } = await supabase
            .from('accounts')
            .update({ contract_start_date: contract_start_date })
            .eq('id', account_id);
        if (acctErr) throw acctErr;

        // Fetch tenant name + address to snapshot onto the invoice. City/country
        // have no source column anywhere in the schema — left null for the
        // admin to fill in before sending.
        const { data: account } = await supabase
            .from('accounts')
            .select('tenant_name, current_address, current_zipcode')
            .eq('id', account_id)
            .maybeSingle();

        // Compute commission + VAT
        const commission = calculateCommission(rentPrice, apt.commission_months);

        // Create draft invoice
        const address = apt['Full Address'] || '—';
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 14);

        const invoiceRow = {
            account_id,
            apartment_id: id,
            description: `Commission – ${address}`,
            status: 'draft',
            amount: commission.amountIncVat, // legacy column = inc VAT for backward compat
            amount_ex_vat: commission.amountExVat,
            vat_rate: commission.vatRate,
            vat_amount: commission.vatAmount,
            amount_inc_vat: commission.amountIncVat,
            commission_months: commission.months,
            closed_by: closer_user_id && isUuid(closer_user_id) ? closer_user_id : null,
            created_by: auth.crm.id,
            invoice_number: generateInvoiceNumber(),
            due_date: dueDate.toISOString().slice(0, 10),
            recipient_name: account?.tenant_name || null,
            recipient_address: account?.current_address || null,
            recipient_zipcode: account?.current_zipcode || null,
        };

        const { data: invoice, error: invoiceErr } = await supabase
            .from('invoices')
            .insert(invoiceRow)
            .select()
            .single();
        if (invoiceErr) throw invoiceErr;

        // Auto-close the listing + tear down Cal.com (won deal = off the market).
        // Cal.com cleanup failures are logged but do not block the deal confirmation.
        let closedListing = false;
        let calWarnings = [];
        try {
            if (apt.cal_event_type_id || apt.cal_event_type_id_video || apt.cal_schedule_id) {
                try {
                    const calResult = await deleteCalEvents({
                        calEventTypeId: apt.cal_event_type_id,
                        calEventTypeIdVideo: apt.cal_event_type_id_video,
                        calScheduleId: apt.cal_schedule_id,
                    });
                    if (!calResult.success) {
                        calWarnings = calResult.errors.map((e) => e.type);
                    }
                } catch (calErr) {
                    console.error('[crm/mark-deal] Cal.com cleanup failed:', calErr);
                    calWarnings = ['calcom-cleanup-failed'];
                }
            }
            const { error: closeErr } = await supabase
                .from('apartments')
                .update({ status: 'Closed' })
                .eq('id', id);
            if (closeErr) {
                console.error('[crm/mark-deal] Failed to close listing:', closeErr);
            } else {
                closedListing = true;
            }
        } catch (closeErr) {
            console.error('[crm/mark-deal] Auto-close failed:', closeErr);
        }

        return NextResponse.json({
            success: true,
            message: closedListing
                ? 'Deal confirmed — invoice created as draft, listing closed'
                : 'Deal confirmed — invoice created as draft (listing auto-close failed, close manually)',
            apartment_id: id,
            account_id,
            invoice,
            commission,
            closed_listing: closedListing,
            cal_warnings: calWarnings,
        });
    } catch (err) {
        return failed('crm/mark-deal POST', err, 'Failed to confirm deal');
    }
}