import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { uploadFile, BUCKET } from "@/app/lib/storage";
import {
  extractSingleDocument,
  formatExtractForSynthesis,
  type DocExtract,
} from "@/app/lib/extract-doc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

const MODEL = process.env.VERKOOP_MODEL || "claude-sonnet-4-6";

// Cap parallelism so we don't blow the Anthropic per-minute token budget on
// a freshly-uploaded big dossier.
const PARALLEL_EXTRACTS = 4;

function buildSystemPrompt(sellerLang: "nl" | "en"): string {
  const sellerLangName = sellerLang === "nl" ? "Dutch" : "English";
  return `You are a senior real estate analyst at ApartmentHub, a Dutch agency that brokers apartment sales in Amsterdam. You read per-document fact extracts (already produced by an earlier pass) and produce TWO outputs in one shot:
  (1) a staff-facing dossier briefing in English (for David and the agency team)
  (2) seller-facing follow-up questions in ${sellerLangName} (the language of the seller's portal — they answer these next time they open /verkoop or /sell)

Output JSON only. No prose, no code fences. Schema:

{
  "summary":  string[],   // 6-15 short bullets in English. Facts only, supported by the extracts. Cover: property identity, VvE health (reserve fund, MJOP, monthly contribution), known defects, renovation history, leasehold/erfpacht status, anything that affects sale price.
  "flags":    string[],   // English. Risks the agent should know about. E.g. "MJOP expired in 2022", "Reserve fund below MJOP recommendation", "Asbestos inventory missing for a 1968 building", "Foundation concerns noted in ALV minutes".
  "gaps":     string[],   // English. Documents or facts you couldn't find. E.g. "No KvK extract for the VvE", "No recent meter readings".
  "next_actions": string[],   // Up to 5 concrete next steps for the AGENT, in English.
  "seller_questions": [    // Up to 10 yes/no follow-up questions FOR THE SELLER, in ${sellerLangName}. Only ask about things the seller can answer themselves (no external data, no public registers). Address gaps not already covered by the 16 standard portal questions (defects, leaks, VvE arrears, neighbours, renovations, permits, structural changes). Skip if no useful questions remain.
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
- Be honest about what you can't determine. Empty arrays are fine.
- Limits: 15 summary, 8 flags, 8 gaps, 5 next_actions, 10 seller_questions.`;
}

type FileRow = {
  id: string;
  doc_key: string;
  filename: string;
  mime_type: string | null;
  blob_url: string;
  ai_extract: DocExtract | null;
  ai_extract_status: "pending" | "done" | "failed" | "skipped" | null;
};

// Run extractSingleDocument for a list of files with bounded concurrency.
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

export async function POST(_req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
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
    .eq("id", dossierId)
    .maybeSingle();
  if (!d) return NextResponse.json({ error: "not_found" }, { status: 404 });

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

  // Phase 1: backfill any missing extracts in parallel. Files uploaded before
  // this feature shipped — or with a prior "failed"/"pending" status — get
  // re-extracted now. Files that ran cleanly before are reused as-is.
  const needsExtraction = files.filter((f) => {
    if (f.ai_extract_status === "done" && f.ai_extract) return false;
    if (f.ai_extract_status === "skipped") return false; // unsupported mime
    const mime = f.mime_type || "";
    return mime === "application/pdf" || mime.startsWith("image/");
  });
  if (needsExtraction.length > 0) {
    await extractMany(needsExtraction);
    // Refresh state after extraction
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

  // Phase 2: build the text-only synthesis context.
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
      skipped.push(`${f.filename} (${f.mime_type || "unknown"} not supported by AI)`);
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
      max_tokens: 3500,
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

  const safe = {
    summary: Array.isArray(parsed.summary) ? parsed.summary.slice(0, 15) : [],
    flags: Array.isArray(parsed.flags) ? parsed.flags.slice(0, 8) : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 8) : [],
    next_actions: Array.isArray(parsed.next_actions)
      ? parsed.next_actions.slice(0, 5)
      : [],
    seller_questions: Array.isArray(parsed.seller_questions)
      ? parsed.seller_questions
          .slice(0, 10)
          .filter((q) => q && typeof q.id === "string" && typeof q.question === "string")
          .map((q) => ({
            id: q.id.replace(/[^A-Za-z0-9_]+/g, "_").slice(0, 60),
            question: String(q.question).slice(0, 240),
            if_yes: q.if_yes ? String(q.if_yes).slice(0, 240) : null,
          }))
      : [],
  };

  // Save full context file to storage. Canonical reference for any future AI
  // call that needs to know what we've already concluded.
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
    actor: `staff:${staff.phone_e164}`,
    action: "ai_analysed",
    meta: {
      model: MODEL,
      files_in: usable.length,
      files_skipped: skipped.length,
      extracts_backfilled: needsExtraction.length,
      summary_count: safe.summary.length,
    },
  });

  return NextResponse.json({
    ok: true,
    analysed_at: new Date().toISOString(),
    files_in: usable.length,
    files_skipped: skipped,
    extracts_backfilled: needsExtraction.length,
    ...safe,
  });
}
