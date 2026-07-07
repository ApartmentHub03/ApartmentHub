"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ERRORS: Record<string, string> = {
  no_files: "This dossier has no uploaded files yet — nothing for the AI to read.",
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

export function RegenerateAnalysisButton({ dossierId, hasAnalysis }: { dossierId: string; hasAnalysis: boolean }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  if (!hasAnalysis) return null;

  async function run() {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/dashboard-selling/dossiers/${dossierId}/analyse`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) {
        const body = await res.json();
        setErr(ERRORS[body.error] ?? body.detail ?? "Unknown error");
        return;
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        style={{
          background: "#fff",
          color: "#007A6D",
          border: "1px solid #E2E8F0",
          padding: "8px 16px",
          borderRadius: 999,
          fontWeight: 600,
          fontSize: 13,
          cursor: busy ? "wait" : "pointer",
          font: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
        }}
      >
        {busy ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                border: "2px solid currentColor",
                borderTopColor: "transparent",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Regenerating…
          </>
        ) : (
          "↻ Regenerate analysis"
        )}
      </button>
      {err && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            padding: "8px 12px",
            background: "#FEE4E2",
            color: "#B42318",
            borderRadius: 8,
            fontSize: 13,
            maxWidth: 320,
            zIndex: 50,
          }}
        >
          {err}
        </div>
      )}
    </>
  );
}