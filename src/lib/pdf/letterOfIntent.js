import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// Generates the ApartmentHub "Letter of Intent" PDF, matching the layout of
// the real template David uses (see the reference "Letter of Intent
// (getekend).pdf"):
//
//   [logo]                              APARTMENTHUB
//   LETTER OF INTENT
//   note: cancellation-fee disclaimer
//   REAL ESTATE AGENCY
//   [boxed] MAIN TENANT: Surname / First name(s) / Street+number / Postcode /
//           City / Email / Telephone / Date of birth / Passport number
//   [boxed] CO-TENANT (IF APPLICABLE): same fields
//   CONTRACTOR footer block (address / phone / email)
//   --- page 2 ---
//   [boxed] Property details: Street+number / Postcode+place / Rental price /
//           Deposit / Months paid upfront / Starting date
//   Conditions: [boxed] bullet list of standard conditions
//   Name main tenant / Place & date / Signature (blank line or stamped PNG)
//   CONTRACTOR footer block
//
// Uses pdf-lib (already a dependency — see invoice-pdf.js / contract-generator.ts
// for the existing usage pattern in this codebase). Unsigned by default: the
// signature area is left blank so the tenant can sign the copy attached to
// the offer draft. If a `signaturePngBytes` buffer is passed in, it is
// stamped into the signature box instead (used when the tenant has already
// signed via the LetterOfIntent.jsx flow before the offer is drafted).

const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89;
const MARGIN_LEFT = 56;
const MARGIN_RIGHT = 56;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

const TEAL = rgb(0.286, 0.467, 0.447); // #497772 — matches crm-admin brand color
const ORANGE = rgb(0.953, 0.42, 0.098); // #F36B19 — accent line under the logo
const INK = rgb(0.102, 0.169, 0.153);
const GREY = rgb(0.275, 0.329, 0.31);
const LIGHT_GREY = rgb(0.82, 0.85, 0.83);

const LOGO_PATH = path.join(process.cwd(), 'public', 'images', 'vertical-logo.png');

const AGENCY_ADDRESS = 'Apartmenthub - Korte Leidsedwarsstraat 12, 1017RC Amsterdam';
const AGENCY_PHONE = '+316 41439378';
const AGENCY_EMAIL = 'info@apartmenthub.nl';

