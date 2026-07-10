"use client";

import { useState } from "react";
import styles from "../dashboard-selling.module.css";
import { SendInventoryModal } from "./send-inventory-modal";

export function SendInventoryButton({
  dossierId,
  sellerEmail,
  sellerName,
}: {
  dossierId: string;
  sellerEmail: string | null;
  sellerName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className={styles.btnSecondary}
        onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h6" />
          <path d="M15 5h6a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-6" />
          <path d="M9 7h6v10H9z" />
          <line x1="12" y1="11" x2="12" y2="13" />
          <path d="M6 15h.01" />
          <path d="M18 15h.01" />
        </svg>
        Lijst van zaken
      </button>
      {open && (
        <SendInventoryModal
          dossierId={dossierId}
          sellerEmail={sellerEmail}
          sellerName={sellerName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}