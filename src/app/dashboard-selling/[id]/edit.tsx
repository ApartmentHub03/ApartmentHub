"use client";

import { useState } from "react";
import styles from "../dashboard-selling.module.css";

type Dossier = {
  id: string;
  status: string | null;
  naam: string;
  email: string;
  telefoon: string | null;
  phone_e164: string | null;
  straat: string;
  postcode: string;
  woonplaats: string | null;
  vraagprijs: number | string | null;
  oplev_datum: string | null;
  taal: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In progress",
  awaiting_followups: "Awaiting follow-ups",
  complete: "Complete",
  archived: "Archived",
};

function fmtPrice(n: Dossier["vraagprijs"]): string {
  if (n === null || n === undefined || n === "") return "—";
  const num = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(num)) return "—";
  return `€ ${num.toLocaleString("en-US")}`;
}

export function EditableDossier({
  initial,
  canEdit,
}: {
  initial: Dossier;
  canEdit: boolean;
}) {
  const [d, setD] = useState<Dossier>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Dossier>(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  async function patch(body: Partial<Dossier>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/dashboard-selling/dossiers/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.detail || data.error || "Update failed");
        return false;
      }
      setD((prev) => ({ ...prev, ...data.dossier }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function onStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    const prev = d.status;
    setD((p) => ({ ...p, status: next }));
    const ok = await patch({ status: next });
    if (!ok) setD((p) => ({ ...p, status: prev }));
  }

  async function saveEdits() {
    const ok = await patch({
      naam: draft.naam,
      email: draft.email,
      telefoon: draft.telefoon,
      straat: draft.straat,
      postcode: draft.postcode,
      woonplaats: draft.woonplaats,
      vraagprijs: draft.vraagprijs,
      oplev_datum: draft.oplev_datum,
    });
    if (ok) setEditing(false);
  }

  function cancel() {
    setDraft(d);
    setEditing(false);
    setErr(null);
  }

  const currentStatus = d.status ?? "in_progress";

  return (
    <>
      {/* Status chip + changer — always visible to admin/agent */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "0 0 18px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: "var(--grey-soft)",
          }}
        >
          Status
        </span>
        {canEdit ? (
          <select
            value={currentStatus}
            onChange={onStatusChange}
            disabled={busy}
            className={styles.statusSelect}
            data-status={currentStatus}
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <span className={`${styles.status} ${styles[currentStatus]}`}>
            {STATUS_LABELS[currentStatus]}
          </span>
        )}
        {savedFlash && (
          <span style={{ color: "var(--ok)", fontSize: 12, fontWeight: 600 }}>✓ Saved</span>
        )}
        {err && (
          <span style={{ color: "var(--danger)", fontSize: 12, fontWeight: 600 }}>{err}</span>
        )}
      </div>

      <div className={styles.section}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <h2 style={{ margin: 0 }}>Seller</h2>
          {canEdit && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(d);
                setEditing(true);
                setErr(null);
              }}
              className={styles.editPill}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}
        </div>

        {!editing ? (
          <dl className={styles.kv}>
            <dt>Name</dt>
            <dd>{d.naam || "—"}</dd>
            <dt>Email</dt>
            <dd style={{ wordBreak: "break-all" }}>{d.email || "—"}</dd>
            <dt>Phone (sign-in)</dt>
            <dd>{d.phone_e164 || "—"}</dd>
            <dt>Alternative phone</dt>
            <dd>{d.telefoon || <span style={{ color: "var(--grey-soft)" }}>not provided</span>}</dd>
            <dt>Language</dt>
            <dd>{(d.taal ?? "nl").toUpperCase()}</dd>
          </dl>
        ) : (
          <div className={styles.editGrid}>
            <Field label="Name">
              <input
                className={styles.editInput}
                value={draft.naam}
                onChange={(e) => setDraft({ ...draft, naam: e.target.value })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={styles.editInput}
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </Field>
            <Field label="Phone (sign-in)" hint="Set during sign-in via OTP — read-only">
              <input className={styles.editInput} value={d.phone_e164 ?? ""} disabled readOnly />
            </Field>
            <Field label="Alternative phone">
              <input
                type="tel"
                className={styles.editInput}
                placeholder="Optional second number"
                value={draft.telefoon ?? ""}
                onChange={(e) => setDraft({ ...draft, telefoon: e.target.value })}
              />
            </Field>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2>Property</h2>
        {!editing ? (
          <dl className={styles.kv}>
            <dt>Street</dt>
            <dd>{d.straat || "—"}</dd>
            <dt>Postcode</dt>
            <dd>{d.postcode || "—"}</dd>
            <dt>City</dt>
            <dd>{d.woonplaats || "—"}</dd>
            <dt>Asking price</dt>
            <dd>{fmtPrice(d.vraagprijs)}</dd>
            <dt>Handover</dt>
            <dd>{d.oplev_datum || "—"}</dd>
          </dl>
        ) : (
          <div className={styles.editGrid}>
            <Field label="Street">
              <input
                className={styles.editInput}
                value={draft.straat}
                onChange={(e) => setDraft({ ...draft, straat: e.target.value })}
              />
            </Field>
            <Field label="Postcode">
              <input
                className={styles.editInput}
                value={draft.postcode}
                onChange={(e) => setDraft({ ...draft, postcode: e.target.value })}
              />
            </Field>
            <Field label="City">
              <input
                className={styles.editInput}
                value={draft.woonplaats ?? ""}
                onChange={(e) => setDraft({ ...draft, woonplaats: e.target.value })}
              />
            </Field>
            <Field label="Asking price (€)">
              <input
                type="number"
                className={styles.editInput}
                value={draft.vraagprijs ?? ""}
                onChange={(e) => setDraft({ ...draft, vraagprijs: e.target.value })}
              />
            </Field>
            <Field label="Handover">
              <input
                className={styles.editInput}
                placeholder="e.g. June 2026"
                value={draft.oplev_datum ?? ""}
                onChange={(e) => setDraft({ ...draft, oplev_datum: e.target.value })}
              />
            </Field>
          </div>
        )}

        {editing && (
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 14,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={cancel}
              disabled={busy}
              className={styles.btnSecondary}
              style={{ padding: "8px 14px" }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdits}
              disabled={busy}
              className={styles.btnPrimary}
              style={{ padding: "8px 16px" }}
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--grey)",
          display: "block",
          marginBottom: 4,
        }}
      >
        {label}
        {hint && (
          <span style={{ fontWeight: 400, color: "var(--grey-soft)", marginLeft: 6 }}>
            · {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}
