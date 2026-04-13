// Shared Google Auth for GA4 and Google Search Console
// Uses a single service account — set env vars:
//   GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY
// The private key should have literal \n that we replace with newlines.

/**
 * Returns Google service account credentials usable by google-auth-library
 * and @google-analytics/data.
 */
export function getGoogleCredentials() {
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKeyRaw) {
        throw new Error(
            'Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY env vars. ' +
                'See scripts/setup-gcp-auth.md for setup instructions.'
        );
    }

    // Env vars typically store newlines as literal \n - convert back
    const privateKey = privateKeyRaw.replace(/\\n/g, '\n');

    return {
        client_email: clientEmail,
        private_key: privateKey,
    };
}
