import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getSession } from "@/app/lib/auth";
import { uploadFile, BUCKET } from "@/app/lib/storage";
import {
  extractSingleDocument,
  formatExtractForSynthesis,
  type DocExtract,
} from "@/app/lib/extract-doc";

// Seller-triggered analyse. Differs from the staff route in three ways:
//   1. Auth is the seller's session (cookie), not getStaffUser()
//   2. We resolve the dossier from session.phone_e164 — no [id] path param
//   3. The prompt no longer references the "16 standard portal questions"
//      because the seller portal step 4 is now 100% AI-generated.
//
// The synthesis writes seller_questions to verkoop_dossiers.ai_followup_questions;
// the portal renders them in step 4 via renderAiQuestions().

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Haiku 4.5 by default — the synthesis input is already pre-digested
// per-doc extracts (text only, no PDFs), and the output is a small JSON
// object. Sonnet's extra reasoning isn't earning its ~25-30s latency cost
// here. VERKOOP_ANALYSE_MODEL lets us override per-environment without
// touching VERKOOP_MODEL (which other routes also read).
const MODEL =
  process.env.VERKOOP_ANALYSE_MODEL ||
  process.env.VERKOOP_MODEL ||
  "claude-haiku-4-5";
const PARALLEL_EXTRACTS = 4;

function buildSystemPrompt(sellerLang: "nl" | "en"): string {
  const sellerLangName = sellerLang === "nl" ? "Dutch" : "English";
  return `You are a senior real estate analyst at ApartmentHub, a Dutch agency that brokers apartment sales in Amsterdam. You read per-document fact extracts (already produced by an earlier pass) and produce TWO outputs in one shot:
  (1) a staff-facing dossier briefing in English (for David and the agency team)
  (2) seller-facing follow-up questions in ${sellerLangName} (the language of the seller's portal — they answer these next time they open /sell)

Output JSON only. No prose, no code fences. Schema:

{
  "summary":  string[],   // 6-15 short bullets in English. Facts only, supported by the extracts. Cover: property identity, VvE health (reserve fund, MJOP, monthly contribution), known defects, renovation history, leasehold/erfpacht status, anything that affects sale price.
  "flags":    string[],   // English. Risks the agent should know about.
  "gaps":     string[],   // English. Documents or facts you couldn't find.
  "next_actions": string[],   // Up to 5 concrete next steps for the AGENT, in English.
  "seller_questions": [    // Up to 15 yes/no follow-up questions FOR THE SELLER, in ${sellerLangName}. THESE ARE THE ONLY QUESTIONS THE SELLER WILL SEE — the portal no longer has a fixed question pool. So be thorough: cover defects, leaks, VvE health/arrears, neighbours, renovations, permits, structural changes, anything ambiguous in the documents, AND fill the gaps you list above. Only ask about things the seller can answer themselves (no external data, no public registers).
    {
      "id": string,         // short stable slug e.g. "qs_ai_leak_history"
      "question": string,   // one-sentence yes/no question in ${sellerLangName}
      "if_yes": string|null // optional follow-up prompt in ${sellerLangName}, or null
    }
  ]
}

Rules:
- Cite documents by short name when stating a fact (e.g. "MJOP runs through 2031").
- Numbers in euros: plain integers, no separators or currency symbol.
- Dates: ISO YYYY-MM-DD where possible.
- If an extract is marked unreadable or is missing, list the document under gaps.
- Seller questions must be answerable by the seller alone. Don't ask about public-register data the agent fetches (BAG, WOZ, Kadaster, EP-online).
- Seller questions in ${sellerLangName} ONLY. Never mix languages.
- IMPORTANT: seller_questions must NEVER be empty. Even a perfect dossier
  has open seller-only items (lived-in defects, neighbour issues, recent
  changes not yet in any document). Always return at least 6 questions.
- When extracts are sparse, mismatched, or the seller uploaded documents
  that don't look like the requested housing files (e.g. random PDFs,
  receipts, screenshots), ASK the foundational baseline questions a Dutch
  apartment-sale dossier always needs: known defects/leaks, VvE arrears,
  any structural renovations, permit history for renovations, monthly
  VvE contribution, foundation/erfpacht status. The seller's blank state
  is a signal to ask MORE, not less.
- Limits: 15 summary, 8 flags, 8 gaps, 5 next_actions, 15 seller_questions
  (minimum 6).`;
}

