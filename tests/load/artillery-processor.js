/**
 * Artillery Custom Processor for ApartmentHub Load Tests
 *
 * Provides helper hooks that Artillery scenarios call via "processor":
 *   - generatePhoneNumber: random Dutch mobile number for auth tests
 *   - setSupabaseHeaders: attach anon-key + JSON content-type
 *   - logResponse: lightweight response logger for debugging
 */

'use strict';

// ---------------------------------------------------------------------------
// Phone number generator
// ---------------------------------------------------------------------------

function generatePhoneNumber(context, _events, done) {
    const suffix = String(Math.floor(Math.random() * 900000000) + 100000000);
    context.vars.phoneNumber = `+316${suffix}`;
    return done();
}

// ---------------------------------------------------------------------------
// Supabase header injection
// ---------------------------------------------------------------------------

function setSupabaseHeaders(requestParams, context, _ee, next) {
    const anonKey =
        context.vars.supabaseAnonKey ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        '';

    requestParams.headers = requestParams.headers || {};
    requestParams.headers['apikey'] = anonKey;
    requestParams.headers['Authorization'] = `Bearer ${anonKey}`;
    requestParams.headers['Content-Type'] = 'application/json';

    return next();
}

// ---------------------------------------------------------------------------
// Response logger (opt-in via afterResponse in YAML)
// ---------------------------------------------------------------------------

function logResponse(requestParams, response, context, _ee, next) {
    if (response.statusCode >= 400) {
        console.log(
            `[${response.statusCode}] ${requestParams.method} ${requestParams.url} — ${typeof response.body === 'string'
                ? response.body.slice(0, 200)
                : JSON.stringify(response.body).slice(0, 200)
            }`
        );
    }
    return next();
}

// ---------------------------------------------------------------------------
// Webhook payload builder
// ---------------------------------------------------------------------------

function buildWebhookPayload(context, _events, done) {
    context.vars.webhookPayload = JSON.stringify({
        eventType: 'load_test_ping',
        phoneNumber: context.vars.phoneNumber || '+31600000000',
        dossierId: 'load-test-dossier-' + Date.now(),
        loginTimestamp: new Date().toISOString(),
    });
    return done();
}

module.exports = {
    generatePhoneNumber,
    setSupabaseHeaders,
    logResponse,
    buildWebhookPayload,
};
