/**
 * Backfill script: Populate the `leads` table from existing source tables.
 *
 * Run with: node scripts/backfill-leads.js
 *
 * Requires environment variables:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SERVICE_ROLE)
 *
 * This script is idempotent — it skips rows that already exist in `leads`
 * by checking the UNIQUE(source_type, source_id) constraint.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

if (!url || !key) {
  console.error(
    "Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables"
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extractFirstName(fullName) {
  if (!fullName) return null;
  return fullName.trim().split(/\s+/)[0] || null;
}

function extractLastName(fullName) {
  if (!fullName) return null;
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return "";
  return parts.slice(1).join(" ");
}

async function backfillSource(sourceType, query, mapper) {
  console.log(`\n--- Backfilling ${sourceType} ---`);
  let page = 0;
  const pageSize = 500;
  let totalInserted = 0;
  let totalSkipped = 0;

  while (true) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await query.range(from, to);

    if (error) {
      console.error(`  Error fetching ${sourceType}:`, error.message);
      break;
    }

    if (!data || data.length === 0) {
      console.log(`  No more rows in ${sourceType}.`);
      break;
    }

    for (const row of data) {
      const lead = mapper(row);

      // Check if already exists
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("source_type", sourceType)
        .eq("source_id", row.id)
        .maybeSingle();

      if (existing) {
        totalSkipped++;
        continue;
      }

      const { error: insertError } = await supabase.from("leads").insert(lead);

      if (insertError) {
        if (insertError.code === "23505") {
          totalSkipped++;
        } else {
          console.error(
            `  Error inserting lead ${row.id}:`,
            insertError.message
          );
        }
      } else {
        totalInserted++;
      }
    }

    console.log(
      `  Page ${page + 1}: ${data.length} rows processed, ${totalInserted} inserted, ${totalSkipped} skipped`
    );

    if (data.length < pageSize) break;
    page++;
  }

  console.log(
    `  ${sourceType} done: ${totalInserted} inserted, ${totalSkipped} skipped`
  );
}

async function main() {
  console.log("Starting leads backfill...\n");

  // meta_leads
  await backfillSource(
    "meta_leads",
    supabase
      .from("meta_leads")
      .select("id, full_name, email, phone, created_at"),
    (row) => ({
      type: "meta_ads",
      source_type: "meta_leads",
      source_id: row.id,
      first_name: extractFirstName(row.full_name),
      last_name: extractLastName(row.full_name),
      email: row.email,
      phone: row.phone,
    })
  );

  // koop_leads
  await backfillSource(
    "koop_leads",
    supabase
      .from("koop_leads")
      .select("id, first_name, last_name, email, phone, city, created_at"),
    (row) => ({
      type: "buyer_intake",
      source_type: "koop_leads",
      source_id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      city: row.city,
    })
  );

  // valuation_leads
  await backfillSource(
    "valuation_leads",
    supabase
      .from("valuation_leads")
      .select(
        "id, first_name, last_name, email, phone, address, postcode, city, neighborhood, created_at"
      ),
    (row) => ({
      type: "valuation",
      source_type: "valuation_leads",
      source_id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      address: row.address,
      postcode: row.postcode,
      city: row.city,
      neighborhood: row.neighborhood,
    })
  );

  // rental_leads
  await backfillSource(
    "rental_leads",
    supabase
      .from("rental_leads")
      .select("id, full_name, email, phone, address, postal_code, created_at"),
    (row) => ({
      type: "rental",
      source_type: "rental_leads",
      source_id: row.id,
      first_name: extractFirstName(row.full_name),
      last_name: extractLastName(row.full_name),
      email: row.email,
      phone: row.phone,
      address: row.address,
      postcode: row.postal_code,
    })
  );

  // verkoop_leads
  await backfillSource(
    "verkoop_leads",
    supabase
      .from("verkoop_leads")
      .select("id, naam, email, telefoon, adres, created_at"),
    (row) => ({
      type: "sale",
      source_type: "verkoop_leads",
      source_id: row.id,
      first_name: extractFirstName(row.naam),
      last_name: extractLastName(row.naam),
      email: row.email,
      phone: row.telefoon,
      address: row.adres,
    })
  );

  console.log("\nBackfill complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});