// Deterministic safety net: if the AI returns no (or too few) seller
// questions despite a sparse / mismatched upload, we still owe the seller
// a usable step 4. These are the same foundational items the system
// prompt asks for, in both supported portal languages.
const BASELINE_QUESTIONS: Record<"nl" | "en", Array<{ id: string; question: string; if_yes: string | null }>> = {
  nl: [
    { id: "qs_ai_baseline_defects", question: "Zijn er bekende gebreken, lekkages of vochtproblemen in de woning of de algemene ruimtes?", if_yes: "Beschrijf kort wat er aan de hand is en sinds wanneer." },
    { id: "qs_ai_baseline_vve_arrears", question: "Heeft de VvE op dit moment betalingsachterstanden of openstaande facturen?", if_yes: "Welk bedrag staat open en waarvoor?" },
    { id: "qs_ai_baseline_renovations", question: "Zijn er de afgelopen 10 jaar grote of structurele verbouwingen uitgevoerd (muren verwijderd, badkamer/keuken/dak vervangen)?", if_yes: "Welke werkzaamheden en in welk jaar?" },
    { id: "qs_ai_baseline_permits", question: "Zijn voor die verbouwingen vergunningen aangevraagd waar dat nodig was?", if_yes: "Heb je een kopie van de vergunning?" },
    { id: "qs_ai_baseline_vve_fee", question: "Weet je de huidige maandelijkse VvE-bijdrage?", if_yes: "Wat is het bedrag per maand?" },
    { id: "qs_ai_baseline_foundation_leasehold", question: "Is er informatie bekend over de fundering of de erfpacht (canon, einddatum, recent funderingsonderzoek)?", if_yes: "Wat weet je hierover?" },
  ],
  en: [
    { id: "qs_ai_baseline_defects", question: "Are there any known defects, leaks, or damp issues in the apartment or common areas?", if_yes: "Briefly describe what is going on and since when." },
    { id: "qs_ai_baseline_vve_arrears", question: "Is the VvE currently behind on any payments or carrying unpaid invoices?", if_yes: "What amount is outstanding and what for?" },
    { id: "qs_ai_baseline_renovations", question: "Have there been any major or structural renovations in the last 10 years (walls removed, bathroom/kitchen/roof replaced)?", if_yes: "Which works and in what year?" },
    { id: "qs_ai_baseline_permits", question: "Were permits applied for where required for those renovations?", if_yes: "Do you have a copy of the permit?" },
    { id: "qs_ai_baseline_vve_fee", question: "Do you know the current monthly VvE contribution?", if_yes: "What is the amount per month?" },
    { id: "qs_ai_baseline_foundation_leasehold", question: "Is there information about the foundation or leasehold (erfpacht canon, end date, recent foundation survey)?", if_yes: "What do you know about it?" },
  ],
};

type FileRow = {
  id: string;
  doc_key: string;
  filename: string;
  mime_type: string | null;
  blob_url: string;
  ai_extract: DocExtract | null;
  ai_extract_status: "pending" | "done" | "failed" | "skipped" | null;
};

async function extractMany(files: FileRow[]): Promise<void> {
  const queue = [...files];
  const workers = Array.from({ length: Math.min(PARALLEL_EXTRACTS, queue.length) }, async () => {
    while (queue.length) {
      const f = queue.shift();
      if (!f) return;
      try {
        await extractSingleDocument({
          id: f.id,
          doc_key: f.doc_key,
          filename: f.filename,
          mime_type: f.mime_type,
          blob_url: f.blob_url,
        });
      } catch (err) {
        console.warn("[analyse] extract worker error", f.id, err);
      }
    }
  });
  await Promise.all(workers);
}

