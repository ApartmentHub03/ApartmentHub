/**
 * Analytics utility for GA4 (direct) + GTM event tracking
 * 
 * GA4 Measurement ID: G-GYERTDXNFC
 * GTM Container ID: GTM-KZBH8MVX
 * 
 * Events are sent to:
 * 1. GA4 directly via gtag()
 * 2. GTM dataLayer via push() - allowing GTM tags to fire on these events
 */

// Initialize dataLayer
window.dataLayer = window.dataLayer || [];

/**
 * Safe wrapper around gtag
 */
const safeGtag = (...args) => {
    if (typeof window.gtag === 'function') {
        window.gtag(...args);
    } else {
        // Fallback if gtag didn't load, push arguments to dataLayer manually
        // which effectively does the same thing for gtag.js
        window.dataLayer.push(arguments);
    }
};

/**
 * Track a custom event
 * Sends to both GA4 (direct) and GTM (dataLayer)
 */
export const trackEvent = (eventName, eventParams = {}) => {
    // 1. Send to GA4 directly
    safeGtag('event', eventName, eventParams);

    // 2. Push to GTM dataLayer for external tags (ads, pixels, etc.)
    window.dataLayer.push({
        event: eventName,
        ...eventParams
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
 */
export const trackPageView = (pagePath, pageTitle) => {
    safeGtag('config', 'G-GYERTDXNFC', {
        page_path: pagePath,
        page_title: pageTitle,
    });
};
