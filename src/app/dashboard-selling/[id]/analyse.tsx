"use client";

import { useState } from "react";
import styles from "../dashboard-selling.module.css";

type Analysis = {
  summary: string[];
  flags: string[];
  gaps: string[];
  next_actions: string[];
  analysed_at?: string | null;
  files_skipped?: string[];
};

const ERRORS: Record<string, string> = {
  no_files: "This dossier has no uploaded files yet nothing for the AI to read.",
  no_analysable_files:
    "All uploaded files are in formats Claude can't read (Word / Excel). Ask the seller to re-upload as PDF.",
  forbidden_role: "Your role (viewer) can't trigger AI analysis. Ask an admin.",
  unauthorized: "Session expired. Please sign in again.",
  missing_api_key:
    "ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Settings → Environment Variables.",
  anthropic_auth:
    "Anthropic rejected the API key. Rotate it at console.anthropic.com/settings/keys and update both .env.local and Vercel env.",
  ai_failed: "The AI call failed. Try again, or check Vercel logs.",
  db_error: "Database error.",
  not_found: "Dossier not found.",
};

export function AnalyseSection({
  dossierId,
  canAnalyse,
  initial,
}: {
  dossierId: string;
  canAnalyse: boolean;
  initial: Analysis | null;
}) {
  const [data, setData] = useState<Analysis | null>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState(Boolean(initial && initial.summary.length));

  async function run() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard-selling/dossiers/${dossierId}/analyse`, {
        method: "POST",
        credentials: "same-origin",
      });
      const body = await res.json();
      if (!res.ok) {
        setErr(ERRORS[body.error] ?? body.detail ?? "Unknown error");
        return;
      }
      setData({
        summary: body.summary ?? [],
        flags: body.flags ?? [],
        gaps: body.gaps ?? [],
        next_actions: body.next_actions ?? [],
        analysed_at: body.analysed_at,
        files_skipped: body.files_skipped ?? [],
      });
      setOpen(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (!canAnalyse) {
    return (
      <div className={styles.section}>
        <h2>AI analysis</h2>
        <div className={styles.empty}>
          <p>Your role can't run AI analysis. Ask an admin.</p>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div style={{ margin: "16px 0" }}>
        <button
          type="button"
          onClick={run}
          disabled={busy}
          style={{
            background: busy ? "#FFE2CB" : "#FF7D28",
            color: busy ? "#E66C1A" : "#fff",
            border: 0,
            padding: "12px 20px",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 14,
            cursor: busy ? "wait" : "pointer",
            font: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {busy ? (
            <>
              <Spinner /> Analysing… (60s)
            </>
          ) : (
            <>✨ Analyse documents with AI</>
          )}
        </button>
        {err && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              background: "#FEE4E2",
              color: "#B42318",
              borderRadius: 8,
              fontSize: 13,
              maxWidth: 600,
            }}
          >
            {err}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className={styles.section}>
        <h2>AI summary</h2>
        {data && data.summary.length > 0 ? (
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#1A202C", lineHeight: 1.6 }}>
            {data.summary.map((s, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {s}
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            <p>The AI returned no summary bullets.</p>
          </div>
        )}
      </div>

      {data && data.flags.length > 0 && (
        <div className={styles.section}>
          <h2>⚠️ Flags</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#B42318", lineHeight: 1.6 }}>
            {data.flags.map((f, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && data.gaps.length > 0 && (
        <div className={styles.section}>
          <h2>Gaps in the dossier</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#4A5568", lineHeight: 1.6 }}>
            {data.gaps.map((g, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                {g}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && data.next_actions.length > 0 && (
        <div className={styles.section}>
          <h2>Suggested next actions</h2>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#1A202C", lineHeight: 1.6 }}>
            {data.next_actions.map((a, i) => (
              <li key={i} style={{ marginBottom: 4 }}>
                ☐ {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 12,
          flexWrap: "wrap",
          fontSize: 13,
          color: "#718096",
        }}
      >
        {data?.analysed_at && (
          <span>last run {new Date(data.analysed_at).toLocaleString()}</span>
        )}
        {data?.files_skipped && data.files_skipped.length > 0 && (
          <span title={data.files_skipped.join("\n")}>
            · {data.files_skipped.length} file(s) skipped (hover)
          </span>
        )}
      </div>
      {err && (
        <div
          style={{
            marginTop: 12,
            padding: "10px 12px",
            background: "#FEE4E2",
            color: "#B42318",
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 600,
          }}
        >
          {err}
        </div>
      )}
    </>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid #fff",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}