// Gmail API client using Google Workspace domain-wide delegation.
//
// Uses a dedicated Gmail service account (GMAIL_SERVICE_ACCOUNT_EMAIL +
// GMAIL_PRIVATE_KEY) separate from the SEO integrations' service account
// (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY — see
// src/lib/seo/googleAuth.js). Falling back to the SEO credentials keeps older
// deployments working while the dedicated SA is being rolled out.
//
// To create drafts in a @apartmenthub.nl mailbox the service account must be
// granted domain-wide delegation in the Google Workspace Admin Console for
// the scope https://www.googleapis.com/auth/gmail.compose.
//
// Each call to createGmailClient(userEmail) returns a gmail v1 client that
// impersonates the given @apartmenthub.nl user. The caller passes the logged-in
// agent's crm_users.email — drafts land in THAT agent's Gmail Drafts folder.

import { google } from 'googleapis';

const SCOPE = 'https://www.googleapis.com/auth/gmail.compose';

export function createGmailClient(userEmail) {
    const clientEmail = process.env.GMAIL_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GMAIL_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKeyRaw) {
        throw new Error(
            'Missing GMAIL_SERVICE_ACCOUNT_EMAIL or GMAIL_PRIVATE_KEY env vars. ' +
                'Gmail delegation requires a dedicated service account (separate ' +
                'from SEO). Grant domain-wide delegation for the gmail.compose ' +
                'scope in the Google Workspace Admin Console. Falls back to ' +
                'GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY if set.'
        );
    }
    if (!userEmail) {
        throw new Error('createGmailClient requires the target user email (crm_users.email).');
    }

    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    // JWT with `subject` = the user to impersonate. This is the domain-wide
    // delegation flow: the service account must be authorized in the Workspace
    // Admin Console to impersonate users in the @apartmenthub.nl domain.
    const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey,
        scopes: [SCOPE],
        subject: userEmail,
    });

    return google.gmail({ version: 'v1', auth });
}

// Build a Gmail draft message (RFC 2822) and return it as base64url-encoded
// string — the format the Gmail API's drafts.create expects for `raw`.
//
// `to` may be a single address string or an array. `cc`/`bcc` likewise.
// `html` is the HTML body. The Content-Type header is text/html; charset=utf-8.
export function buildDraftRaw({ to, cc, bcc, subject, html }) {
    const toList = Array.isArray(to) ? to.join(', ') : to;
    const ccList = Array.isArray(cc) ? cc.join(', ') : cc;
    const bccList = Array.isArray(bcc) ? bcc.join(', ') : bcc;

    const headers = [
        toList ? `To: ${toList}` : null,
        ccList ? `Cc: ${ccList}` : null,
        bccList ? `Bcc: ${bccList}` : null,
        subject ? `Subject: ${subject}` : null,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
    ].filter(Boolean);

    const rfc2822 = `${headers.join('\r\n')}\r\n\r\n${html}`;
    return Buffer.from(rfc2822, 'utf8').toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Create a draft in the impersonated user's Gmail. Returns { id, threadId }.
export async function createDraft(userEmail, { to, cc, bcc, subject, html }) {
    const gmail = createGmailClient(userEmail);
    const raw = buildDraftRaw({ to, cc, bcc, subject, html });
    const { data } = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: { message: { raw } },
    });
    return { id: data.id, threadId: data.threadId };
}

// Build a Gmail draft message (RFC 2822) as base64url, with the HTML body
// and one or more file attachments encoded as a multipart/mixed message.
// Each attachment is { filename, contentType, content: Buffer | ArrayBuffer }.
export function buildDraftRawWithAttachments({ to, cc, bcc, subject, html, attachments }) {
    const toList = Array.isArray(to) ? to.join(', ') : to;
    const ccList = Array.isArray(cc) ? cc.join(', ') : cc;
    const bccList = Array.isArray(bcc) ? bcc.join(', ') : bcc;

    const boundary = 'ahub_' + Math.random().toString(36).slice(2) + Date.now().toString(36);

    const headers = [
        toList ? `To: ${toList}` : null,
        ccList ? `Cc: ${ccList}` : null,
        bccList ? `Bcc: ${bccList}` : null,
        subject ? `Subject: ${subject}` : null,
        'MIME-Version: 1.0',
        `Content-Type: multipart/mixed; boundary="${boundary}"`,
    ].filter(Boolean);

    const parts = [`\r\n--${boundary}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${html}`];

    for (const att of (attachments || [])) {
        const buf = Buffer.isBuffer(att.content) ? att.content : Buffer.from(att.content);
        const b64 = buf.toString('base64');
        const filename = att.filename || 'attachment';
        const contentType = att.contentType || 'application/octet-stream';
        parts.push(
            `\r\n--${boundary}\r\n`
            + `Content-Type: ${contentType}; name="${filename}"\r\n`
            + `Content-Transfer-Encoding: base64\r\n`
            + `Content-Disposition: attachment; filename="${filename}"\r\n\r\n`
            + b64
        );
    }

    parts.push(`\r\n--${boundary}--\r\n`);

    const rfc2822 = `${headers.join('\r\n')}\r\n${parts.join('')}`;
    return Buffer.from(rfc2822, 'utf8').toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

// Create a draft with file attachments in the impersonated user's Gmail.
// `attachments` is an array of { filename, contentType, content: Buffer | ArrayBuffer }.
// Returns { id, threadId }.
export async function createDraftWithAttachments(userEmail, { to, cc, bcc, subject, html, attachments }) {
    const gmail = createGmailClient(userEmail);
    const raw = buildDraftRawWithAttachments({ to, cc, bcc, subject, html, attachments });
    const { data } = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: { message: { raw } },
    });
    return { id: data.id, threadId: data.threadId };
}