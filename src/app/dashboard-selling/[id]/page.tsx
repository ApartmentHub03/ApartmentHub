import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import styles from "../dashboard-selling.module.css";
import { getStaffUser } from "@/app/lib/auth";
import { supabaseAdmin } from "@/app/lib/supabase-admin";
import { signedUrl } from "@/app/lib/storage";
import { AnalyseSection } from "./analyse";
import { ContactActions } from "./contact";
import { EditableDossier } from "./edit";
import { Logo } from "@/app/lib/components/Logo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// Friendly labels for the doc_key slugs so non-technical staff see real names.
const DOC_LABEL: Record<string, string> = {
  mjop: "MJOP — maintenance plan",
  notulen: "VvE meeting minutes",
  jaarrekening: "VvE annual accounts",
  reservefonds: "Reserve fund statement",
  opstal: "Building insurance",
  splitsingsakte: "Split deed",
  leveringsakte: "Deed of transfer",
  kvk: "Chamber of Commerce extract",
  hypotheek: "Mortgage statement",
  erfpacht: "Leasehold (erfpacht)",
  garanties: "Warranties",
  "cv-onderhoud": "Boiler service",
  zonnepanelen: "Solar panels",
  vergunningen: "Permits",
  bouwtekeningen: "Construction drawings",
  asbest: "Asbestos report",
  fundering: "Foundation report",
};

const ACTION_LABEL: Record<string, string> = {
  viewed: "Viewed",
  file_uploaded: "File uploaded",
  file_replaced: "File replaced",
  file_removed: "File removed",
  zip_downloaded: "Downloaded ZIP",
  ai_analysed: "AI analysis ran",
  ai_followups_answered: "Answered follow-up",
  dossier_created: "Dossier started",
  dossier_edited: "Edited dossier",
};

function bytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fileKind(mime: string | null | undefined, filename: string): { label: string; color: string } {
  const m = (mime ?? "").toLowerCase();
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  if (m === "application/pdf" || ext === "pdf") return { label: "PDF", color: "#B42318" };
  if (m.startsWith("image/") || ["jpg", "jpeg", "png", "heic", "webp"].includes(ext))
    return { label: "IMG", color: "#15803D" };
  if (["doc", "docx"].includes(ext) || m.includes("word")) return { label: "DOC", color: "#1D4ED8" };
  if (["xls", "xlsx", "csv"].includes(ext) || m.includes("sheet") || m.includes("excel"))
    return { label: "XLS", color: "#15803D" };
  return { label: "FILE", color: "#718096" };
}

function shortName(name: string | null | undefined): string {
  if (!name) return "Staff";
  const first = name.trim().split(/[\s(—]/)[0];
  return first || "Staff";
}

function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase().slice(0, 2);
}

function friendlyActor(actor: string | null, mePhone: string): string {
  if (!actor) return "System";
  if (actor.startsWith("staff:")) {
    return actor.slice(6) === mePhone ? "You" : "Staff";
  }
  if (actor.startsWith("seller:")) return "Seller";
  return actor;
}

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

type SigBlock = {
  name: string | null;
  image: string | null;
  at: string | null;
  ip: string | null;
};

