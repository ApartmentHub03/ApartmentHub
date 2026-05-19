"use client";

import { useState } from "react";
import styles from "../dashboard-selling.module.css";
import { ConfirmDialogHost, confirmDialog } from "@/app/lib/components/ConfirmDialog";

type Staff = {
  phone_e164: string;
  display_name: string | null;
  role: "admin" | "agent" | "viewer";
  created_at: string;
  last_login_at: string | null;
};

const ROLE_LABELS: Record<Staff["role"], string> = {
  admin: "Admin",
  agent: "Agent",
  viewer: "Viewer",
};

const ROLE_DESC: Record<Staff["role"], string> = {
  admin: "Full access — manages staff",
  agent: "Views dossiers + downloads",
  viewer: "Metadata only",
};

const ERR_LABELS: Record<string, string> = {
  invalid_phone: "Enter a valid phone number with country code (e.g. +31 6 1234 5678 or +91 …).",
  invalid_role: "Pick a valid role.",
  already_exists: "That phone is already a staff member.",
  cannot_self_demote: "You can't demote yourself out of admin.",
  cannot_self_delete: "You can't remove yourself.",
  last_admin: "Can't remove the last admin — promote someone else first.",
  forbidden: "Only admins can manage staff.",
  unauthorized: "Session expired. Please sign in again.",
  db_error: "Database error — please retry.",
};

function fmtTime(iso: string | null) {
  if (!iso) return "Never";
  const t = new Date(iso).getTime();
  const diff = (Date.now() - t) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

function initials(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback.slice(-2).toUpperCase();
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "";
  const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (a + b).toUpperCase().slice(0, 2);
}

function cleanName(name: string | null | undefined): string {
  if (!name) return "Unnamed";
  return name.replace(/\s*\(.*\)\s*$/, "").trim() || "Unnamed";
}

export function AdminClient({ initialStaff, mePhone }: { initialStaff: Staff[]; mePhone: string }) {
  const [staff, setStaff] = useState<Staff[]>(initialStaff);
  const [phone, setPhone] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Staff["role"]>("agent");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function showErr(code: string) {
    setErr(ERR_LABELS[code] ?? `Error: ${code}`);
    setInfo(null);
  }

  async function refresh() {
    const res = await fetch("/api/dashboard-selling/staff", { credentials: "same-origin" });
    if (!res.ok) return;
    const data = await res.json();
    setStaff(data.staff ?? []);
  }

  async function addStaff(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setInfo(null);
    setBusy(true);
    try {
      const res = await fetch("/api/dashboard-selling/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ phone, display_name: displayName, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        showErr(data.error || "db_error");
        return;
      }
      setStaff((s) => [...s, data.staff]);
      setPhone("");
      setDisplayName("");
      setRole("agent");
      setInfo("Staff member added.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(p: string, newRole: Staff["role"]) {
    setErr(null);
    setInfo(null);
    const res = await fetch(`/api/dashboard-selling/staff/${encodeURIComponent(p)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ role: newRole }),
    });
    const data = await res.json();
    if (!res.ok) {
      showErr(data.error || "db_error");
      await refresh();
      return;
    }
    setStaff((s) => s.map((x) => (x.phone_e164 === p ? data.staff : x)));
    setInfo("Role updated.");
  }

  async function removeStaff(p: string, name: string | null) {
    const ok = await confirmDialog({
      title: `Remove ${cleanName(name) || p}?`,
      body: "They'll lose dashboard access immediately. Any active session ends on the next request.",
      confirmLabel: "Remove",
      cancelLabel: "Keep",
      destructive: true,
    });
    if (!ok) return;
    const res = await fetch(`/api/dashboard-selling/staff/${encodeURIComponent(p)}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const data = await res.json();
    if (!res.ok) {
      showErr(data.error || "db_error");
      return;
    }
    setStaff((s) => s.filter((x) => x.phone_e164 !== p));
    setInfo("Staff removed.");
  }

  return (
    <>
      <ConfirmDialogHost />

      <section className={styles.section}>
        <h2>Add staff member</h2>
        <form onSubmit={addStaff} className={styles.staffForm}>
          <div className={styles.formField}>
            <label htmlFor="phoneField">Phone (with country code)</label>
            <input
              id="phoneField"
              type="tel"
              placeholder="+31 6 1234 5678 or +91 …"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
              required
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="nameField">Display name</label>
            <input
              id="nameField"
              type="text"
              placeholder="e.g. David van Wachem"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={busy}
              className={styles.formInput}
            />
          </div>
          <div className={styles.formField}>
            <label htmlFor="roleField">Role</label>
            <select
              id="roleField"
              value={role}
              onChange={(e) => setRole(e.target.value as Staff["role"])}
              disabled={busy}
              className={styles.formInput}
            >
              <option value="admin">Admin — full access</option>
              <option value="agent">Agent — view + download</option>
              <option value="viewer">Viewer — metadata only</option>
            </select>
          </div>
          <button type="submit" disabled={busy || !phone} className={styles.btnPrimary}>
            {busy ? "Adding…" : "Add staff"}
          </button>
        </form>
        {err && <div className={styles.inlineErr}>{err}</div>}
        {info && <div className={styles.inlineOk}>{info}</div>}
      </section>

      <section className={styles.section}>
        <h2>All staff ({staff.length})</h2>
        <ul className={styles.staffList}>
          {staff.map((s) => {
            const isSelf = s.phone_e164 === mePhone;
            return (
              <li
                key={s.phone_e164}
                className={`${styles.staffRow} ${isSelf ? styles.staffRowSelf : ""}`}
              >
                <span
                  className={styles.staffAvatar}
                  aria-hidden
                  title={s.role}
                >
                  {initials(s.display_name, s.phone_e164)}
                </span>
                <div className={styles.staffInfo}>
                  <div className={styles.staffName}>
                    {cleanName(s.display_name)}
                    {isSelf && <span className={styles.staffYou}>You</span>}
                  </div>
                  <div className={styles.staffMeta}>
                    {s.phone_e164} · last sign-in {fmtTime(s.last_login_at)}
                  </div>
                </div>
                <select
                  value={s.role}
                  disabled={isSelf}
                  onChange={(e) => changeRole(s.phone_e164, e.target.value as Staff["role"])}
                  className={styles.roleSelect}
                  aria-label="Role"
                  title={ROLE_DESC[s.role]}
                >
                  {(["admin", "agent", "viewer"] as const).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
                {!isSelf && (
                  <button
                    type="button"
                    onClick={() => removeStaff(s.phone_e164, s.display_name)}
                    className={styles.staffRemove}
                    aria-label={`Remove ${cleanName(s.display_name)}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                    Remove
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
