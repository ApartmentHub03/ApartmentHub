import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "./supabase-admin";
import { downloadFile } from "./storage";

// Per-doc extraction is a structured-output, single-PDF task — Haiku handles
// it at ~half the latency of Sonnet (8-10s vs 17-20s on the typical 100-160KB
// dossier PDF) with no measurable quality loss for the fact-extraction schema.
// Synthesis stays on Sonnet via VERKOOP_MODEL because it has to reason over
// many extracts at once. Override here via VERKOOP_EXTRACT_MODEL if needed.
const MODEL = process.env.VERKOOP_EXTRACT_MODEL || "claude-haiku-4-5";

// Same document map the analyse route uses; kept in sync deliberately so
// per-doc extracts read naturally when fed back to the synthesis prompt.
const DOC_DESCRIPTIONS: Record<string, string> = {
  leveringsakte: "Notarial deed of transfer (leveringsakte). Confirms ownership.",
  hypotheek: "Mortgage payoff statement / pro-forma calculation.",
  vergunningen: "Building / renovation permits (omgevingsvergunningen).",
  bouwtekeningen: "Construction or renovation drawings.",
  garanties: "Warranties for roof / boiler / kitchen / bathroom / solar.",
  "cv-onderhoud": "Boiler service contract and last service report.",
  zonnepanelen: "Solar panel invoice, warranty, inverter info.",
  splitsingsakte: "Notarial split deed defining the apartment right.",
  notulen: "Minutes of the VvE general meeting (ALV).",
  jaarrekening: "VvE annual accounts and budget.",
  mjop: "Multi-year maintenance plan of the VvE (MJOP).",
  reservefonds: "Bank statement / accounts showing VvE reserve fund balance.",
  opstal: "VvE building insurance policy.",
  kvk: "Chamber of Commerce excerpt of the VvE.",
  erfpacht: "Amsterdam leasehold (erfpacht) documents.",
  asbest: "Asbestos inventory (SC-540).",
  fundering: "Foundation survey or KCAF report.",
};

export type DocExtract = {
  doc_key: string;
  filename: string;
  summary: string;          // one-paragraph overview, 1-3 sentences
  key_facts: string[];      // up to 10 short factual bullets
  dates: string[];          // ISO YYYY-MM-DD strings or "YYYY" if no day; with context e.g. "2031 — MJOP valid through"
  amounts: string[];        // plain euro integers with label e.g. "12500 — reserve fund balance"
  parties: string[];        // VvE name, owner name, notary etc.
  flags: string[];          // up to 5 risk signals
  unreadable?: boolean;     // true if doc was empty / unreadable
};

function systemPrompt(docKey: string): string {
  const desc = DOC_DESCRIPTIONS[docKey] ?? "an apartment-sale document";
  return `You read ONE document from a Dutch apartment-sale dossier and extract structured facts.

The document is: ${docKey} — ${desc}

Output JSON only, no prose, no code fences. Schema:

{
  "summary":    string,     // one paragraph (1-3 sentences, English) describing what this document is and its most material content.
  "key_facts":  string[],   // up to 10 short factual bullets in English, each citing the document. Numbers in euros: plain integers, no separator, no symbol.
  "dates":      string[],   // each entry: "<ISO date or year> — <what it refers to>". e.g. "2031 — MJOP valid through".
  "amounts":    string[],   // each entry: "<integer> — <label>". e.g. "12500 — reserve fund balance 2024".
  "parties":    string[],   // names of VvE, owners, notary, contractors, insurers etc.
  "flags":      string[],   // up to 5 risk signals an agent should know (e.g. "MJOP not updated since 2018", "reserve fund below MJOP recommendation").
  "unreadable": boolean     // true ONLY if the document is empty / blank / unreadable.
}

Rules:
- Cite only facts that are directly in this single document. Don't speculate.
- Keep it tight: a senior agent will skim this in 10 seconds.
- Empty arrays are fine if nothing relevant is present.
- Output JSON only.`;
}

function buildContent(opts: {
  bytes: Buffer;
  mime: string;
  filename: string;
}): Anthropic.MessageParam["content"] {
  const b64 = opts.bytes.toString("base64");
  if (opts.mime === "application/pdf") {
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: b64 },
        title: opts.filename,
      } as Anthropic.ContentBlockParam,
      { type: "text", text: "Extract facts from this document per the schema." },
    ];
  }
  if (opts.mime.startsWith("image/")) {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: opts.mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: b64,
        },
      },
      { type: "text", text: "Extract facts from this image per the schema." },
    ];
  }
  // Caller should have filtered these out, but guard just in case.
  return [{ type: "text", text: `Unsupported mime ${opts.mime}; return empty arrays and set unreadable=true.` }];
}

function safeParse(raw: string): DocExtract | null {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const obj = JSON.parse(cleaned) as Record<string, unknown>;
    const arr = (k: string, max: number) =>
      Array.isArray(obj[k])
        ? (obj[k] as unknown[])
            .filter((x) => typeof x === "string" && x.length > 0)
            .slice(0, max) as string[]
        : [];
    return {
      doc_key: "",
      filename: "",
      summary: typeof obj.summary === "string" ? String(obj.summary).slice(0, 600) : "",
      key_facts: arr("key_facts", 10),
      dates: arr("dates", 12),
      amounts: arr("amounts", 12),
      parties: arr("parties", 10),
      flags: arr("flags", 5),
      unreadable: obj.unreadable === true,
    };
  } catch {
    return null;
  }
}

