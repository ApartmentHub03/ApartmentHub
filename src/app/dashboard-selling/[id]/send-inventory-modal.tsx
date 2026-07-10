"use client";

import { useState } from "react";
import styles from "../dashboard-selling.module.css";

export function SendInventoryModal({
  dossierId,
  sellerEmail,
  sellerName,
  onClose,
}: {
  dossierId: string;
  sellerEmail: string | null;
  sellerName: string;
  onClose: () => void;
}) {
  const [recipientEmail, setRecipientEmail] = useState(sellerEmail || "");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    url: string;
    email_sent: boolean;
    email_error?: string;
  } | null>(null);

  const handleSubmit = async () => {
    setSending(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/dashboard-selling/dossiers/${dossierId}/send-inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_email: recipientEmail.trim() || undefined,
            custom_message: customMessage.trim() || undefined,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.detail || "Failed");
        return;
      }
      setResult({
        url: data.url,
        email_sent: data.email_sent ?? false,
        email_error: data.email_error,
      });
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
          maxWidth: 480,
          width: "100%",
          padding: "24px 24px 20px",
          boxShadow: "0 20px 50px rgba(15,23,42,0.3)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {result ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 12 }}>
              Lijst van zaken verzonden
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
            {!result.email_sent && (
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
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
              Lijst van zaken versturen
            </div>
            <div style={{ fontSize: 13, color: "var(--grey)", marginBottom: 16 }}>
              Stuurt een email naar {sellerName || "de verkoper"} met een link om de lijst van zaken in te vullen.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--grey)", display: "block", marginBottom: 4 }}>
                Recipient email
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="verkoper@email.nl"
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--line)", borderRadius: 8, fontSize: 13 }}
              />
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
                disabled={sending || !recipientEmail.trim()}
              >
                {sending ? "Verzenden..." : "Versturen"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}