function SignatureSection({ submit, otd }: { submit: SigBlock; otd: SigBlock }) {
  const hasSubmit = submit.name || submit.image || submit.at;
  const hasOtd = otd.name || otd.image || otd.at;
  if (!hasSubmit && !hasOtd) return null;

  function block(title: string, sig: SigBlock) {
    const imgSrc = sig.image
      ? sig.image.startsWith("data:")
        ? sig.image
        : `data:image/png;base64,${sig.image}`
      : null;
    return (
      <div
        style={{
          padding: 14,
          borderRadius: 10,
          border: "1px solid #E2E8F0",
          background: "#F7FAFC",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 700, color: "#4A5568", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
          {title}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 14, alignItems: "center" }}>
          <div style={{ minWidth: 0, fontSize: 13, color: "#1A202C", lineHeight: 1.5 }}>
            {sig.name ? (
              <div>
                <span style={{ color: "#718096" }}>Typed name:</span>{" "}
                <strong style={{ fontFamily: "'Inter', sans-serif" }}>{sig.name}</strong>
              </div>
            ) : null}
            {sig.at ? (
              <div>
                <span style={{ color: "#718096" }}>Signed at:</span>{" "}
                {new Date(sig.at).toLocaleString()}
              </div>
            ) : null}
            {sig.ip ? (
              <div>
                <span style={{ color: "#718096" }}>IP:</span> <code style={{ fontSize: 12 }}>{sig.ip}</code>
              </div>
            ) : null}
            {!sig.image ? (
              <div style={{ marginTop: 6, fontStyle: "italic", color: "#718096" }}>
                No drawn signature (typed name is legally binding under BW 3:15a).
              </div>
            ) : null}
          </div>
          {imgSrc ? (
            // Static PNG export from a canvas; next/image isn't a fit here.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgSrc}
              alt={`${title} signature`}
              style={{
                maxHeight: 90,
                maxWidth: 220,
                background: "#fff",
                border: "1px solid #E2E8F0",
                borderRadius: 6,
                padding: 4,
              }}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.section}>
      <h2>Signatures</h2>
      {hasOtd ? block("Service engagement (OTD)", otd) : null}
      {hasSubmit ? block("Final submit (BW 3:15a)", submit) : null}
    </div>
  );
}

export default async function DossierPage({ params }: Params) {
  const { id: dossierId } = await params;
  const staff = await getStaffUser();
  if (!staff) redirect(`/sell/login?next=/dashboard-selling/${dossierId}`);

  const sb = supabaseAdmin();
  const { data: d } = await sb
    .from("verkoop_dossiers")
    .select("*")
    .eq("id", dossierId)
    .maybeSingle();
  if (!d) notFound();

  await sb.from("verkoop_audit").insert({
    dossier_id: d.id,
    actor: `staff:${staff.phone_e164}`,
    action: "viewed",
    meta: { role: staff.role },
  });

  const { data: filesRaw } = await sb
    .from("verkoop_files")
    .select("id, doc_key, filename, mime_type, size_bytes, blob_url, uploaded_at, version")
    .eq("dossier_id", d.id)
    .eq("is_current", true)
    .order("uploaded_at", { ascending: true });

  const files = await Promise.all(
    (filesRaw ?? []).map(async (f) => ({
      ...f,
      preview_url:
        staff.role === "viewer" || !f.blob_url ? null : await signedUrl(f.blob_url),
    }))
  );

  const { data: audit } = await sb
    .from("verkoop_audit")
    .select("id, created_at, actor, action, meta")
    .eq("dossier_id", d.id)
    .order("created_at", { ascending: false })
    .limit(40);

  const aiSummary: string[] = Array.isArray((d as { ai_summary?: unknown }).ai_summary)
    ? ((d as { ai_summary?: unknown[] }).ai_summary as string[])
    : [];
  const followups =
    ((d as { ai_followup_questions?: unknown }).ai_followup_questions as
      | Record<string, unknown>
      | undefined) ?? null;
  const sellerQuestions = Array.isArray(
    (followups as { seller_questions?: unknown[] } | null)?.seller_questions
  )
    ? ((followups as { seller_questions: unknown[] }).seller_questions as Array<{
        id: string;
        question: string;
        if_yes?: string | null;
      }>)
    : [];
  const sellerAnswers =
    ((d as { ai_followup_answers?: Record<string, unknown> | null })
      .ai_followup_answers) ?? {};

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <Link href="/dashboard-selling" className={styles.brand}>
          <span className={styles.logoBox}>
            <Logo variant="light" size={20} />
          </span>
          ApartmentHub
          <span className={styles.sub}>Dashboard</span>
        </Link>
        <span className={styles.topbarRight}>
          <span className={styles.userPill}>
            <span className={styles.avatar}>{initials(staff.display_name ?? staff.phone_e164)}</span>
            <span>{shortName(staff.display_name)}</span>
            <span className={styles.role}>{staff.role}</span>
          </span>
          {staff.role === "admin" && (
            <Link href="/dashboard-selling/admin" className={styles.topbarBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              Staff
            </Link>
          )}
          <a href="/api/auth/signout" rel="nofollow" className={`${styles.topbarBtn} ${styles.danger}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </a>
        </span>
      </header>

      <main className={styles.main}>
        <div className={styles.titleRow}>
          <div style={{ minWidth: 0 }}>
            <Link href="/dashboard-selling" className={styles.backLink}>
              <span className={styles.backArrow}>←</span>
              All dossiers
            </Link>
            <h1 className={styles.pageTitle} style={{ marginTop: 10 }}>
              {d.naam}
            </h1>
            <div style={{ color: "var(--grey)", fontSize: 14, marginTop: 4 }}>
              {d.straat}
              {d.woonplaats ? `, ${d.woonplaats}` : ""}
            </div>
          </div>
        </div>

        {staff.role !== "viewer" ? (
          <div className={styles.actionBar}>
            <a className={styles.btnPrimary} href={`/api/dashboard-selling/dossiers/${d.id}/zip`}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download all (ZIP)
            </a>
            <ContactActions
              sellerName={d.naam ?? ""}
              sellerEmail={d.email ?? null}
              sellerPhone={d.telefoon ?? d.phone_e164 ?? null}
            />

          </div>
        ) : (
          <div
            style={{
              marginBottom: 16,
              padding: "12px 16px",
              background: "#F2F4F7",
              border: "1px solid #E2E8F0",
              borderRadius: 10,
              fontSize: 13,
              color: "#4A5568",
            }}
          >
            You're signed in as <strong>viewer</strong> — file previews and downloads are disabled.
          </div>
        )}

        <div className={styles.grid}>
          <div>
            <EditableDossier
              canEdit={staff.role !== "viewer"}
              initial={{
                id: d.id,
                status: d.status,
                naam: d.naam,
                email: d.email,
                telefoon: d.telefoon,
                phone_e164: d.phone_e164,
                straat: d.straat,
                postcode: d.postcode,
                woonplaats: d.woonplaats,
                vraagprijs: d.vraagprijs,
                oplev_datum: d.oplev_datum,
                taal: d.taal,
              }}
            />

            <AnalyseSection
              dossierId={d.id}
              canAnalyse={staff.role !== "viewer"}
              initial={
                aiSummary.length > 0
                  ? {
                      summary: aiSummary,
                      flags: Array.isArray(followups?.flags) ? (followups.flags as string[]) : [],
                      gaps: Array.isArray(followups?.gaps) ? (followups.gaps as string[]) : [],
                      next_actions: Array.isArray(followups?.next_actions)
                        ? (followups.next_actions as string[])
                        : [],
                    }
                  : null
              }
            />

            <SignatureSection
              submit={{
                name: (d as { signature_name?: string | null }).signature_name ?? null,
                image: (d as { signature_image?: string | null }).signature_image ?? null,
                at: (d as { signed_at?: string | null }).signed_at ?? null,
                ip: (d as { signed_ip?: string | null }).signed_ip ?? null,
              }}
              otd={{
                name: (d as { otd_signed_name?: string | null }).otd_signed_name ?? null,
                image: (d as { otd_signature_png?: string | null }).otd_signature_png ?? null,
                at: (d as { otd_signed_at?: string | null }).otd_signed_at ?? null,
                ip: (d as { otd_signed_ip?: string | null }).otd_signed_ip ?? null,
              }}
            />

            {sellerQuestions.length > 0 && (
              <div className={styles.section}>
                <h2>Seller follow-up Q&amp;A</h2>
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                  {sellerQuestions.map((q) => {
                    const ans = sellerAnswers[q.id] as
                      | { yn?: string; note?: string }
                      | string
                      | null
                      | undefined;
                    const yn = typeof ans === "object" && ans ? ans.yn : (ans as string | undefined);
                    const note = typeof ans === "object" && ans ? ans.note : "";
                    const answered = yn === "ja" || yn === "nee";
                    return (
                      <li
                        key={q.id}
                        style={{
                          padding: "12px 14px",
                          marginBottom: 8,
                          borderRadius: 10,
                          border: "1px solid #E2E8F0",
                          background: answered ? "#F7FAFC" : "#fff",
                        }}
                      >
                        <div style={{ fontSize: 14, color: "#1A202C", marginBottom: 6, lineHeight: 1.4 }}>
                          {q.question}
                        </div>
                        <div style={{ fontSize: 13 }}>
                          {answered ? (
                            <>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "2px 9px",
                                  borderRadius: 999,
                                  fontWeight: 700,
                                  fontSize: 11,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  background: yn === "ja" ? "#DCFCE7" : "#FEE4E2",
                                  color: yn === "ja" ? "#15803D" : "#B42318",
                                  marginRight: 8,
                                }}
                              >
                                {yn === "ja" ? "Yes" : "No"}
                              </span>
                              {note ? (
                                <span style={{ color: "#4A5568" }}>{note}</span>
                              ) : null}
                            </>
                          ) : (
                            <span style={{ color: "#718096", fontStyle: "italic" }}>
                              Awaiting seller response
                            </span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          <div>
            <div className={styles.section}>
              <h2>Uploaded documents ({files?.length ?? 0})</h2>
              {!files || files.length === 0 ? (
                <div className={styles.empty}>
                  <p>No documents uploaded yet.</p>
                </div>
              ) : (
                <ul className={styles.fileList}>
                  {files.map((f) => {
                    const kind = fileKind(f.mime_type, f.filename);
                    const label = DOC_LABEL[f.doc_key] ?? f.doc_key;
                    return (
                      <li key={f.id} className={styles.fileItem}>
                        <span
                          className={styles.fileIcon}
                          style={{ background: kind.color + "15", color: kind.color }}
                          aria-hidden
                        >
                          {kind.label}
                        </span>
                        <span className={styles.fileMeta}>
                          <span className={styles.fileName} title={f.filename}>{label}</span>
                          <span className={styles.fileSub}>
                            {f.filename} · {bytes(f.size_bytes)}
                            {f.version && f.version > 1 ? ` · version ${f.version}` : ""}
                          </span>
                        </span>
                        {f.preview_url ? (
                          <a
                            className={styles.fileLink}
                            href={f.preview_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open
                          </a>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className={styles.section}>
              <h2>Activity log</h2>
              {!audit || audit.length === 0 ? (
                <div className={`${styles.summary} ${styles.empty}`}>
                  No activity yet.
                </div>
              ) : (
                <ul className={styles.auditList}>
                  {audit.map((a) => (
                    <li key={a.id}>
                      <span className={styles.ts} title={new Date(a.created_at).toLocaleString()}>
                        {relativeTime(a.created_at)}
                      </span>
                      <span className={styles.act}>{ACTION_LABEL[a.action] ?? a.action}</span>
                      <span className={styles.by}>{friendlyActor(a.actor, staff.phone_e164)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
