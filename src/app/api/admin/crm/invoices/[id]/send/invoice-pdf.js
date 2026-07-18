import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Generates the ApartmentHub commission invoice PDF, matching the layout of
// the real invoice template (Apartmenthub_invoice.pdf) David sent:
//
//   [recipient block]
//   Date / Description / Invoice number
//   INVOICE
//   Service fee payed | VAT | Amounts due (with divider line)
//   Thank-you paragraph + payment deadline sentence
//   Footer: company contact + banking + KvK/BTW details
//
// Uses pdf-lib (already a dependency, see contract-generator.ts / seller-qa
// route for the existing usage pattern in this codebase).

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const TEAL = rgb(0.286, 0.467, 0.447); // #497772 — matches crm-admin brand color
const INK = rgb(0.102, 0.169, 0.153);
const GREY = rgb(0.275, 0.329, 0.31);

function fmtEuro(n) {
    const num = Number(n || 0);
    return `€ ${num.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtDateLong(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function wrapText(text, font, fontSize, maxWidth) {
    const words = String(text || '').split(/\s+/);
    const lines = [];
    let current = '';
    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(test, fontSize) > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}

/**
 * @param {object} invoice - Row from the `invoices` table (with recipient_* + amount_* columns).
 * @param {string} apartmentAddress - apartments."Full Address" for the description line.
 * @returns {Promise<Uint8Array>}
 */
export async function generateInvoicePdf(invoice, apartmentAddress) {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle(`Invoice ${invoice.invoice_number || invoice.id}`);
    pdfDoc.setCreator('ApartmentHub');

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - 70;

    // --- Header: brand name top-right ---
    const brand = 'APARTMENTHUB';
    const brandSize = 16;
    const brandWidth = helveticaBold.widthOfTextAtSize(brand, brandSize);
    page.drawText(brand, {
        x: PAGE_WIDTH - MARGIN_RIGHT - brandWidth,
        y: PAGE_HEIGHT - 60,
        size: brandSize,
        font: helveticaBold,
        color: TEAL,
    });

    // --- Recipient block ---
    // Layout matches the real template: name / street / zipcode (own line) /
    // "City, Country" joined with a comma.
    const cityCountry = [invoice.recipient_city, invoice.recipient_country].filter(Boolean).join(', ');
    const recipientLines = [
        invoice.recipient_name,
        invoice.recipient_address,
        invoice.recipient_zipcode,
        cityCountry,
    ].filter(Boolean);

    for (const line of recipientLines) {
        page.drawText(line, { x: MARGIN_LEFT, y, size: 11, font: helvetica, color: INK });
        y -= 16;
    }

    y -= 20;

    // --- Date / Description / Invoice number ---
    const metaFontSize = 11;
    const metaLabelWidth = 110;
    const metaRows = [
        ['Date:', fmtDate(invoice.issued_at || new Date())],
        ['Description:', apartmentAddress || '—'],
        ['Invoice number:', invoice.invoice_number || '—'],
    ];
    for (const [label, value] of metaRows) {
        page.drawText(label, { x: MARGIN_LEFT, y, size: metaFontSize, font: helvetica, color: INK });
        page.drawText(value, { x: MARGIN_LEFT + metaLabelWidth, y, size: metaFontSize, font: helvetica, color: INK });
        y -= 16;
    }

    y -= 12;

    // --- "INVOICE" title, centered ---
    const titleSize = 15;
    const titleWidth = helveticaBold.widthOfTextAtSize('INVOICE', titleSize);
    page.drawText('INVOICE', {
        x: (PAGE_WIDTH - titleWidth) / 2,
        y,
        size: titleSize,
        font: helveticaBold,
        color: INK,
    });
    y -= 30;

    // --- Line items ---
    const amountX = PAGE_WIDTH - MARGIN_RIGHT - 90;
    const lineFontSize = 11;

    page.drawText('Service fee payed:', { x: MARGIN_LEFT, y, size: lineFontSize, font: helvetica, color: INK });
    page.drawText(fmtEuro(invoice.amount_ex_vat), { x: amountX, y, size: lineFontSize, font: helvetica, color: INK });
    y -= 18;

    const vatPct = Math.round((invoice.vat_rate ?? 0.21) * 100);
    page.drawText(`VAT (${vatPct}%)`, { x: MARGIN_LEFT, y, size: lineFontSize, font: helvetica, color: INK });
    page.drawText(fmtEuro(invoice.vat_amount), { x: amountX, y, size: lineFontSize, font: helvetica, color: INK });
    y -= 10;

    // Divider line
    page.drawLine({
        start: { x: MARGIN_LEFT, y },
        end: { x: PAGE_WIDTH - MARGIN_RIGHT, y },
        thickness: 0.75,
        color: GREY,
    });
    y -= 20;

    page.drawText('Amounts due:', { x: MARGIN_LEFT, y, size: lineFontSize, font: helveticaBold, color: TEAL });
    page.drawText(fmtEuro(invoice.amount_inc_vat ?? invoice.amount), {
        x: amountX, y, size: lineFontSize, font: helveticaBold, color: TEAL,
    });
    y -= 40;

    // --- Thank-you paragraph ---
    const paragraphs = [
        "Congratulations on your new home and the beginning of this exciting new chapter in your life!",
        "We're thrilled to welcome you to your new residence and hope it becomes a space filled with joy, laughter, and countless cherished memories.",
        `To ensure a smooth transition, we kindly ask that you transfer the specified amount by ${fmtDateLong(invoice.due_date)}.`,
    ];
    for (const para of paragraphs) {
        const lines = wrapText(para, helvetica, 11, CONTENT_WIDTH);
        for (const line of lines) {
            page.drawText(line, { x: MARGIN_LEFT, y, size: 11, font: helvetica, color: INK });
            y -= 16;
        }
        y -= 8;
    }

    y -= 10;
    page.drawText('Best regards,', { x: MARGIN_LEFT, y, size: 11, font: helvetica, color: INK });
    y -= 16;
    page.drawText('Team Apartmenthub', { x: MARGIN_LEFT, y, size: 11, font: helveticaBold, color: INK });

    // --- Footer: company details ---
    const footerLines = [
        'Apartmenthub \u2022 06 83221189 \u2022 Van Baerlestraat 62-2 \u2022 1017 PB Amsterdam',
        'finance@apartmenthub.nl \u2022 IBAN: NL73 BUNQ 2043392409 \u2022 SWIFT/BIC: BUNQNL2AXXX \u2022 KvK 74255142',
        'BTW id. NL002403230B63',
        'www.apartmenthub.nl',
    ];
    let footerY = 70;
    for (const line of footerLines) {
        const w = helvetica.widthOfTextAtSize(line, 9);
        page.drawText(line, { x: (PAGE_WIDTH - w) / 2, y: footerY, size: 9, font: helvetica, color: GREY });
        footerY -= 13;
    }

    return pdfDoc.save();
}
