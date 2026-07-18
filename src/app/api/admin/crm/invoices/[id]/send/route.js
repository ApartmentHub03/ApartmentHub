import { NextResponse } from 'next/server';
import { serviceClient, requireAdmin } from '@/services/crmAuth';
import { isUuid, invalidId, failed } from '@/services/crmHttp';
import { Resend } from 'resend';
import { generateInvoicePdf } from './invoice-pdf';

// Send an invoice email via Resend.
//
// Renders the branded invoice PDF (matching David's real invoice template),
// uploads it to the "Invoices" storage bucket, attaches it to the email, and
// sends from finance@apartmenthub.nl. Sets invoices.status = 'sent' +
// issued_at = now on success.

const resendKey = process.env.VERKOOP_RESEND_API_KEY ?? process.env.RESEND_API_KEY;
const MAIL_FROM = process.env.VERKOOP_MAIL_FROM ?? process.env.MAIL_FROM ?? 'ApartmentHub Finance <finance@apartmenthub.nl>';
const resend = resendKey ? new Resend(resendKey) : null;
const PDF_BUCKET = 'Invoices';

function invoiceEmailHtml({ invoiceNumber, tenantName, amountIncVat, dueDate }) {
    const fmt = (n) => `€ ${Number(n || 0).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f4f6f6;color:#1a2b27">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
  <div style="background:#497772;color:#fff;border-radius:12px 12px 0 0;padding:24px 28px">
    <div style="font-size:22px;font-weight:700;letter-spacing:-.01em">ApartmentHub</div>
    <div style="font-size:13px;opacity:.85;margin-top:2px">Invoice ${invoiceNumber || ''}</div>
  </div>
  <div style="background:#fff;border:1px solid #e0e8e6;border-top:none;padding:28px">
    <p style="margin:0 0 4px;font-size:14px;color:#46544f">Dear ${tenantName || 'Tenant'},</p>
    <p style="margin:0 0 20px;font-size:14px;color:#46544f">Please find your invoice attached — total amount due is <b>${fmt(amountIncVat)}</b>${dueDate ? `, payable by <b>${new Date(dueDate).toLocaleDateString('nl-NL', { day: '2-digit', month: 'long', year: 'numeric' })}</b>` : ''}.</p>
    <p style="font-size:12px;color:#8a9994;margin:24px 0 0;border-top:1px solid #e0e8e6;padding-top:16px">
      ApartmentHub · Van Baerlestraat 62-2 · 1017 PB Amsterdam · KvK 74255142 · BTW id. NL002403230B63<br>
      This is an automated email — please do not reply directly.
    </p>
  </div>
</div>
</body></html>`;
}

export async function POST(request, { params }) {
    const auth = await requireAdmin(request);
    if (auth.response) {
        return NextResponse.json(auth.response.body, { status: auth.response.status });
    }
    const { id } = await params;
    if (!isUuid(id)) return invalidId();

    try {
        if (!resend) {
            return NextResponse.json({ success: false, message: 'RESEND_API_KEY not configured' }, { status: 500 });
        }

        const supabase = serviceClient();

        // Fetch invoice
        const { data: invoice, error: invErr } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .maybeSingle();
        if (invErr) throw invErr;
        if (!invoice) return NextResponse.json({ success: false, message: 'Invoice not found' }, { status: 404 });

        if (invoice.status === 'sent' || invoice.status === 'paid') {
            return NextResponse.json({ success: false, message: `Invoice already ${invoice.status}` }, { status: 409 });
        }

        // Fetch account (tenant name + email)
        let account = null;
        if (invoice.account_id) {
            const { data: acct } = await supabase
                .from('accounts')
                .select('tenant_name, email')
                .eq('id', invoice.account_id)
                .maybeSingle();
            account = acct;
        }

        // Fetch apartment (address)
        let apartment = null;
        if (invoice.apartment_id) {
            const { data: apt } = await supabase
                .from('apartments')
                .select('"Full Address", street')
                .eq('id', invoice.apartment_id)
                .maybeSingle();
            apartment = apt;
        }

        const address = apartment?.['Full Address'] || apartment?.street || '—';
        const tenantName = invoice.recipient_name || account?.tenant_name || 'Tenant';
        const recipientEmail = account?.email;

        if (!recipientEmail) {
            return NextResponse.json({ success: false, message: 'Account has no email address — cannot send invoice' }, { status: 400 });
        }

        // The PDF template requires a full postal address. Name/street/zipcode
        // are auto-filled from the account at deal-confirmation time, but city
        // and country have no source column anywhere in the schema — an admin
        // must fill those in on the invoice before it can be sent.
        const missingFields = [];
        if (!invoice.recipient_name) missingFields.push('recipient name');
        if (!invoice.recipient_address) missingFields.push('recipient address');
        if (!invoice.recipient_city) missingFields.push('recipient city');
        if (!invoice.recipient_country) missingFields.push('recipient country');
        if (missingFields.length > 0) {
            return NextResponse.json({
                success: false,
                message: `Invoice is missing ${missingFields.join(', ')} — edit the invoice before sending`,
            }, { status: 400 });
        }

        const invoiceNumber = invoice.invoice_number || `INV-${invoice.id.slice(0, 8).toUpperCase()}`;

        // Render the PDF
        const pdfBytes = await generateInvoicePdf(
            { ...invoice, invoice_number: invoiceNumber, issued_at: invoice.issued_at || new Date().toISOString() },
            address,
        );
        const pdfBuffer = Buffer.from(pdfBytes);
        const pdfFilename = `invoice-${invoiceNumber}.pdf`;

        // Upload to storage (best-effort — failure here doesn't block sending,
        // it just means pdf_path stays unset and the PDF is only reachable via
        // the email attachment).
        const storagePath = `invoices/${id}/${pdfFilename}`;
        let pdfPath = invoice.pdf_path || null;
        try {
            const { error: upErr } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, pdfBuffer, {
                contentType: 'application/pdf', upsert: true,
            });
            if (upErr) throw upErr;
            pdfPath = storagePath;
        } catch (upErr) {
            console.error('[invoices/send] PDF upload failed (continuing without storage):', upErr);
        }

        const html = invoiceEmailHtml({
            invoiceNumber,
            tenantName,
            amountIncVat: invoice.amount_inc_vat || invoice.amount,
            dueDate: invoice.due_date,
        });

        const { error: sendErr } = await resend.emails.send({
            from: MAIL_FROM,
            to: recipientEmail,
            subject: `Invoice ${invoiceNumber} — ApartmentHub`,
            html,
            attachments: [{ filename: pdfFilename, content: pdfBuffer.toString('base64') }],
        });

        if (sendErr) {
            console.error('[invoices/send] Resend error:', sendErr);
            return NextResponse.json({ success: false, message: sendErr.message || 'Failed to send email' }, { status: 502 });
        }

        // Update invoice status
        const { error: updateErr } = await supabase
            .from('invoices')
            .update({ status: 'sent', issued_at: new Date().toISOString(), pdf_path: pdfPath })
            .eq('id', id);
        if (updateErr) throw updateErr;

        return NextResponse.json({
            success: true,
            message: `Invoice sent to ${recipientEmail}`,
            invoice_id: id,
        });
    } catch (err) {
        return failed('crm/invoices/send POST', err, 'Failed to send invoice');
    }
}