import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import JSZip from "jszip";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { getStaffUser } from "@/app/lib/auth";
import { downloadFile } from "@/app/lib/storage";
import { generateContract } from "../contract/contract-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

function safeSegment(s: string | null | undefined): string {
  return (s ?? "").replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export async function GET(req: NextRequest, { params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (staff.role === "viewer") {
    return NextResponse.json({ error: "forbidden_role" }, { status: 403 });
  }

  const sb = supabaseAdmin();
  // select("*") instead of an explicit column list — the signature/otd
  // columns are present on the consolidated project but may be missing on
  // legacy deployments still pointed at the older verkoop project. An
  // unknown column makes Supabase 400 the whole query and we'd never reach
  // the dossier row. The downstream code already null-checks each field.
  const { data: d, error: dossierErr } = await sb
    .from("verkoop_dossiers")
    .select("*")
    .eq("id", dossierId)
    .maybeSingle();
  if (dossierErr || !d) {
    // Pass the Supabase error detail through (truncated) so prod failures
    // distinguish "row missing" from "column missing" or "permission denied".
    return NextResponse.json(
      {
        error: "not_found",
        detail: dossierErr?.message?.slice(0, 200) ?? null,
      },
      { status: 404 }
    );
  }

  const { data: files } = await sb
    .from("verkoop_files")
    .select("filename, blob_url, doc_key, mime_type, size_bytes, version")
    .eq("dossier_id", d.id)
    .eq("is_current", true)
    .order("uploaded_at", { ascending: true });

  const zip = new JSZip();

  // 1. ai_summary.md — readable handoff doc
  const summaryLines = Array.isArray((d as { ai_summary?: unknown }).ai_summary)
    ? ((d as { ai_summary?: unknown[] }).ai_summary as string[])
    : [];
  const followups =
    ((d as { ai_followup_questions?: unknown }).ai_followup_questions as
      | Record<string, unknown>
      | undefined) ?? null;
  const answers =
    ((d as { ai_followup_answers?: unknown }).ai_followup_answers as
      | Record<string, unknown>
      | undefined) ?? null;

  type SellerQ = { id: string; question: string; if_yes?: string | null };
  const sellerQuestions: SellerQ[] = Array.isArray(
    (followups as { seller_questions?: unknown[] } | null)?.seller_questions
  )
    ? ((followups as { seller_questions: unknown[] }).seller_questions as SellerQ[])
    : [];

  const sellerAnswers = answers ?? {};
  const flags: string[] = Array.isArray((followups as { flags?: unknown })?.flags)
    ? ((followups as { flags: unknown[] }).flags as string[])
    : [];
  const gaps: string[] = Array.isArray((followups as { gaps?: unknown })?.gaps)
    ? ((followups as { gaps: unknown[] }).gaps as string[])
    : [];
  const nextActions: string[] = Array.isArray((followups as { next_actions?: unknown })?.next_actions)
    ? ((followups as { next_actions: unknown[] }).next_actions as string[])
    : [];

  function formatAnswer(raw: unknown): { yn: string | null; note: string; label: string } {
    if (raw == null) return { yn: null, note: "", label: "Awaiting seller response" };
    if (typeof raw === "object" && raw !== null) {
      const obj = raw as Record<string, unknown>;
      const yn = typeof obj.yn === "string" ? obj.yn : null;
      const note = typeof obj.note === "string" ? obj.note : "";
      if (yn === "ja") return { yn, note, label: "Yes" };
      if (yn === "nee") return { yn, note, label: "No" };
      if (yn === "notes") return { yn, note, label: note ? "Notes" : "Notes" };
      return { yn, note, label: yn };
    }
    if (typeof raw === "string") return { yn: raw, note: "", label: raw };
    return { yn: null, note: "", label: String(raw) };
  }

  const md: string[] = [
    `# Dossier — ${d.naam}`,
    "",
    `- **Address:** ${d.straat}${d.woonplaats ? `, ${d.woonplaats}` : ""}`,
    `- **Postcode:** ${d.postcode}`,
    `- **Email:** ${d.email}`,
    `- **Phone:** ${d.telefoon ?? d.phone_e164 ?? "—"}`,
    `- **Language:** ${(d.taal ?? "nl").toUpperCase()}`,
    `- **Status:** ${d.status ?? "in_progress"}`,
    `- **Asking price:** ${d.vraagprijs ? `€ ${Number(d.vraagprijs).toLocaleString("en-US")}` : "—"}`,
    `- **Handover:** ${d.oplev_datum ?? "—"}`,
    `- **Created:** ${new Date(d.created_at).toLocaleString()}`,
    "",
    "## AI summary",
    summaryLines.length ? summaryLines.join("\n\n") : "_No AI summary generated yet._",
    "",
    "## Seller motivation",
    d.motivatie ?? "_None provided_",
    "",
  ];

  if (flags.length > 0) {
    md.push("## Flags");
    flags.forEach((f) => md.push(`- ⚠️ ${f}`));
    md.push("");
  }
  if (gaps.length > 0) {
    md.push("## Gaps");
    gaps.forEach((g) => md.push(`- ❌ ${g}`));
    md.push("");
  }
  if (nextActions.length > 0) {
    md.push("## Next actions");
    nextActions.forEach((a) => md.push(`- → ${a}`));
    md.push("");
  }

  md.push("## Seller follow-up Q&A");
  if (sellerQuestions.length > 0) {
    sellerQuestions.forEach((q) => {
      const a = formatAnswer(sellerAnswers[q.id]);
      const icon = a.yn === "ja" ? "✅" : a.yn === "nee" ? "❌" : a.yn === "notes" ? "📝" : "⏳";
      md.push("");
      md.push(`**Q: ${q.question}**`);
      md.push(`${icon} **${a.label}**`);
      if (a.note) md.push(`> ${a.note}`);
    });
  } else {
    md.push("_No follow-up questions generated yet._");
  }
  md.push("", "## Direct answers (raw)", "```json", JSON.stringify(d.antwoorden ?? {}, null, 2), "```");
  zip.file("ai_summary.md", md.join("\n"));

  // 1b. seller_qa.md — dedicated Q&A document
  if (sellerQuestions.length > 0) {
    const qaLines: string[] = [
      "# Seller Follow-up Q&A",
      "",
      `**Seller:** ${d.naam}`,
      `**Address:** ${d.straat}${d.woonplaats ? `, ${d.woonplaats}` : ""}`,
      `**Postcode:** ${d.postcode}`,
      `**Generated:** ${new Date().toLocaleString()}`,
      "",
      "---",
      "",
    ];

    let answeredCount = 0;
    let yesCount = 0;
    let noCount = 0;

    sellerQuestions.forEach((q, i) => {
      const a = formatAnswer(sellerAnswers[q.id]);
      const isAnswered = a.yn === "ja" || a.yn === "nee" || a.yn === "notes";
      if (isAnswered) answeredCount++;
      if (a.yn === "ja") yesCount++;
      if (a.yn === "nee") noCount++;

      const icon = a.yn === "ja" ? "✅" : a.yn === "nee" ? "❌" : a.yn === "notes" ? "📝" : "⏳";
      const heading = isAnswered ? `${icon} ${a.label}` : "⏳ Awaiting seller response";

      qaLines.push(`### ${i + 1}. ${q.question}`);
      qaLines.push(heading);
      if (a.note) qaLines.push(`> ${a.note}`);
      qaLines.push("");
    });

    qaLines.push("---");
    qaLines.push("");
    qaLines.push(`*${answeredCount} of ${sellerQuestions.length} questions answered*`);
    if (yesCount > 0) qaLines.push(`- ✅ Yes: ${yesCount}`);
    if (noCount > 0) qaLines.push(`- ❌ No: ${noCount}`);
    const notesCount = answeredCount - yesCount - noCount;
    if (notesCount > 0) qaLines.push(`- 📝 Notes: ${notesCount}`);
    const awaiting = sellerQuestions.length - answeredCount;
    if (awaiting > 0) qaLines.push(`- ⏳ Awaiting: ${awaiting}`);

    zip.file("seller_qa.md", qaLines.join("\n"));
  }

  // 2. each original file. `blob_url` is either:
  //    - a Supabase Storage path like "<dossier_id>/<doc_key>/<ts>_<name>" (new Block B uploads)
  //    - a full http(s) URL (legacy Vercel Blob), kept for backward compat
  const fileList: { name: string; size: number; ok: boolean; error?: string }[] = [];
  if (files) {
    for (const f of files) {
      try {
        let buf: Buffer;
        if (/^https?:\/\//i.test(f.blob_url)) {
          const res = await fetch(f.blob_url);
          if (!res.ok) throw new Error(`http_${res.status}`);
          buf = Buffer.from(await res.arrayBuffer());
        } else {
          const ab = await downloadFile(f.blob_url);
          if (!ab) throw new Error("storage_miss");
          buf = Buffer.from(ab);
        }
        const folder = safeSegment(f.doc_key) || "files";
        const dot = f.filename.lastIndexOf(".");
        const base = dot > 0 ? f.filename.slice(0, dot) : f.filename;
        const ext = dot > 0 ? f.filename.slice(dot) : "";
        const versioned = f.version && f.version > 1 ? `_v${f.version}` : "";
        zip.file(`${folder}/${base}${versioned}${ext}`, buf);
        fileList.push({ name: f.filename, size: buf.length, ok: true });
      } catch (err) {
        fileList.push({
          name: f.filename,
          size: 0,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  // 3. signature PNGs — decoded from the data URLs stored on the dossier.
  // submit signature is BW 3:15a; OTD signature is the upfront service
  // engagement. Either may be absent (typed name alone is still binding).
  type SigCols = {
    signature_image?: string | null;
    otd_signature_png?: string | null;
    signature_name?: string | null;
    signed_at?: string | null;
    otd_signed_name?: string | null;
    otd_signed_at?: string | null;
  };
  const sc = d as SigCols;
  function dataUrlToBuffer(s: string | null | undefined): Buffer | null {
    if (!s) return null;
    // Accept either "data:image/png;base64,XXXX" or bare base64.
    const match = s.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
    const b64 = match ? match[1] : s.trim();
    try {
      return Buffer.from(b64, "base64");
    } catch {
      return null;
    }
  }
  const submitSig = dataUrlToBuffer(sc.signature_image);
  if (submitSig && submitSig.length > 0) {
    zip.file("signature.png", submitSig);
  }
  const otdSig = dataUrlToBuffer(sc.otd_signature_png);
  if (otdSig && otdSig.length > 0) {
    zip.file("otd_signature.png", otdSig);
  }

  // signature.txt — typed names + timestamps. Sits alongside the PNGs so
  // the audit trail is readable even when no canvas drawing exists.
  if (sc.signature_name || sc.otd_signed_name || sc.signed_at || sc.otd_signed_at) {
    const lines: string[] = ["# Signatures", ""];
    if (sc.otd_signed_name || sc.otd_signed_at) {
      lines.push("## Service engagement (OTD)");
      if (sc.otd_signed_name) lines.push(`- Typed name: ${sc.otd_signed_name}`);
      if (sc.otd_signed_at) lines.push(`- Signed at:  ${new Date(sc.otd_signed_at).toISOString()}`);
      lines.push(`- PNG attached: ${otdSig ? "otd_signature.png" : "(none)"}`);
      lines.push("");
    }
    if (sc.signature_name || sc.signed_at) {
      lines.push("## Final submit (BW 3:15a)");
      if (sc.signature_name) lines.push(`- Typed name: ${sc.signature_name}`);
      if (sc.signed_at) lines.push(`- Signed at:  ${new Date(sc.signed_at).toISOString()}`);
      lines.push(`- PNG attached: ${submitSig ? "signature.png" : "(none)"}`);
    }
    zip.file("signature.txt", lines.join("\n"));
  }

  // 4. manifest.json
  const sellerQaStats = sellerQuestions.length > 0
    ? (() => {
        let answered = 0; let yes = 0; let no = 0;
        sellerQuestions.forEach((q) => {
          const a = formatAnswer(sellerAnswers[q.id]);
          if (a.yn === "ja" || a.yn === "nee" || a.yn === "notes") answered++;
          if (a.yn === "ja") yes++;
          if (a.yn === "nee") no++;
        });
        const notes = answered - yes - no;
        const awaiting = sellerQuestions.length - answered;
        return { total_questions: sellerQuestions.length, answered, yes, no, notes, awaiting };
      })()
    : { total_questions: 0, answered: 0, yes: 0, no: 0, notes: 0, awaiting: 0 };

  zip.file(
    "manifest.json",
    JSON.stringify(
      {
        dossier_id: d.id,
        seller: d.naam,
        address: `${d.straat}, ${d.woonplaats ?? ""}`,
        generated_at: new Date().toISOString(),
        generated_by: staff.phone_e164,
        files: fileList,
        seller_qa: sellerQaStats,
      },
      null,
      2
    )
  );

  // 5. Contracts (NL + EN)
  const dossier = d as Record<string, unknown>;
  try {
    const [nlBytes, enBytes] = await Promise.all([
      generateContract(dossier, path.join(process.cwd(), "public", "OTD_NL.pdf"), "nl"),
      generateContract(dossier, path.join(process.cwd(), "public", "Service-Agreement.pdf"), "en"),
    ]);
    zip.file("contract-NL.pdf", nlBytes);
    zip.file("contract-EN.pdf", enBytes);
  } catch (err) {
    console.error("[zip] Contract generation failed, skipping:", err);
  }

  const archiveBuf = await zip.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });

  // Audit
  await sb.from("verkoop_audit").insert({
    dossier_id: d.id,
    actor: `staff:${staff.phone_e164}`,
    action: "zip_downloaded",
    meta: { file_count: fileList.length, bytes: (archiveBuf as ArrayBuffer).byteLength },
  });

  const shortId = String(d.id).slice(0, 8);
  const filename = `dossier-${shortId}-${safeSegment(d.naam)}-${safeSegment(d.straat)}.zip`;

  return new NextResponse(archiveBuf, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String((archiveBuf as ArrayBuffer).byteLength),
      "Cache-Control": "no-store",
    },
  });
}