function fmtEuro(n) {
    if (n == null) return '\u2014';
    const num = Number(n || 0);
    return `\u20AC ${num.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(d) {
    if (!d) return '\u2014';
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

const CONDITIONS = [
    'You agree that Apartmenthub will check your personal information.',
    'You agree that Apartmenthub will perform various credit checks and requests your data from BKR.',
    'You agree that Apartmenthub contacts your employer for information.',
    'You agree that Apartmenthub shares your contact details with EasyNuts so they can advise you regarding utilities, TV /internet.',
    'Your information will be treated confidentially and only be provided to third parties to get you your house without your permission.',
    'After sending us the letter of intent completed and signed we will confirm to you if we have a deal within maximum of 7 working days.',
    'If you cancel the house after we\u2019ve confirmed the deal there will be costs involved of 1 months rent excl VAT.',
];

// Draws the small ApartmentHub wordmark (logo image, falls back to brand text)
// right-aligned at the given y baseline. Returns nothing — mutates the page.
async function drawBrand(pdfDoc, page, helveticaBold, y) {
    const logoMaxW = 140;
    const logoMaxH = 50;
    try {
        const logoBytes = await fs.readFile(LOGO_PATH);
        const logo = await pdfDoc.embedPng(logoBytes);
        const scale = Math.min(logoMaxW / logo.width, logoMaxH / logo.height);
        const w = logo.width * scale;
        const h = logo.height * scale;
        page.drawImage(logo, {
            x: (PAGE_WIDTH - w) / 2,
            y: y - h,
            width: w,
            height: h,
        });
        return h;
    } catch (logoErr) {
        console.error('[loi-pdf] logo embed failed, falling back to text:', logoErr);
        const brand = 'APARTMENTHUB';
        const brandSize = 16;
        const brandWidth = helveticaBold.widthOfTextAtSize(brand, brandSize);
        page.drawText(brand, {
            x: (PAGE_WIDTH - brandWidth) / 2,
            y: y - brandSize,
            size: brandSize,
            font: helveticaBold,
            color: TEAL,
        });
        return brandSize;
    }
}

function drawFooter(page, helvetica, footerY) {
    const lines = [
        AGENCY_ADDRESS,
        AGENCY_PHONE,
        AGENCY_EMAIL,
    ];
    let y = footerY;
    for (const line of lines) {
        const w = helvetica.widthOfTextAtSize(line, 9);
        page.drawText(line, { x: (PAGE_WIDTH - w) / 2, y, size: 9, font: helvetica, color: GREY });
        y -= 13;
    }
}

// Draws a boxed section with a title bar and label/value rows. Returns the
// new y position (below the box).
function drawPersonBox(page, { title, rows, helvetica, helveticaBold, x, y, width }) {
    const rowHeight = 20;
    const titleHeight = 24;
    const boxHeight = titleHeight + rows.length * rowHeight + 8;
    const topY = y;

    // Box border
    page.drawRectangle({
        x,
        y: topY - boxHeight,
        width,
        height: boxHeight,
        borderColor: LIGHT_GREY,
        borderWidth: 1,
    });

    // Title
    page.drawText(title, {
        x: x + 10,
        y: topY - 16,
        size: 11,
        font: helveticaBold,
        color: TEAL,
    });
    page.drawLine({
        start: { x: x + 10, y: topY - 20 },
        end: { x: x + width - 10, y: topY - 20 },
        thickness: 1.5,
        color: ORANGE,
    });

    let rowY = topY - titleHeight - 10;
    const labelWidth = 130;
    for (const [label, value] of rows) {
        page.drawText(label, { x: x + 10, y: rowY, size: 10, font: helveticaBold, color: INK });
        page.drawText(String(value ?? '\u2014'), {
            x: x + 10 + labelWidth,
            y: rowY,
            size: 10,
            font: helvetica,
            color: INK,
        });
        page.drawLine({
            start: { x: x + 10, y: rowY - 4 },
            end: { x: x + width - 10, y: rowY - 4 },
            thickness: 0.5,
            color: LIGHT_GREY,
        });
        rowY -= rowHeight;
    }

    return topY - boxHeight;
}

/**
 * @param {object} data
 * @param {object} data.mainTenant - { surname, firstName, street, postcode, city, email, phone, dateOfBirth, passportNumber }
 * @param {object|null} data.coTenant - same shape, or null if none
 * @param {object} data.property - { street, postcode, city, rentPrice, deposit, startDate, monthsUpfront }
 * @param {Uint8Array|Buffer|null} [data.signaturePngBytes] - if provided, stamped into the signature box
 * @param {string|null} [data.signedPlace] - e.g. "Amsterdam" — used next to "Place & Date" if a signature is stamped
 * @param {string|null} [data.signedDate] - ISO date used next to "Place & Date" if a signature is stamped
 * @returns {Promise<Uint8Array>}
 */
export async function generateLetterOfIntentPdf(data) {
    const { mainTenant, coTenant, property, signaturePngBytes, signedPlace, signedDate } = data;

    const pdfDoc = await PDFDocument.create();
    pdfDoc.setTitle('Letter of Intent');
    pdfDoc.setCreator('ApartmentHub');

    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ---------- Page 1: tenant details ----------
    const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - 60;

    y -= await drawBrand(pdfDoc, page1, helveticaBold, y);
    y -= 24;

    const titleSize = 20;
    page1.drawText('LETTER OF INTENT', {
        x: MARGIN_LEFT,
        y,
        size: titleSize,
        font: helveticaBold,
        color: TEAL,
    });
    y -= 22;

    const noteText = 'NOTE: BY COMPLETING AND SIGNING THIS DOCUMENT YOU AGREE WITH RENTING THE RELEVANT HOUSE. '
        + 'SHOULD YOU LATER RENOUNCE THIS HOUSE THERE WILL BE COSTS INVOLVED OF 1 MONTHS RENT EXCL VAT.';
    for (const line of wrapText(noteText, helvetica, 8.5, CONTENT_WIDTH)) {
        page1.drawText(line, { x: MARGIN_LEFT, y, size: 8.5, font: helvetica, color: GREY });
        y -= 11;
    }
    y -= 8;

    page1.drawText('REAL ESTATE AGENCY', {
        x: MARGIN_LEFT,
        y,
        size: 10,
        font: helveticaBold,
        color: GREY,
    });
    y -= 22;

    const mt = mainTenant || {};
    y = drawPersonBox(page1, {
        title: 'MAIN TENANT',
        rows: [
            ['Surname:', mt.surname],
            ['First name(s):', mt.firstName],
            ['Street + house number:', mt.street],
            ['Postcode:', mt.postcode],
            ['City:', mt.city],
            ['E-mail address:', mt.email],
            ['Telephone:', mt.phone],
            ['Date of Birth:', mt.dateOfBirth],
            ['Pasport number:', mt.passportNumber],
        ],
        helvetica,
        helveticaBold,
        x: MARGIN_LEFT,
        y,
        width: CONTENT_WIDTH,
    });
    y -= 24;

    const ct = coTenant || {};
    y = drawPersonBox(page1, {
        title: 'CO-TENANT (IF APPLICABLE)',
        rows: [
            ['Surname:', ct.surname],
            ['First name(s):', ct.firstName],
            ['Street + house number:', ct.street],
            ['Postcode:', ct.postcode],
            ['City:', ct.city],
            ['E-mail address:', ct.email],
            ['Telephone:', ct.phone],
            ['Date of Birth:', ct.dateOfBirth],
            ['Pasport number:', ct.passportNumber],
        ],
        helvetica,
        helveticaBold,
        x: MARGIN_LEFT,
        y,
        width: CONTENT_WIDTH,
    });

    // Footer
    page1.drawText('CONTRACTOR', {
        x: (PAGE_WIDTH - helveticaBold.widthOfTextAtSize('CONTRACTOR', 10)) / 2,
        y: 96,
        size: 10,
        font: helveticaBold,
        color: TEAL,
    });
    drawFooter(page1, helvetica, 76);

    // ---------- Page 2: property, conditions, signature ----------
    const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y2 = PAGE_HEIGHT - 70;

    y2 = drawPersonBox(page2, {
        title: 'PROPERTY DETAILS',
        rows: [
            ['Streename + Number:', property?.street],
            ['Postal code + place:', [property?.postcode, property?.city].filter(Boolean).join(' ')],
            ['Rental price \u20AC', fmtEuro(property?.rentPrice)],
            ['Deposit \u20AC', fmtEuro(property?.deposit)],
            ['Months paid upfront:', property?.monthsUpfront ?? 1],
            ['Starting date:', fmtDate(property?.startDate)],
        ],
        helvetica,
        helveticaBold,
        x: MARGIN_LEFT,
        y: y2,
        width: CONTENT_WIDTH,
    });
    y2 -= 26;

    page2.drawText('Conditions:', { x: MARGIN_LEFT, y: y2, size: 11, font: helveticaBold, color: GREY });
    y2 -= 18;

    // Conditions box
    const bulletFontSize = 9.5;
    const bulletIndent = 14;
    const bulletMaxWidth = CONTENT_WIDTH - 20 - bulletIndent;
    const conditionLines = CONDITIONS.map((c) => wrapText(c, helvetica, bulletFontSize, bulletMaxWidth));
    const totalLines = conditionLines.reduce((sum, ls) => sum + ls.length, 0);
    const introHeight = 16;
    const boxPadding = 12;
    const boxHeight = introHeight + totalLines * 13 + boxPadding * 2;
    page2.drawRectangle({
        x: MARGIN_LEFT,
        y: y2 - boxHeight,
        width: CONTENT_WIDTH,
        height: boxHeight,
        borderColor: ORANGE,
        borderWidth: 1,
    });
    let condY = y2 - boxPadding - 2;
    page2.drawText('An overview of the conditions.', {
        x: MARGIN_LEFT + 10,
        y: condY,
        size: 10,
        font: helveticaBold,
        color: INK,
    });
    condY -= introHeight;
    for (const lines of conditionLines) {
        lines.forEach((line, i) => {
            const prefix = i === 0 ? '\u2022 ' : '  ';
            page2.drawText(`${prefix}${line}`, {
                x: MARGIN_LEFT + 10,
                y: condY,
                size: bulletFontSize,
                font: helvetica,
                color: INK,
            });
            condY -= 13;
        });
    }
    y2 = y2 - boxHeight - 40;

    // Signature block
    page2.drawText('Name main tenant:', { x: MARGIN_LEFT, y: y2, size: 10, font: helveticaBold, color: INK });
    page2.drawText(`${mt.firstName || ''} ${mt.surname || ''}`.trim() || '\u2014', {
        x: MARGIN_LEFT + 120,
        y: y2,
        size: 10,
        font: helvetica,
        color: INK,
    });
    y2 -= 18;

    page2.drawText('Place & Date:', { x: MARGIN_LEFT, y: y2, size: 10, font: helveticaBold, color: INK });
    const placeDate = signaturePngBytes
        ? [signedPlace || 'Amsterdam', fmtDate(signedDate || new Date())].filter(Boolean).join(', ')
        : '\u2014';
    page2.drawText(placeDate, { x: MARGIN_LEFT + 120, y: y2, size: 10, font: helvetica, color: INK });
    y2 -= 18;

    page2.drawText('Signature:', { x: MARGIN_LEFT, y: y2, size: 10, font: helveticaBold, color: INK });
    y2 -= 8;

    const sigBoxWidth = 180;
    const sigBoxHeight = 70;
    page2.drawRectangle({
        x: MARGIN_LEFT,
        y: y2 - sigBoxHeight,
        width: sigBoxWidth,
        height: sigBoxHeight,
        borderColor: LIGHT_GREY,
        borderWidth: 1,
    });

    if (signaturePngBytes) {
        try {
            const sigImage = await pdfDoc.embedPng(signaturePngBytes);
            const pad = 8;
            const maxW = sigBoxWidth - pad * 2;
            const maxH = sigBoxHeight - pad * 2;
            const scale = Math.min(maxW / sigImage.width, maxH / sigImage.height, 1);
            const w = sigImage.width * scale;
            const h = sigImage.height * scale;
            page2.drawImage(sigImage, {
                x: MARGIN_LEFT + (sigBoxWidth - w) / 2,
                y: y2 - sigBoxHeight + (sigBoxHeight - h) / 2,
                width: w,
                height: h,
            });
        } catch (sigErr) {
            console.error('[loi-pdf] signature embed failed, leaving box blank:', sigErr);
        }
    }

    // Footer
    page2.drawText('CONTRACTOR', {
        x: (PAGE_WIDTH - helveticaBold.widthOfTextAtSize('CONTRACTOR', 10)) / 2,
        y: 96,
        size: 10,
        font: helveticaBold,
        color: TEAL,
    });
    drawFooter(page2, helvetica, 76);

    return pdfDoc.save();
}
