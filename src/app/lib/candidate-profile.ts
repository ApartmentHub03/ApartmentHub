import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "./supabase-admin";

const MODEL = process.env.VERKOOP_EXTRACT_MODEL || "claude-haiku-4-5";
const BUCKET = "dossier-documents";

export type PersonProfile = {
  name: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  job_title: string | null;
  employer: string | null;
  contract_type: string | null;
  monthly_income: string | null;
  income_currency: string | null;
  relationship: string | null;
};

export type AIProfile = {
  main_tenant: PersonProfile | null;
  guarantor: PersonProfile | null;
  co_tenants: PersonProfile[] | null;
  gaps: string[];
  sources: string[];
};

export type AIProfileResult = {
  profile: AIProfile | null;
  candidate_bio: string;
  guarantor_bio: string;
  gaps: string[];
  error?: string;
};

const EMPTY_RESULT: AIProfileResult = {
  profile: null,
  candidate_bio: "",
  guarantor_bio: "",
  gaps: ["analysis_failed"],
};

const SYSTEM_PROMPT = `You are an assistant for a Dutch apartment rental platform (ApartmentHub).
You analyze documents uploaded by a rental candidate and extract a structured profile,
then write two professional bio paragraphs for the offer email.

You will receive multiple documents (ID cards, payslips, employment contracts,
employer statements, etc.) for the main tenant and possibly co-tenants and a guarantor.

Extract these fields for the MAIN TENANT (the applicant):
- name (full name as on ID)
- date_of_birth (ISO or YYYY-MM-DD if visible)
- nationality
- job_title (profession / role)
- employer (company name)
- contract_type (permanent, temporary, internship, freelance, student, etc.)
- monthly_income (gross, as a plain number string, e.g. "3500")
- income_currency (EUR, USD, etc.)

For the GUARANTOR (if any documents mention one):
- name
- relationship (parent, etc.)
- job_title
- employer
- monthly_income
- income_currency

For CO-TENANTS (if visible in the documents):
- name, job_title, employer, monthly_income, income_currency

Then write two bio paragraphs (3-5 sentences each, professional tone, English):
- candidate_bio: introduces the main tenant — their name, age if known, nationality,
  what they study or do for work, employer, contract type, income. Written as a
  narrative the listing agent can include in an offer email.
- guarantor_bio: introduces the guarantor — their name, relationship to the tenant,
  profession, employer, income. If no guarantor, return empty string.

Style reference for candidate_bio:
"e.g. Lukas Norman (18 years old) is a Belgian student who will be studying
Economics and Business Economics full-time at the Vrije Universiteit Amsterdam..."

Style reference for guarantor_bio:
"e.g. Kristine Hambrouck (mother) works at UNHCR as Head of Global Budget and
Resource Allocation Service. She has held a permanent contract since 1998 and
earns USD 315,917 gross per year..."

If a LinkedIn URL is provided, use it to infer likely profession/employer when
the documents don't contain that information. Clearly note in the gaps array
which fields were inferred from LinkedIn vs extracted from documents.

Output JSON only, no prose, no code fences. Schema:
{
  "main_tenant": { "name": "", "date_of_birth": null, "nationality": null,
    "job_title": null, "employer": null, "contract_type": null,
    "monthly_income": null, "income_currency": null, "relationship": null } | null,
  "guarantor": { "name": null, "date_of_birth": null, "nationality": null,
    "job_title": null, "employer": null, "contract_type": null,
    "monthly_income": null, "income_currency": null, "relationship": null } | null,
  "co_tenants": [] | null,
  "gaps": ["list of fields that could not be determined from documents or LinkedIn"],
  "sources": ["list of document filenames that were analyzed"],
  "candidate_bio": "the paragraph text",
  "guarantor_bio": "the paragraph text or empty string"
}

Rules:
- Cite only facts directly visible in the documents or reasonably inferred from a LinkedIn URL.
- If a field is not found, use null (not an empty string) for string fields.
- Empty gaps array is fine if everything was found.
- Output JSON only.`;

function safeParse(raw: string): Record<string, unknown> | null {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function normalizeProfile(obj: unknown): PersonProfile | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  const str = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;
  return {
    name: str(o.name),
    date_of_birth: str(o.date_of_birth),
    nationality: str(o.nationality),
    job_title: str(o.job_title),
    employer: str(o.employer),
    contract_type: str(o.contract_type),
    monthly_income: str(o.monthly_income),
    income_currency: str(o.income_currency),
    relationship: str(o.relationship),
  };
}

function normalizeArr(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((x) => typeof x === "string" && x.length > 0) as string[];
}

function buildContentBlocks(
  docs: { bytes: Buffer; mime: string; filename: string }[]
): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];
  for (const doc of docs) {
    if (doc.mime === "application/pdf") {
      blocks.push({
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: doc.bytes.toString("base64"),
        },
        title: doc.filename,
      } as Anthropic.ContentBlockParam);
    } else if (doc.mime.startsWith("image/")) {
      const mediaType = doc.mime as
        | "image/jpeg"
        | "image/png"
        | "image/webp"
        | "image/gif";
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: doc.bytes.toString("base64"),
        },
      } as Anthropic.ContentBlockParam);
    }
  }
  blocks.push({
    type: "text",
    text: "Extract the candidate profile and write the bio paragraphs per the schema.",
  } as Anthropic.ContentBlockParam);
  return blocks;
}

