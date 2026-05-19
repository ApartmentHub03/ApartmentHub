import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey:
    (process.env.VERKOOP_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY)!,
});

const MODEL = process.env.VERKOOP_MODEL || "claude-sonnet-4-6";

// What each document key (from the front-end form) means.
const DOC_DESCRIPTIONS: Record<string, string> = {
  leveringsakte:   "Notarial deed of transfer (leveringsakte). Confirms ownership.",
  hypotheek:       "Mortgage payoff statement / pro-forma calculation.",
  vergunningen:    "Building / renovation permits (omgevingsvergunningen).",
  bouwtekeningen:  "Construction or renovation drawings.",
  garanties:       "Warranties for roof / boiler / kitchen / bathroom / solar.",
  "cv-onderhoud":  "Boiler service contract and last service report.",
  zonnepanelen:    "Solar panel invoice, warranty, inverter info.",
  splitsingsakte:  "Notarial split deed defining the apartment right (Dutch: splitsingsakte).",
  notulen:         "Minutes of the VvE general meeting (ALV).",
  jaarrekening:    "VvE annual accounts and budget.",
  mjop:            "Multi-year maintenance plan of the VvE (MJOP).",
  reservefonds:    "Bank statement or accounts showing the VvE reserve fund balance.",
  opstal:          "VvE building insurance policy.",
  kvk:             "Chamber of Commerce excerpt of the VvE.",
  erfpacht:        "Amsterdam leasehold (erfpacht) documents: deed, canon notice, transition offer, buyout confirmation.",
  asbest:          "Asbestos inventory (SC-540).",
  fundering:       "Foundation survey or KCAF report.",
};

// Questions the AI may answer if the documents support it. The IDs match
// the front-end exactly. The front-end skips any question whose ID is
// returned in skipQuestions. Keep this list in sync with portal/index.html
// (search for `qs-vve_` and `qs-verbouw_`) and with server/server.py.
const SKIPPABLE_QUESTIONS: { id: string; question: string; evidence: string }[] = [
  {
    id: "qs-vve_uitgaven",
    question: "Planned major expenses (roof, foundation, lift, facade) in next 5 years?",
    evidence: "Answerable from MJOP if it lists planned expenditures by year and category.",
  },
  {
    id: "qs-vve_fundering",
    question: "Foundation repair planned or carried out?",
    evidence: "Answerable from MJOP, ALV minutes, or fundering survey.",
  },
];

// Fields the AI may pre-fill if it finds them in documents. Keys starting
// with "qs-" target rich-question types in the front-end:
//   yn          -> "ja" | "nee"
//   radio       -> exact label string from the option list
//   multiselect -> array of label strings
const PREFILLABLE_FIELDS: { key: string; description: string }[] = [
  // Free fields (text/number) extracted from documents
  { key: "vve_naam",        description: "Name of the VvE" },
  { key: "vve_kvk",         description: "Chamber of Commerce number of the VvE" },
  { key: "vve_maand",       description: "Monthly VvE contribution in euros" },
  { key: "reservefonds",    description: "Reserve fund balance in euros" },
  { key: "modelreglement",  description: "Year of the model regulation (1973/1983/1992/2006/2017)" },
  { key: "splitsing_datum", description: "Date of the splitsingsakte (ISO YYYY-MM-DD)" },
  { key: "mjop_geldig_tm",  description: "Year through which the MJOP is valid" },
  { key: "erfpacht_type",   description: "Voortdurend / eeuwigdurend / vol eigendom" },
  { key: "canon_jaar",      description: "Annual leasehold canon in euros (if not bought off)" },
  // Question-IDs the AI can directly answer (bypass step 4)
  { key: "qs-vve_achterstand",      description: "yn. 'ja' or 'nee'. Outstanding payments owed by current owner (jaarrekening)." },
  { key: "qs-verbouw_door",         description: "radio. One of: Huidige eigenaar / Vorige eigenaar / Beide / Geen verbouwingen." },
  { key: "qs-verbouw_vergunning",   description: "yn. 'ja' if permit applied for and obtained for visible renovations, else 'nee'." },
  { key: "qs-verbouw_constructief", description: "multiselect. Subset of: Draagmuur weggehaald / Vloer geopend / Balken vervangen / Anders / Geen." },
  { key: "qs-verbouw_aanbouw",      description: "multiselect. Subset of: Aanbouw / Dakkapel / Dakterras / Balkon-uitbreiding / Geen." },
];

