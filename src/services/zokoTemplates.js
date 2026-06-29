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

export const ZOKO_TEMPLATES = {
    // --- Onboarding / invites (live) ---
    co_tenant_invite: { zokoId: 'co_tenant_invite', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: 'Onboarding', label: 'Co-tenant invite' },
    guarantor_invite: { zokoId: 'guarantor_invite', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: 'Onboarding', label: 'Guarantor invite' },
    you_can_now_start_applying_to_apartments: { zokoId: 'you_can_now_start_applying_to_apartments', language: 'en', variableCount: 2, type: 'buttonTemplate', verified: true, stage: 'Onboarding', label: 'You can now start applying' },

    // --- 1. Listing sent ---
    sales_force_send_apartment_pdf: { zokoId: 'sales_force_send_apartment_pdf', language: 'en', variableCount: 10, type: 'buttonTemplate', rich: true, verified: true, stage: '1. Listing sent', timing: 'On send', label: 'Send out apartment (PDF)' },
    pdf_apartment_utility: { zokoId: 'pdf_apartment_utility', language: 'en', variableCount: 11, type: 'buttonTemplate', rich: true, verified: true, stage: '1. Listing sent', timing: 'Segment broadcast', label: 'Apartment PDF (segment broadcast)' },

    // --- 2. Booking ---
    booking_confirmed_sales_force: { zokoId: 'booking_confirmed_sales_force', language: 'en', variableCount: 4, type: 'buttonTemplate', verified: true, stage: '2. Booking', timing: 'Right after booking', label: 'Booking confirmed' },

    // --- 3. Before viewing ---
    sales_force_booking_reminder_2_hours_in_person_viewing: { zokoId: 'sales_force_booking_reminder_2_hours_in_person_viewing', language: 'en', variableCount: 6, type: 'buttonTemplate', verified: true, stage: '3. Before viewing', timing: '2 hours before', label: 'Reminder 2h — in-person' },
    sales_force_booking_reminder_2_hours_in_facetime_viewing: { zokoId: 'sales_force_booking_reminder_2_hours_in_facetime_viewing', language: 'en', variableCount: 5, type: 'buttonTemplate', verified: true, stage: '3. Before viewing', timing: '2 hours before', label: 'Reminder 2h — facetime' },
    // No live Zoko match for "Documents missing BEFORE viewing" — keep disabled.
    documents_missing_before_viewing: { zokoId: null, language: 'en', variableCount: 3, type: 'buttonTemplate', verified: false, stage: '3. Before viewing', timing: '24-48h before', label: 'Documents missing before viewing' },

    // --- 4. Cancel / reschedule ---
    viewing_canceled: { zokoId: 'sales_force_viewing_canceled_by_apartmenthub', language: 'en', variableCount: 4, type: 'buttonTemplate', verified: true, stage: '4. Cancel / reschedule', timing: 'On cancel', label: 'Viewing canceled' },
    reschedule_viewing: { zokoId: 'sales_force_reschedule_viewing', language: 'en', variableCount: 6, type: 'buttonTemplate', verified: true, stage: '4. Cancel / reschedule', timing: 'On reschedule', label: 'Reschedule viewing' },

    // --- 5. After viewing ---
    sales_force_asking_for_offer_1: { zokoId: 'sales_force_asking_for_offer_1', language: 'en', variableCount: 2, type: 'buttonTemplate', verified: true, stage: '5. After viewing', timing: '15 min after viewing', label: 'Ask for offer' },
    forgot_to_finish_application_notification_salesforce_: { zokoId: 'forgot_to_finish_application_notification_salesforce_', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '5. After viewing', timing: 'A few hours later', label: "Didn't finish application" },

    // --- 6. Document reminders ---
    reminder_documents_after_viewing_4h: { zokoId: 'sales_force_reminder_documents_after_viewing_4_hours', language: 'en', variableCount: 2, type: 'buttonTemplate', verified: true, stage: '6. Document reminders', timing: '4h after viewing', label: 'Doc reminder 4h' },
    reminder_documents_after_viewing_24h: { zokoId: 'sales_force_reminder_documents_after_viewing_24_hours', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '6. Document reminders', timing: '24h after viewing', label: 'Doc reminder 24h' },
    reminder_documents_after_viewing_40h: { zokoId: 'sales_force_reminder_documents_after_viewing_40_hours', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '6. Document reminders', timing: '40h after viewing', label: 'Doc reminder 40h (final)' },

    // --- 7. Offer received ---
    thank_you_for_making_the_offer: { zokoId: 'sales_force_thank_you_for_making_the_offer_', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '7. Offer received', timing: 'Right after offer', label: 'Thank you for the offer' },

    // --- 8. Decision — declined ---
    sales_force_offer_declined: { zokoId: 'sales_force_offer_declined', language: 'en', variableCount: 3, type: 'buttonTemplate', verified: true, stage: '8. Declined', timing: 'On decline', label: 'Offer declined' },
    offer_declined_with_opportunity: { zokoId: 'sales_force_offer_declined_with_opportunity', language: 'en', variableCount: 7, type: 'buttonTemplate', rich: true, verified: true, stage: '8. Declined', timing: 'On decline (with new match)', label: 'Declined with opportunity' },

    // --- 9. Deal won ---
    deal_won: { zokoId: 'deal', language: 'en', variableCount: 2, type: 'richTemplate', verified: true, stage: '9. Deal won', timing: 'On deal', label: 'Deal won 🎉' },

    // --- Auth ---
    otp_verification: { zokoId: 'otp_verification', language: 'en_US', variableCount: 2, type: 'buttonTemplate', verified: true, stage: 'Auth', timing: 'On request', label: 'OTP verification' },
};

// Templates still needing a live Zoko match before they can be sent.
export function unverifiedTemplates() {
    return Object.entries(ZOKO_TEMPLATES)
        .filter(([, t]) => !t.verified)
        .map(([key, t]) => ({ key, label: t.label, stage: t.stage }));
}
