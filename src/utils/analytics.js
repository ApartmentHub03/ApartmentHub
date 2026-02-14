/**
 * Analytics utility for GA4 + GTM event tracking
 * 
 * All events are pushed to the GTM dataLayer.
 * GTM then forwards them to GA4 based on your container configuration.
 * 
 * GTM Container ID: Replace GTM-XXXXXXX in index.html with your actual container ID.
 * GA4 Measurement ID: Configure inside GTM (Tags → GA4 Configuration tag).
 */

// Initialize dataLayer if not present
window.dataLayer = window.dataLayer || [];

/**
 * Push a custom event to the GTM dataLayer
 */
export const trackEvent = (eventName, eventParams = {}) => {
    window.dataLayer.push({
        event: eventName,
        ...eventParams,
    });
};

// ─── Conversion Events ───────────────────────────────────

/**
 * Track WhatsApp click (outbound lead)
 * @param {string} location - Where the click happened (e.g., 'hero', 'floating_button', 'faq', 'mockup_section')
 */
export const trackWhatsAppClick = (location) => {
    trackEvent('whatsapp_click', {
        event_category: 'engagement',
        event_label: location,
        link_url: 'https://api.whatsapp.com/send/?phone=31658975449',
        conversion_type: 'lead',
    });
};

/**
 * Track contact form submission
 */
export const trackFormSubmit = (formName = 'contact_form') => {
    trackEvent('form_submit', {
        event_category: 'conversion',
        event_label: formName,
        conversion_type: 'lead',
    });
};

/**
 * Track phone click (if tel: links are added in the future)
 * @param {string} location - Where the click happened
 */
export const trackPhoneClick = (location) => {
    trackEvent('phone_click', {
        event_category: 'engagement',
        event_label: location,
        phone_number: '+31658975449',
        conversion_type: 'lead',
    });
};

/**
 * Track lead magnet / rental guide download
 */
export const trackLeadMagnetDownload = (fileName = 'Amsterdam_Rental_Guide_2024') => {
    trackEvent('lead_magnet_download', {
        event_category: 'conversion',
        event_label: fileName,
        conversion_type: 'lead',
    });
};

/**
 * Track email link click
 * @param {string} location - Where the click happened
 */
export const trackEmailClick = (location) => {
    trackEvent('email_click', {
        event_category: 'engagement',
        event_label: location,
        conversion_type: 'lead',
    });
};

/**
 * Track page view (for SPA navigation)
 * Called automatically if using GTM's History Change trigger,
 * but can also be called manually.
 */
export const trackPageView = (pagePath, pageTitle) => {
    trackEvent('page_view', {
        page_path: pagePath,
        page_title: pageTitle,
    });
};
