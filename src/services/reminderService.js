/**
 * Reminder Service
 * Sends a single webhook POST to n8n immediately after login/signup.
 * n8n handles the timing (5min, 1hr, 24hr) and checks document status
 * before sending each WhatsApp reminder.
 */

const REMINDER_WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/get-website-filled-status';

/**
 * Notify n8n that a user has logged in and may need document reminders.
 * n8n will schedule reminders at 5min, 1hr, and 24hr,
 * checking document completion status before each one.
 *
 * @param {string} phoneNumber - User's phone number (with country code)
 * @param {string} dossierId - User's dossier ID
 */
export const sendReminderRegistration = async (phoneNumber, dossierId) => {
    const payload = {
        eventType: 'document_reminder',
        phoneNumber,
        dossierId,
        loginTimestamp: new Date().toISOString(),
    };

    console.log('[Reminder] Sending reminder registration to n8n:', payload);

    try {
        const response = await fetch(REMINDER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            console.log('[Reminder] Successfully registered for reminders');
        } else {
            console.error(`[Reminder] Failed to register: HTTP ${response.status}`);
        }
    } catch (error) {
        console.error('[Reminder] Network error:', error);
    }
};
