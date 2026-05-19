import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only Supabase client using the service-role key for the verkoop
// (sell) project. NEVER import this from a client component.
//
// VERKOOP_SUPABASE_URL / VERKOOP_SUPABASE_SERVICE_ROLE point at the separate
// verkoop Supabase project (mbitwimooimhmsnfinsi). We fall back to
// SUPABASE_URL / SUPABASE_SERVICE_ROLE to remain compatible with the original
// verkoop env layout if both projects ever share env vars.

let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  // Prefer VERKOOP_* (separate verkoop Supabase project — mbitwimooimhmsnfinsi),
  // fall back to the main app's vars so a single-project deploy works too.
  const url = process.env.VERKOOP_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const serviceRole =
    process.env.VERKOOP_SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error(
      "VERKOOP_SUPABASE_URL and VERKOOP_SUPABASE_SERVICE_ROLE must be set " +
        "(or fall-back SUPABASE_URL + SUPABASE_SERVICE_ROLE[_KEY])."
    );
  }
  cached = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