// Run the extraction for one verkoop_files row. Updates the row in place with
// ai_extract / ai_extract_status / ai_extract_at / ai_extract_error.
// Returns the persisted extract, or null on failure (status is recorded).
export async function extractSingleDocument(file: {
  id: string;
  doc_key: string;
  filename: string;
  mime_type: string | null;
  blob_url: string;
}): Promise<DocExtract | null> {
  const sb = supabaseAdmin();
  const mime = file.mime_type || "application/octet-stream";

  // Skip formats Claude can't natively read.
  if (mime !== "application/pdf" && !mime.startsWith("image/")) {
    await sb
      .from("verkoop_files")
      .update({
        ai_extract: null,
        ai_extract_status: "skipped",
        ai_extract_at: new Date().toISOString(),
        ai_extract_error: `Unsupported mime type: ${mime}`,
      })
      .eq("id", file.id);
    return null;
  }

  const anthropicKey =
    process.env.VERKOOP_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    await sb
      .from("verkoop_files")
      .update({
        ai_extract_status: "failed",
        ai_extract_at: new Date().toISOString(),
        ai_extract_error: "ANTHROPIC_API_KEY missing",
      })
      .eq("id", file.id);
    return null;
  }

  // Mark in-flight so a parallel call won't double-process.
  await sb
    .from("verkoop_files")
    .update({ ai_extract_status: "pending", ai_extract_error: null })
    .eq("id", file.id);

  let bytes: ArrayBuffer | null = null;
  try {
    if (/^https?:\/\//i.test(file.blob_url)) {
      const res = await fetch(file.blob_url);
      if (res.ok) bytes = await res.arrayBuffer();
    } else {
      bytes = await downloadFile(file.blob_url);
    }
  } catch (err) {
    await sb
      .from("verkoop_files")
      .update({
        ai_extract_status: "failed",
        ai_extract_at: new Date().toISOString(),
        ai_extract_error: `download_failed: ${err instanceof Error ? err.message : String(err)}`,
      })
      .eq("id", file.id);
    return null;
  }
  if (!bytes) {
    await sb
      .from("verkoop_files")
      .update({
        ai_extract_status: "failed",
        ai_extract_at: new Date().toISOString(),
        ai_extract_error: "download_returned_empty",
      })
      .eq("id", file.id);
    return null;
  }

  const client = new Anthropic({ apiKey: anthropicKey });
  let raw: string;
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 900,
      system: systemPrompt(file.doc_key),
      messages: [
        {
          role: "user",
          content: buildContent({
            bytes: Buffer.from(bytes),
            mime,
            filename: file.filename,
          }),
        },
      ],
    });
    const tb = msg.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    );
    if (!tb) throw new Error("no_text_response");
    raw = tb.text;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    await sb
      .from("verkoop_files")
      .update({
        ai_extract_status: "failed",
        ai_extract_at: new Date().toISOString(),
        ai_extract_error: `claude: ${detail}`.slice(0, 800),
      })
      .eq("id", file.id);
    return null;
  }

  const parsed = safeParse(raw);
  if (!parsed) {
    await sb
      .from("verkoop_files")
      .update({
        ai_extract_status: "failed",
        ai_extract_at: new Date().toISOString(),
        ai_extract_error: `parse_failed: ${raw.slice(0, 300)}`,
      })
      .eq("id", file.id);
    return null;
  }
  parsed.doc_key = file.doc_key;
  parsed.filename = file.filename;

  await sb
    .from("verkoop_files")
    .update({
      ai_extract: parsed,
      ai_extract_status: "done",
      ai_extract_at: new Date().toISOString(),
      ai_extract_error: null,
    })
    .eq("id", file.id);

  return parsed;
}

// Pretty-print a stored extract as a text block for the synthesis prompt.
export function formatExtractForSynthesis(e: DocExtract): string {
  const lines: string[] = [];
  lines.push(`## ${e.doc_key} — ${e.filename}`);
  if (e.unreadable) {
    lines.push("_(document was unreadable / empty)_");
    return lines.join("\n");
  }
  if (e.summary) lines.push(`Summary: ${e.summary}`);
  if (e.key_facts.length) {
    lines.push("Key facts:");
    for (const f of e.key_facts) lines.push(`- ${f}`);
  }
  if (e.dates.length) {
    lines.push("Dates:");
    for (const d of e.dates) lines.push(`- ${d}`);
  }
  if (e.amounts.length) {
    lines.push("Amounts (EUR):");
    for (const a of e.amounts) lines.push(`- ${a}`);
  }
  if (e.parties.length) {
    lines.push("Parties:");
    for (const p of e.parties) lines.push(`- ${p}`);
  }
  if (e.flags.length) {
    lines.push("Flags:");
    for (const fl of e.flags) lines.push(`- ${fl}`);
  }
  return lines.join("\n");
}
