/**
 * KvK (Kamer van Koophandel) enrichment — looks up a VvE's KvK number
 * to discover their contact email, phone, and beheerder name.
 *
 * STUB: This module always returns null until the KvK API integration
 * is implemented. When KVK_API_KEY is available in env, implement the
 * following:
 *
 * 1. Call GET https://api.kvk.nl/api/v1/zoeken?kvkNummer=<nummer>
 *    with Authorization header using KVK_API_KEY.
 * 2. Parse the first result's contact details (email, phone, name).
 * 3. Follow the pattern from public-registers.ts:
 *    - fetchWithTimeout() with 4s timeout
 *    - Graceful null return on failure (never throw)
 *    - In-memory cache with 5-minute TTL for repeated lookups
 * 4. Merge results into ai_prefilled in both analyse routes after
 *    synthesis, when vve_kvk exists but vve_email/vve_telefoon are
 *    missing.
 *
 * See PLAN.md §2.2 for full spec.
 */
export type KvKEnrichment = {
  email?: string;
  phone?: string;
  name?: string;
};

export async function enrichFromKvK(
  _kvkNumber: string,
): Promise<KvKEnrichment | null> {
  // TODO: Implement KvK API call. Returns null until KVK_API_KEY is
  // configured. See PLAN.md §2.2 for the full spec and
  // src/app/lib/public-registers.ts for the fetchWithTimeout pattern.
  return null;
}