function buildPrompt(lang: "nl" | "en", suppliedDocs: string[]): string {
  const summaryLang = lang === "nl" ? "Dutch" : "English";
  const skippable = SKIPPABLE_QUESTIONS
    .map(q => `  ${q.id}: "${q.question}"  /* evidence: ${q.evidence} */`)
    .join("\n");
  const prefillable = PREFILLABLE_FIELDS
    .map(f => `  ${f.key}: ${f.description}`)
    .join("\n");
  const docList = suppliedDocs
    .map(k => `  - ${k}: ${DOC_DESCRIPTIONS[k] ?? "(unknown document type)"}`)
    .join("\n");

  return `You are an extraction assistant for ApartmentHub, a real estate agency in Amsterdam.

The seller has uploaded the following documents (each attached with a 'title' indicating its type):

${docList}

Your job: read the documents and produce ONE JSON object that the front-end can use to pre-fill its form. Output JSON only. No prose.

Schema:
{
  "summary":       string[],            // Concise bullets in ${summaryLang} stating facts you extracted with confidence
  "skipQuestions": string[],            // IDs of questions you can confidently answer; the front-end will hide these
  "prefilled":     Record<string,string|number|boolean>  // Values to pre-fill in the form
}

Skippable questions (only include an ID if the documents directly answer it):
${skippable}

Pre-fillable fields (only include keys you actually extracted):
${prefillable}

Strict rules:
1. Only assert facts that are directly supported by the attached documents. Do not infer.
2. Numbers in euros must be plain integers (no thousand separators, no currency symbol).
3. Dates in ISO format (YYYY-MM-DD) when possible.
4. Each summary line must be one short sentence.
5. Output JSON only. No code fences, no commentary.
`;
}

// ---------------------------------------------------------------------
// Helper: turn an uploaded File into an Anthropic content block.
// ---------------------------------------------------------------------
async function fileToContentBlock(
  file: File,
  docKey: string,
): Promise<Anthropic.MessageCreateParams["messages"][number]["content"][number] | null> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  const data = buffer.toString("base64");

  if (mime === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data },
      title: docKey,
      // Anthropic SDK type for citations; safe to omit.
    } as any;
  }
  if (mime.startsWith("image/")) {
    return {
      type: "image",
      source: { type: "base64", media_type: mime as any, data },
    };
  }
  // Word/Excel: skip silently. Mention in the prompt that the seller will
  // answer those questions manually. For v2 you can use libreoffice to
  // convert these to PDF before sending.
  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const lang = (formData.get("lang") as string) === "en" ? "en" : "nl";

    // The portal forwards intake-step enrichment as a JSON string so we can
    // bake it into the response shape that submit/email expects.
    let enrichment: unknown = null;
    const enrichmentRaw = formData.get("enrichment");
    if (typeof enrichmentRaw === "string" && enrichmentRaw.length > 0) {
      try { enrichment = JSON.parse(enrichmentRaw); } catch { /* ignore */ }
    }

    // Group files by their doc key (from field names like "file_mjop").
    const docs: Record<string, File[]> = {};
    for (const [key, value] of formData.entries()) {
      if (key.startsWith("file_") && value instanceof File && value.size > 0) {
        const docKey = key.slice("file_".length);
        (docs[docKey] ||= []).push(value);
      }
    }

    if (Object.keys(docs).length === 0) {
      // Nothing to extract. Return empty result so the front-end shows
      // all questions normally. Enrichment is still echoed back so the
      // submit step has a single source of truth.
      return Response.json({ summary: [], skipQuestions: [], prefilled: {}, enrichment });
    }

    // Build content blocks for Claude.
    const content: any[] = [];
    for (const [docKey, files] of Object.entries(docs)) {
      for (const file of files) {
        const block = await fileToContentBlock(file, docKey);
        if (block) content.push(block);
      }
    }
    content.push({ type: "text", text: buildPrompt(lang as any, Object.keys(docs)) });

    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    // Pick the first text block from the response.
    const textBlock = msg.content.find((b: any) => b.type === "text") as
      | { type: "text"; text: string }
      | undefined;
    if (!textBlock) throw new Error("No text response from Claude");

    // Be tolerant of stray markdown fences.
    const raw = textBlock.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    const parsed = JSON.parse(raw);

    // Whitelist what we send back to the client. Defensive against an
    // out-of-spec model response.
    const safe = {
      summary: Array.isArray(parsed.summary) ? parsed.summary.slice(0, 12) : [],
      skipQuestions: Array.isArray(parsed.skipQuestions)
        ? parsed.skipQuestions.filter((id: any) =>
            SKIPPABLE_QUESTIONS.some(q => q.id === id),
          )
        : [],
      prefilled:
        parsed.prefilled && typeof parsed.prefilled === "object"
          ? Object.fromEntries(
              Object.entries(parsed.prefilled).filter(([k]) =>
                PREFILLABLE_FIELDS.some(f => f.key === k),
              ),
            )
          : {},
      enrichment,
    };

    return Response.json(safe);
  } catch (err: any) {
    console.error("extract error", err);
    return Response.json(
      { error: "extraction_failed", message: err?.message ?? String(err) },
      { status: 500 },
    );
  }
}
