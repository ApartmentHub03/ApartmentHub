"use client";

import { useEffect, useState } from "react";

export type ConfirmOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

let opener: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

// Programmatic API: confirmDialog({title, body, ...}).then(ok => ...)
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!opener) return Promise.resolve(window.confirm(opts.title + (opts.body ? "\n\n" + opts.body : "")));
  return opener(opts);
}

// Mount this once at the page root.
export function ConfirmDialogHost() {
  const [state, setState] = useState<
    | (ConfirmOptions & { resolve: (ok: boolean) => void; open: boolean })
    | null
  >(null);

  useEffect(() => {
    opener = (opts) =>
      new Promise<boolean>((resolve) => {
        setState({ ...opts, open: true, resolve });
      });
    return () => {
      opener = null;
    };
  }, []);

  useEffect(() => {
    if (!state?.open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.open]);

  function close(ok: boolean) {
    if (!state) return;
    state.resolve(ok);
    setState(null);
  }

  if (!state?.open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(16,24,40,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
        animation: "fadeIn .15s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close(false);
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "20px 22px 18px",
          maxWidth: 420,
          width: "100%",
          boxShadow: "0 16px 48px rgba(16,24,40,0.25)",
          animation: "popIn .18s ease-out",
        }}
      >
        <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: "#1A202C" }}>
          {state.title}
        </h3>
        {state.body && (
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "#4A5568", lineHeight: 1.5 }}>
            {state.body}
          </p>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={() => close(false)}
            style={{
              padding: "8px 14px",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              background: "#fff",
              color: "#4A5568",
              fontWeight: 500,
              fontSize: 14,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            {state.cancelLabel ?? "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            autoFocus
            style={{
              padding: "8px 14px",
              border: 0,
              borderRadius: 8,
              background: state.destructive ? "#B42318" : "#FF7D28",
              color: "#fff",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            {state.confirmLabel ?? "OK"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
}
