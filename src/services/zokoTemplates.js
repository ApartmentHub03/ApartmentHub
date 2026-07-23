// ApartmentHub WhatsApp template catalog — single source of truth.
//
// Every entry below was reconciled against the LIVE Zoko account
// (GET https://chat.zoko.io/v2/account/templates) on 2026-06-29, so zokoId,
// type, language and variableCount are the real values Zoko expects. Ordered by
// the candidate journey (see ApartmentHub-WhatsApp-Templates.xlsx).
//
// Field meaning:
//   zokoId        - the EXACT templateId registered in Zoko (null = no live match).
//   variableCount - real number of {{n}} placeholders in the live template.
//   type          - Zoko send type: 'buttonTemplate' for templates with buttons,
//                   'richTemplate' for plain/media templates.
//   rich          - true when the template has a media header (first variable is
//                   typically a media URL).
//   verified      - true when zokoId is confirmed live and safe to send.
//   vars          - human-readable label for each {{n}} placeholder, in order
//                   (vars[0] = {{1}}). Derived from the live template bodies so
//                   the CRM "Send WhatsApp" form can show what each field is
//                   instead of a bare "Variable {{1}}".

export const ZOKO_TEMPLATES = {
    // --- Onboarding / invites (live) ---
    co_tenant_invite: { zokoId: 'co_tenant_invite', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: 'Onboarding', label: 'Co-tenant invite', vars: ['Co-tenant name', 'Invited by (main tenant)', 'Join link'] },
    guarantor_invite: { zokoId: 'guarantor_invite', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: 'Onboarding', label: 'Guarantor invite', vars: ['Guarantor name', 'Invited by (main tenant)', 'Join link'] },
    you_can_now_start_applying_to_apartments: { zokoId: 'you_can_now_start_applying_to_apartments', language: 'en', variableCount: 2, type: 'buttonTemplate', verified: true, stage: 'Onboarding', label: 'You can now start applying', vars: ['Tenant name', 'Start-applying link'] },

    // --- 1. Listing sent ---
    sales_force_send_apartment_pdf: { zokoId: 'sales_force_send_apartment_pdf', language: 'en', variableCount: 10, type: 'buttonTemplate', rich: true, verified: true, stage: '1. Listing sent', timing: 'On send', label: 'Send out apartment (PDF)', vars: ['Brochure PDF URL', 'Candidate name', 'Address', 'Price (€/month)', 'Bedrooms', 'Square meters', 'Additional note', 'Booking link', '"I have questions" link', 'Unsubscribe link'] },
    pdf_apartment_utility: { zokoId: 'pdf_apartment_utility', language: 'en', variableCount: 11, type: 'buttonTemplate', rich: true, verified: true, stage: '1. Listing sent', timing: 'Segment broadcast', label: 'Apartment PDF (segment broadcast)', vars: ['Brochure PDF URL', 'Candidate name', 'Address', 'Price (€/month)', 'Bedrooms', 'Square meters', 'Additional note', 'In-person viewing link', 'Facetime viewing link', '"I have questions" link', 'Unsubscribe link'] },

    // --- 2. Booking ---
    // NOTE: the live Zoko template's "Upload documents" button is a dynamic
    // URL button whose {{5}} value is the FULL upload URL (e.g.
    // https://www.apartmenthub.nl/aanvraag?apartment=<id>), matching the
    // new_flow_upload_documents pattern where the button var is the entire
    // URL set at send time. The resulting button URL is handled natively by
    // the existing /aanvraag?apartment= query-param route. Re-approval in
    // Meta is required to add the variable; until that lands, the send site
    // guards the 5th arg on tpl.variableCount >= 5 so a 4-variable template
    // still receives a safe 4-arg payload.
    booking_confirmed_sales_force: { zokoId: 'booking_confirmed_sales_force', language: 'en', variableCount: 5, type: 'buttonTemplate', verified: true, stage: '2. Booking', timing: 'Right after booking', label: 'Booking confirmed', vars: ['Candidate name', 'Apartment address', 'Viewing date', 'Viewing time', 'Upload documents button URL (full URL)'] },

    // --- 3. Before viewing ---
    sales_force_booking_reminder_2_hours_in_person_viewing: { zokoId: 'sales_force_booking_reminder_2_hours_in_person_viewing', language: 'en', variableCount: 6, type: 'buttonTemplate', verified: true, stage: '3. Before viewing', timing: '2 hours before', label: 'Reminder 2h — in-person', vars: ['Candidate name', 'Apartment address', 'Agent name', 'Agent contact', 'Facetime viewing link', 'Cancel viewing link'] },
    sales_force_booking_reminder_2_hours_in_facetime_viewing: { zokoId: 'sales_force_booking_reminder_2_hours_in_facetime_viewing', language: 'en', variableCount: 5, type: 'buttonTemplate', verified: true, stage: '3. Before viewing', timing: '2 hours before', label: 'Reminder 2h — facetime', vars: ['Candidate name', 'Apartment address', 'Agent name', 'Agent contact', 'Cancel viewing link'] },
    // Pre-viewing document nudge — verified live in Zoko (fetched 2026-07-18).
    // Button {{2}} points to the static upload page; no per-tenant magic link.
    new_flow_upload_documents: { zokoId: 'new_flow_upload_documents', language: 'en', variableCount: 2, type: 'buttonTemplate', verified: true, stage: '3. Before viewing', timing: '24h before', label: 'Upload documents before viewing', vars: ['Candidate name', 'Upload documents button URL'] },

    // --- 4. Cancel / reschedule ---
    viewing_canceled: { zokoId: 'sales_force_viewing_canceled_by_apartmenthub', language: 'en', variableCount: 4, type: 'buttonTemplate', verified: true, stage: '4. Cancel / reschedule', timing: 'On cancel', label: 'Viewing canceled', vars: ['Candidate name', 'Apartment address', 'Viewing date', '"I have questions" link'] },
    reschedule_viewing: { zokoId: 'sales_force_reschedule_viewing', language: 'en', variableCount: 6, type: 'buttonTemplate', verified: true, stage: '4. Cancel / reschedule', timing: 'On reschedule', label: 'Reschedule viewing', vars: ['Candidate name', 'Apartment address', 'New viewing date', 'New viewing time', 'Cancel viewing link', '"I have questions" link'] },

    // --- 5. After viewing ---
    sales_force_asking_for_offer_1: { zokoId: 'sales_force_asking_for_offer_1', language: 'en', variableCount: 2, type: 'buttonTemplate', verified: true, stage: '5. After viewing', timing: '15 min after viewing', label: 'Ask for offer', vars: ['Candidate name', 'Apartment address'] },
    forgot_to_finish_application_notification_salesforce_: { zokoId: 'forgot_to_finish_application_notification_salesforce_', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '5. After viewing', timing: 'A few hours later', label: "Didn't finish application", vars: ['Candidate name', 'Apartment address', '"I have questions" link'] },

    // --- 6. Document reminders ---
    reminder_documents_after_viewing_4h: { zokoId: 'sales_force_reminder_documents_after_viewing_4_hours', language: 'en', variableCount: 2, type: 'buttonTemplate', verified: true, stage: '6. Document reminders', timing: '4h after viewing', label: 'Doc reminder 4h', vars: ['Candidate name', 'Apartment address'] },
    reminder_documents_after_viewing_24h: { zokoId: 'sales_force_reminder_documents_after_viewing_24_hours', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '6. Document reminders', timing: '17h after viewing', label: 'Doc reminder 17h', vars: ['Candidate name', 'Missing documents', 'Apartment address'] },
    reminder_documents_after_viewing_40h: { zokoId: 'sales_force_reminder_documents_after_viewing_40_hours', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '6. Document reminders', timing: '40h after viewing', label: 'Doc reminder 40h (final)', vars: ['Candidate name', 'Apartment address', 'Missing documents'] },

    // --- 7. Offer received ---
    thank_you_for_making_the_offer: { zokoId: 'sales_force_thank_you_for_making_the_offer_', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '7. Offer received', timing: 'Right after offer', label: 'Thank you for the offer', vars: ['Candidate name', 'Apartment address', '"I have questions" link'] },

    // --- 8. Decision — declined ---
    sales_force_offer_declined: { zokoId: 'sales_force_offer_declined', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '8. Declined', timing: 'On decline', label: 'Offer declined', vars: ['Candidate name', 'Apartment address', '"I have questions" link'] },
    offer_declined_with_opportunity: { zokoId: 'sales_force_offer_declined_with_opportunity', language: 'en', variableCount: 7, type: 'buttonTemplate', rich: true, verified: true, stage: '8. Declined', timing: 'On decline (with new match)', label: 'Declined with opportunity', vars: ['Brochure PDF URL', 'Candidate name', 'Declined apartment address', 'New apartment address', 'In-person viewing link', 'Video viewing link', '"I have questions" link'] },

    // --- 9. Deal won ---
    deal_won: { zokoId: 'deal', language: 'en', variableCount: 2, type: 'richTemplate', verified: true, stage: '9. Deal won', timing: 'On deal', label: 'Deal won 🎉', vars: ['Candidate name', 'Apartment address'] },

    // --- Auth ---
    otp_verification: { zokoId: 'otp_verification', language: 'en_US', variableCount: 2, type: 'buttonTemplate', verified: true, stage: 'Auth', timing: 'On request', label: 'OTP verification', vars: ['Verification code', 'Copy-code button value'] },
};

// Templates still needing a live Zoko match before they can be sent.
export function unverifiedTemplates() {
    return Object.entries(ZOKO_TEMPLATES)
        .filter(([, t]) => !t.verified)
        .map(([key, t]) => ({ key, label: t.label, stage: t.stage }));
}
