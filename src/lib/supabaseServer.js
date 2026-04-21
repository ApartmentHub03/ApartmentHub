import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client using the service role key.
// NEVER import this from client components - it bypasses RLS.
// Only use inside API routes (src/app/api/**) or server components.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let serverClient = null;

export function getSupabaseServer() {
    if (serverClient) return serverClient;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('[supabaseServer] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY - server client disabled');
        return null;
    }

    serverClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    return serverClient;
}
