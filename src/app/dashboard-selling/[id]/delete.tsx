"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard-selling.module.css";

// Admin-only "Delete dossier" control. Opens a confirmation modal before
// firing DELETE /api/dashboard-selling/dossiers/[id]; on success it sends the
// admin back to the dossier list.
export function DeleteDossier({ dossierId, sellerName }: { dossierId: string; sellerName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Close on Escape and lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, busy]);

  async function confirmDelete() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/dashboard-selling/dossiers/${dossierId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.detail || data.error || "Delete failed");
        setBusy(false);
        return;
      }
      // Gone — return to the list and refresh server data.
      router.push("/dashboard-selling");
      router.refresh();
    } catch {
      setErr("Network error — please try again.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.btnSecondary} ${styles.btnDanger}`}
        onClick={() => {
          setErr(null);
          setOpen(true);
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <line x1="10" y1="11" x2="10" y2="17" />
          <line x1="14" y1="11" x2="14" y2="17" />
        </svg>
        Delete dossier
      </button>

      {open && (
        <div
          className={styles.modalOverlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dossier-title"
        >
          <div className={styles.modalCard}>
            <div className={styles.modalIcon} aria-hidden>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 id="delete-dossier-title" className={styles.modalTitle}>
              Delete this dossier?
            </h3>
            <p className={styles.modalBody}>
              This permanently deletes <strong>{sellerName || "this seller"}</strong>&rsquo;s dossier —
              all uploaded documents, signatures and activity history. This action{" "}
              <strong>cannot be undone</strong>.
            </p>
            {err && <p className={styles.modalError}>{err}</p>}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.btnSecondary}
                style={{ padding: "9px 16px" }}
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btnPrimary} ${styles.btnDangerSolid}`}
                style={{ padding: "9px 18px" }}
                onClick={confirmDelete}
                disabled={busy}
              >
                {busy ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