export async function analyzeCandidateProfile(opts: {
  dossierId: string;
  phone: string;
  linkedinUrl?: string | null;
}): Promise<AIProfileResult> {
  const { dossierId, linkedinUrl } = opts;

  const anthropicKey =
    process.env.VERKOOP_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    return { ...EMPTY_RESULT, error: "ANTHROPIC_API_KEY missing" };
  }

  const sb = supabaseAdmin();

  // 1. Fetch personen + documenten for this dossier.
  const { data: personen, error: pErr } = await sb
    .from("personen")
    .select("*")
    .eq("dossier_id", dossierId);
  if (pErr) throw pErr;
  const personenArr = personen || [];
  const persoonIds = personenArr.map((p) => p.id).filter(Boolean);

  let documenten: Array<Record<string, unknown>> = [];
  if (persoonIds.length > 0) {
    const { data: docs, error: dErr } = await sb
      .from("documenten")
      .select("*")
      .in("persoon_id", persoonIds);
    if (dErr) throw dErr;
    documenten = docs || [];
  }

  if (documenten.length === 0) {
    return {
      ...EMPTY_RESULT,
      gaps: ["no_documents_found"],
      error: "No documents in dossier",
    };
  }

  // 2. Download each document from the dossier-documents bucket.
  const pathKey = (d: Record<string, unknown>) =>
    String(d.bestandspad || d.file_path || "");

  const downloadable = documenten.filter((d) => {
    const path = pathKey(d);
    if (!path) return false;
    const filename = String(d.bestandsnaam || d.file_name || path.split("/").pop() || "");
    const mime = guessMime(filename);
    return mime === "application/pdf" || mime.startsWith("image/");
  });

  if (downloadable.length === 0) {
    return {
      ...EMPTY_RESULT,
      gaps: ["no_supported_documents"],
      error: "No PDF/image documents in dossier",
    };
  }

  const docs: { bytes: Buffer; mime: string; filename: string }[] = [];
  for (const d of downloadable) {
    const rawPath = pathKey(d);
    const cleanPath = rawPath.startsWith("dossier-documents/")
      ? rawPath.slice("dossier-documents/".length)
      : rawPath;
    const filename =
      String(d.bestandsnaam || d.file_name || cleanPath.split("/").pop() || "document");
    const mime = guessMime(filename);
    try {
      const { data, error } = await sb.storage
        .from(BUCKET)
        .download(cleanPath);
      if (error || !data) {
        console.error(`[candidate-profile] download failed for ${cleanPath}:`, error);
        continue;
      }
      const ab = await data.arrayBuffer();
      docs.push({ bytes: Buffer.from(ab), mime, filename });
    } catch (err) {
      console.error(`[candidate-profile] download error for ${cleanPath}:`, err);
    }
  }

  if (docs.length === 0) {
    return {
      ...EMPTY_RESULT,
      gaps: ["document_download_failed"],
      error: "Could not download any documents",
    };
  }

  // 3. Build the Claude message with all documents.
  let userText = "";
  if (linkedinUrl) {
    userText += `The candidate provided this LinkedIn URL: ${linkedinUrl}\nInfer likely profession/employer from the URL slug if not found in the documents.\n\n`;
  }
  if (personenArr.length > 0) {
    const peopleSummary = personenArr
      .map((p) => {
        const name =
          p.naam ||
          [p.voornaam, p.achternaam].filter(Boolean).join(" ") ||
          "Unknown";
        return `- ${name} (rol: ${p.rol || "unknown"})`;
      })
      .join("\n");
    userText += `Known people in this dossier:\n${peopleSummary}\n`;
  }

  const content: Anthropic.ContentBlockParam[] = buildContentBlocks(docs);
  if (userText) {
    content.unshift({ type: "text", text: userText } as Anthropic.ContentBlockParam);
  }

  const client = new Anthropic({ apiKey: anthropicKey });
  let raw: string;
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    });
    const tb = msg.content.find(
      (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
    );
    if (!tb) throw new Error("no_text_response");
    raw = tb.text;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[candidate-profile] Claude call failed:", detail);
    return { ...EMPTY_RESULT, error: `claude_error: ${detail}` };
  }

  const parsed = safeParse(raw);
  if (!parsed) {
    return { ...EMPTY_RESULT, error: "parse_failed" };
  }

  const profile: AIProfile = {
    main_tenant: normalizeProfile(parsed.main_tenant),
    guarantor: normalizeProfile(parsed.guarantor),
    co_tenants: Array.isArray(parsed.co_tenants)
      ? (parsed.co_tenants as unknown[])
          .map((v) => normalizeProfile(v))
          .filter(Boolean) as PersonProfile[]
      : null,
    gaps: normalizeArr(parsed.gaps),
    sources: normalizeArr(parsed.sources),
  };

  const candidateBio =
    typeof parsed.candidate_bio === "string"
      ? String(parsed.candidate_bio).slice(0, 2000)
      : "";
  const guarantorBio =
    typeof parsed.guarantor_bio === "string"
      ? String(parsed.guarantor_bio).slice(0, 2000)
      : "";

  return {
    profile,
    candidate_bio: candidateBio,
    guarantor_bio: guarantorBio,
    gaps: profile.gaps,
  };
}

function guessMime(filename: string): string {
  const ext = filename.toLowerCase().split(".").pop() || "";
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return map[ext] || "application/octet-stream";
}