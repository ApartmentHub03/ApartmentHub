"use client";

import { useState, useEffect } from "react";
import styles from "../dashboard-selling.module.css";
import { CreateMagicLinkModal } from "./create-magic-link-modal";

type MagicLink = {
  id: string;
  token: string;
  role: string;
  required_documents: string[];
  recipient_email: string | null;
  recipient_name: string | null;
  expires_at: string;
  revoked_at: string | null;
  used_count: number;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  vve: "VvE",
  notary: "Notary",
  lawyer: "Lawyer",
  partner: "Partner",
  buyer: "Buyer",
  seller: "Seller",
};

const ROLE_COLORS: Record<string, string> = {
  vve: "#009B8A",
  notary: "#1D4ED8",
  lawyer: "#7C3AED",
  partner: "#B7791F",
  buyer: "#15803D",
  seller: "#B42318",
};

export function MagicLinksSection({
  dossierId,
  initialLinks,
  canCreate,
  dossierAddress,
  prefillVveEmail,
  prefillVveName,
}: {
  dossierId: string;
  initialLinks: MagicLink[];
  canCreate: boolean;
  dossierAddress: string;
  prefillVveEmail?: string | null;
  prefillVveName?: string | null;
}) {
  const [links, setLinks] = useState(initialLinks);
  const [showModal, setShowModal] = useState(false);
  const [modalPrefill, setModalPrefill] = useState<{ role: string; email: string; name: string }>({ role: "vve", email: "", name: "" });

  const openModal = (role: string, email?: string, name?: string) => {
    setModalPrefill({ role, email: email || "", name: name || "" });
    setShowModal(true);
  };

  const revokeLink = async (linkId: string) => {
    try {
      const res = await fetch(`/api/admin/magic-links/${linkId}/revoke`, { method: "POST" });
      if (res.ok) {
        setLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, revoked_at: new Date().toISOString() } : l)));
      }
    } catch {}
  };

  const copyLink = (token: string) => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/upload/${token}`);
  };

  const statusOf = (l: MagicLink) => {
    if (l.revoked_at) return { label: "Revoked", color: "var(--danger)", bg: "var(--danger-soft)" };
    if (new Date(l.expires_at) < new Date()) return { label: "Expired", color: "var(--grey-soft)", bg: "var(--bg)" };
    return { label: "Active", color: "var(--ok)", bg: "var(--ok-soft)" };
  };

  return (
    <div className={styles.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Upload links</h2>
        {canCreate && (
          <button className={styles.btnPrimary} style={{ fontSize: 12, padding: "6px 14px" }} onClick={() => openModal("vve", prefillVveEmail ?? undefined, prefillVveName ?? undefined)}>
            + Create link
          </button>
        )}
      </div>
      {links.length === 0 ? (
        <div className={styles.empty}>No upload links created yet.</div>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {links.map((l) => {
            const st = statusOf(l);
            return (
              <li
                key={l.id}
                style={{
                  padding: "12px 14px",
                  marginBottom: 8,
                  borderRadius: 10,
                  border: "1px solid var(--line)",
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        borderRadius: 999,
                        background: (ROLE_COLORS[l.role] || "var(--grey)") + "18",
                        color: ROLE_COLORS[l.role] || "var(--grey)",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {ROLE_LABELS[l.role] || l.role}
                    </span>
                    <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
                      {l.recipient_name || l.recipient_email || "—"}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 9px",
                      borderRadius: 999,
                      background: st.bg,
                      color: st.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {st.label}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--grey-soft)", marginBottom: 6 }}>
                  {l.required_documents.length > 0
                    ? l.required_documents.join(", ")
                    : "No specific documents"}
                  {" · "}
                  Used {l.used_count}x
                  {" · "}
                  Expires {new Date(l.expires_at).toLocaleDateString()}
                </div>
                {l.recipient_email && (
                  <div style={{ fontSize: 12, color: "var(--grey-soft)", marginBottom: 6 }}>
                    {l.recipient_email}
                  </div>
                )}
                <div style={{ display: "flex", gap: 6 }}>
                  {!l.revoked_at && new Date(l.expires_at) >= new Date() && (
                    <>
                      <button
                        className={styles.btnSecondary}
                        style={{ fontSize: 11, padding: "4px 10px" }}
                        onClick={() => copyLink(l.token)}
                      >
                        Copy link
                      </button>
                      <button
                        className={styles.btnSecondary}
                        style={{ fontSize: 11, padding: "4px 10px", color: "var(--danger)", borderColor: "var(--danger-soft)" }}
                        onClick={() => revokeLink(l.id)}
                      >
                        Revoke
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {showModal && (
        <CreateMagicLinkModal
          dossierId={dossierId}
          dossierAddress={dossierAddress}
          prefillRole={modalPrefill.role}
          prefillEmail={modalPrefill.email}
          prefillName={modalPrefill.name}
          onClose={() => setShowModal(false)}
          onCreated={() => {
            setShowModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}