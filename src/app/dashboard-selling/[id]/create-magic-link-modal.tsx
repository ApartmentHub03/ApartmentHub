"use client";

import { useState, useEffect } from "react";
import styles from "../dashboard-selling.module.css";
import { DOC_KEYS, DOC_DESCRIPTIONS, ROLE_DEFAULT_DOCS } from "@/app/lib/doc-descriptions";

const ROLES = ["vve", "notary", "lawyer", "partner", "buyer", "seller"] as const;
const ROLE_LABELS: Record<string, string> = {
  vve: "VvE",
  notary: "Notary",
  lawyer: "Lawyer",
  partner: "Partner",
  buyer: "Buyer",
  seller: "Seller",
};

export function CreateMagicLinkModal({
  dossierId,
  dossierAddress,
  prefillRole,
  prefillEmail,
  prefillName,
  onClose,
  onCreated,
}: {
  dossierId: string;
  dossierAddress: string;
  prefillRole?: string;
  prefillEmail?: string;
  prefillName?: string;
  onClose: () => void;
  onCreated?: (result: { url: string; role: string; email_sent: boolean }) => void;
}) {
  const [role, setRole] = useState(prefillRole || "vve");
  const [recipientEmail, setRecipientEmail] = useState(prefillEmail || "");
  const [recipientName, setRecipientName] = useState(prefillName || "");
  const [sendEmail, setSendEmail] = useState(!!prefillEmail);
  const [customMessage, setCustomMessage] = useState("");
  const [expiresDays, setExpiresDays] = useState(30);
  const [selectedDocs, setSelectedDocs] = useState<string[]>(() => {
    const defaults = ROLE_DEFAULT_DOCS[prefillRole || "vve"] ?? [];
    return [...defaults];
  });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ url: string; email_sent: boolean; email_error?: string } | null>(null);

  useEffect(() => {
    setSendEmail(!!recipientEmail.trim());
  }, [recipientEmail]);

  const toggleDoc = (key: string) => {
    setSelectedDocs((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const shouldSendEmail = sendEmail && !!recipientEmail.trim();
  const buttonText = sending
    ? "Creating\u2026"
    : shouldSendEmail
      ? "Create & send email"
      : "Create link";

  const handleSubmit = async () => {
    setSending(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        dossier_id: dossierId,
        role,
        required_documents: selectedDocs,
        recipient_email: recipientEmail.trim() || undefined,
        recipient_name: recipientName.trim() || undefined,
        custom_message: customMessage.trim() || undefined,
        expires_in_days: expiresDays,
      };

      const endpoint = shouldSendEmail
        ? "/api/admin/magic-links/send-email"
        : "/api/admin/magic-links";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.detail || "Failed");
        return;
      }
      setResult({ url: data.url, email_sent: data.email_sent ?? false, email_error: data.email_error });
      onCreated?.(data);
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
    }
  };

  const copyUrl = () => {
    if (result?.url) navigator.clipboard.writeText(result.url);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15,23,42,0.5)",
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          maxWidth: 520,
          width: "100%",
          padding: "24px 24px 20px",
          boxShadow: "0 20px 50px rgba(15,23,42,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {result ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              Link created
            </div>
            <div
              style={{
                padding: "10px 12px",
                border: "1px solid var(--line)",
                borderRadius: 8,
                fontSize: 13,
                wordBreak: "break-all",
                background: "var(--bg)",
                marginBottom: 12,
              }}
            >
              {result.url}
            </div>
            {result.email_sent && (
              <div style={{ fontSize: 13, color: "var(--ok)", marginBottom: 12 }}>
                Email sent to {recipientEmail}
              </div>
            )}
            {!result.email_sent && shouldSendEmail && (
              <div style={{ fontSize: 13, color: "var(--amber)", marginBottom: 12 }}>
                Email failed to send. Copy the link manually.
                {result.email_error && (
                  <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 4 }}>
                    {result.email_error}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className={styles.btnSecondary} onClick={copyUrl}>
                Copy link
              </button>
              <button className={styles.btnPrimary} onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 16 }}>
              Create upload link
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--grey)", display: "block", marginBottom: 4 }}>
                Role
              </label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  const defaults = ROLE_DEFAULT_DOCS[e.target.value] ?? [];
                  setSelectedDocs([...defaults]);
                }}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--grey)", display: "block", marginBottom: 4 }}>
                  Recipient email
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="beheer@vve.nl"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--grey)", display: "block", marginBottom: 4 }}>
                  Recipient name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Beheerder BVV"
                  style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
                />
              </div>
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                fontSize: 12,
                color: !recipientEmail.trim() ? "var(--grey-soft)" : "var(--ink)",
                cursor: !recipientEmail.trim() ? "not-allowed" : "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={() => setSendEmail(!sendEmail)}
                disabled={!recipientEmail.trim()}
                style={{ width: 15, height: 15, accentColor: "var(--teal)" }}
              />
              Send email to recipient
              {!recipientEmail.trim() && (
                <span style={{ fontSize: 11, color: "var(--grey-soft)", fontStyle: "italic" }}>
                  Enter email to enable
                </span>
              )}
            </label>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--grey)", display: "block", marginBottom: 4 }}>
                Expiry
              </label>
              <select
                value={expiresDays}
                onChange={(e) => setExpiresDays(Number(e.target.value))}
                style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--grey)", display: "block", marginBottom: 6 }}>
                Required documents
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DOC_KEYS.map((k) => (
                  <label
                    key={k}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 10px",
                      border: `1px solid ${selectedDocs.includes(k) ? "var(--teal)" : "var(--line)"}`,
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      background: selectedDocs.includes(k) ? "var(--soft)" : "#fff",
                      color: selectedDocs.includes(k) ? "var(--teal-dark)" : "var(--grey)",
                      fontWeight: 500,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocs.includes(k)}
                      onChange={() => toggleDoc(k)}
                      style={{ width: 14, height: 14, accentColor: "var(--teal)" }}
                    />
                    {DOC_DESCRIPTIONS[k]?.en ?? k}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--grey)", display: "block", marginBottom: 4 }}>
                Custom message (optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={2}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13, resize: "vertical" }}
              />
            </div>

            {error && (
              <div style={{ fontSize: 12, color: "var(--danger)", marginBottom: 10 }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Cancel
              </button>
              <button
                className={styles.btnPrimary}
                onClick={handleSubmit}
                disabled={sending || selectedDocs.length === 0}
              >
                {buttonText}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}