export async function POST(_req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const anthropicKey =
    process.env.VERKOOP_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return NextResponse.json({ error: "missing_api_key" }, { status: 500 });
  }

  const sb = supabaseAdmin();
  const { data: d } = await sb
    .from("verkoop_dossiers")
    .select("id, naam, straat, postcode, woonplaats, taal")
    .eq("phone_e164", session.phone_e164)
    .maybeSingle();
  if (!d) return NextResponse.json({ error: "no_dossier" }, { status: 404 });

  const { data: filesRaw, error: filesErr } = await sb
    .from("verkoop_files")
    .select(
      "id, doc_key, filename, mime_type, blob_url, ai_extract, ai_extract_status"
    )
    .eq("dossier_id", d.id)
    .eq("is_current", true)
    .order("uploaded_at", { ascending: true });

  if (filesErr) return NextResponse.json({ error: "db_error" }, { status: 500 });
  if (!filesRaw || filesRaw.length === 0) {
    return NextResponse.json({ error: "no_files" }, { status: 400 });
  }
  const files = filesRaw as FileRow[];

  // Phase 1: backfill missing per-doc extracts.
  const needsExtraction = files.filter((f) => {
    if (f.ai_extract_status === "done" && f.ai_extract) return false;
    if (f.ai_extract_status === "skipped") return false;
    const mime = f.mime_type || "";
    return mime === "application/pdf" || mime.startsWith("image/");
  });
  if (needsExtraction.length > 0) {
    await extractMany(needsExtraction);
    const { data: refreshed } = await sb
      .from("verkoop_files")
      .select(
        "id, doc_key, filename, mime_type, blob_url, ai_extract, ai_extract_status"
      )
      .in(
        "id",
        needsExtraction.map((f) => f.id)
      );
    if (refreshed) {
      const byId = new Map(refreshed.map((r) => [r.id, r as FileRow]));
      for (let i = 0; i < files.length; i++) {
        const updated = byId.get(files[i].id);
        if (updated) files[i] = updated;
      }
    }
  }

  // Phase 2: build the synthesis context from per-doc extracts.
  const usable: FileRow[] = [];
  const skipped: string[] = [];
  const extractBlocks: string[] = [];
  for (const f of files) {
    if (f.ai_extract_status === "done" && f.ai_extract) {
      usable.push(f);
      extractBlocks.push(formatExtractForSynthesis(f.ai_extract));
      continue;
    }
    if (f.ai_extract_status === "skipped") {
      skipped.push(`${f.filename} (${f.mime_type || "unknown"} — not supported by AI)`);
      continue;
    }
    skipped.push(`${f.filename} (extract ${f.ai_extract_status || "missing"})`);
  }

  if (usable.length === 0) {
    return NextResponse.json(
      {
        error: "no_analysable_files",
        detail:
          "No documents had usable AI extracts. All files were either unsupported formats or extraction failed.",
        skipped,
      },
      { status: 400 }
    );
  }

  const propertyContext = `Property: ${d.straat}, ${d.postcode}${
    d.woonplaats ? ` ${d.woonplaats}` : ""
  }
Seller: ${d.naam}
Language: ${(d.taal ?? "nl").toUpperCase()}

Documents analysed (${usable.length}):
${usable.map((x) => `- ${x.doc_key}: ${x.filename}`).join("\n")}${
    skipped.length ? `\n\nSkipped (not in synthesis):\n${skipped.map((s) => `- ${s}`).join("\n")}` : ""
  }

---

Per-document extracts follow. Synthesize the briefing and seller questions from these.

${extractBlocks.join("\n\n")}`;

  const client = new Anthropic({ apiKey: anthropicKey });

  type SellerQ = { id: string; question: string; if_yes?: string | null };
  let parsed: {
    summary?: string[];
    flags?: string[];
    gaps?: string[];
    next_actions?: string[];
    seller_questions?: SellerQ[];
  };
  const sellerLang = (d.taal === "en" ? "en" : "nl") as "nl" | "en";
  try {
    const msg = await client.messages.create({
      model: MODEL,
      // Tight cap — output is at most 15 short JSON questions + a summary,
      // not prose. Cutting from 4000 trims wall-clock time on Haiku.
      max_tokens: 2000,
      system: buildSystemPrompt(sellerLang),
      messages: [{ role: "user", content: propertyContext }],
    });
    const textBlock = msg.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    );
    if (!textBlock) throw new Error("no_text_response");
    const raw = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error("[analyse] Claude synthesis failed", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (/invalid x-api-key|authentication_error|401/.test(msg)) {
      return NextResponse.json({ error: "anthropic_auth", detail: msg }, { status: 502 });
    }
    return NextResponse.json({ error: "ai_failed", detail: msg }, { status: 502 });
  }

  const aiQuestions: SellerQ[] = Array.isArray(parsed.seller_questions)
    ? parsed.seller_questions
        .slice(0, 15)
        .filter((q) => q && typeof q.id === "string" && typeof q.question === "string")
        .map((q) => ({
          id: q.id.replace(/[^A-Za-z0-9_]+/g, "_").slice(0, 60),
          question: String(q.question).slice(0, 240),
          if_yes: q.if_yes ? String(q.if_yes).slice(0, 240) : null,
        }))
    : [];

  // Safety net: if the model returned nothing usable, fall back to the
  // baseline foundational set in the seller's language. Without this the
  // portal would show "documents cover all our questions" — which is
  // almost never true for a fresh upload of mismatched docs.
  const sellerQuestions = aiQuestions.length === 0 ? BASELINE_QUESTIONS[sellerLang] : aiQuestions;
  const usedBaseline = aiQuestions.length === 0;

  const safe = {
    summary: Array.isArray(parsed.summary) ? parsed.summary.slice(0, 15) : [],
    flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 8) : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 8) : [],
    next_actions: Array.isArray(parsed.next_actions)
      ? parsed.next_actions.slice(0, 5)
      : [],
    seller_questions: sellerQuestions,
  };

  const contextMd =
    `# AI Analysis — ${d.naam}\n\n` +
    `**Generated:** ${new Date().toISOString()}\n` +
    `**Model:** ${MODEL}\n` +
    `**Seller language:** ${sellerLang}\n` +
    `**Files included:** ${usable.length}\n` +
    `**Files skipped:** ${skipped.length}\n\n` +
    `## Summary\n\n${safe.summary.map((s) => `- ${s}`).join("\n")}\n\n` +
    `## Flags\n\n${safe.flags.length ? safe.flags.map((f) => `- ⚠️ ${f}`).join("\n") : "_None_"}\n\n` +
    `## Gaps\n\n${safe.gaps.length ? safe.gaps.map((g) => `- ${g}`).join("\n") : "_None_"}\n\n` +
    `## Next actions\n\n${safe.next_actions.length ? safe.next_actions.map((a) => `- [ ] ${a}`).join("\n") : "_None_"}\n\n` +
    `## Seller follow-up questions (${sellerLang})\n\n${safe.seller_questions.length ? safe.seller_questions.map((q) => `- **${q.id}** — ${q.question}${q.if_yes ? `\n  - if yes: ${q.if_yes}` : ""}`).join("\n") : "_None_"}\n`;

  const contextPath = `${d.id}/_ai/context.md`;
  try {
    await sb.storage.from(BUCKET).remove([contextPath]).catch(() => {});
    await uploadFile({
      path: contextPath,
      contents: Buffer.from(contextMd, "utf8"),
      contentType: "text/markdown",
    });
  } catch (err) {
    console.warn("[analyse] context-file upload failed (non-fatal)", err);
  }

  await sb
    .from("verkoop_dossiers")
    .update({
      ai_summary: safe.summary,
      ai_context_url: contextPath,
      ai_followup_questions: {
        flags: safe.flags,
        gaps: safe.gaps,
        next_actions: safe.next_actions,
        seller_questions: safe.seller_questions,
        generated_at: new Date().toISOString(),
        seller_lang: sellerLang,
      },
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", d.id);

  await sb.from("verkoop_audit").insert({
    dossier_id: d.id,
    actor: `seller:${session.phone_e164}`,
    action: "ai_analysed",
    meta: {
      model: MODEL,
      files_in: usable.length,
      files_skipped: skipped.length,
      extracts_backfilled: needsExtraction.length,
      summary_count: safe.summary.length,
      seller_questions_count: safe.seller_questions.length,
      used_baseline_questions: usedBaseline,
    },
  });

  return NextResponse.json({
    ok: true,
    analysed_at: new Date().toISOString(),
    files_in: usable.length,
    files_skipped: skipped,
    extracts_backfilled: needsExtraction.length,
    seller_questions: safe.seller_questions,
  });
}
