"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../dashboard-selling.module.css";

// "From" identities the staff member can send under.
// mailto: spec allows the `from` query param but only Apple Mail / some
// desktop clients honor it — Gmail web ignores it. We still pass it as a
// hint AND include a "On behalf of …" prefix in the subject so the
// outgoing message is unambiguous regardless of client.
const FROM_OPTIONS = [
  { id: "david",   label: "David",   email: "david@apartmenthub.nl"   },
  { id: "info",    label: "Info",    email: "info@apartmenthub.nl"    },
  { id: "finance", label: "Finance", email: "finance@apartmenthub.nl" },
] as const;

type Props = {
  sellerName: string;
  sellerEmail: string | null;
  sellerPhone: string | null; // +E.164 — primary sign-in phone
};

export function ContactActions({ sellerName, sellerEmail, sellerPhone }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Close the dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Build mailto: + Gmail-web URLs for a chosen "from" identity. We return
  // both so the user can pick whichever launches reliably on their setup
  // (Chrome with no default mail handler ignores window.location = mailto:).
  function mailUrls(fromEmail: string) {
    const subject = `Re: je verkoopdossier bij ApartmentHub`;
    const body = `Beste ${sellerName.split(" ")[0] || "klant"},\n\n\n\n— ApartmentHub team\n${fromEmail}`;
    const to = sellerEmail ?? "";
    const mailto =
      `mailto:${to}?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}` +
      `&from=${encodeURIComponent(fromEmail)}`;
    const gmail =
      `https://mail.google.com/mail/?view=cm&fs=1` +
      `&to=${encodeURIComponent(to)}` +
      `&su=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}` +
      `&authuser=${encodeURIComponent(fromEmail)}`;
    return { mailto, gmail };
  }

  function openWhatsApp() {
    if (!sellerPhone) return;
    const digits = sellerPhone.replace(/[^\d]/g, ""); // strip +, spaces
    const text = `Hoi ${sellerName.split(" ")[0] || ""}, ik bel je vanuit ApartmentHub over je verkoopdossier.`;
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const canEmail = Boolean(sellerEmail);
  const canWhatsApp = Boolean(sellerPhone);

  return (
    <>
      {/* Email button + from-picker dropdown */}
      <div ref={wrapRef} style={{ position: "relative", display: "inline-flex" }}>
        <button
          type="button"
          className={styles.btnSecondary}
          disabled={!canEmail}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          title={canEmail ? undefined : "No email on file for this seller"}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
            <polyline points="22,6 12,13 2,6" />
          </svg>
          Email seller
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, opacity: 0.6 }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              minWidth: 240,
              background: "#fff",
              border: "1px solid var(--line)",
              borderRadius: 10,
              boxShadow: "0 12px 32px rgba(16, 24, 40, 0.12)",
              padding: 6,
              zIndex: 100,
              animation: "fadeIn .12s ease-out",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--grey-soft)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                padding: "8px 10px 6px",
              }}
            >
              Send from
            </div>
            {FROM_OPTIONS.map((opt) => {
              const urls = mailUrls(opt.email);
              return (
                <div
                  key={opt.id}
                  role="menuitem"
                  style={{
                    padding: "8px 10px",
                    borderRadius: 6,
                    transition: "background .1s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--soft)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--grey-soft)", margin: "1px 0 6px" }}>
                    {opt.email}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <a
                      href={urls.mailto}
                      onClick={() => setOpen(false)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        background: "#fff",
                        border: "1px solid var(--line)",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--teal-dark)",
                        textDecoration: "none",
                      }}
                    >
                      Mail app
                    </a>
                    <a
                      href={urls.gmail}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => setOpen(false)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        background: "#fff",
                        border: "1px solid var(--line)",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--teal-dark)",
                        textDecoration: "none",
                      }}
                    >
                      Gmail web ↗
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* WhatsApp seller button */}
      <button
        type="button"
        className={styles.btnSecondary}
        disabled={!canWhatsApp}
        onClick={openWhatsApp}
        title={canWhatsApp ? undefined : "No phone on file for this seller"}
        style={{
          color: "#15803D",
          borderColor: canWhatsApp ? "rgba(21, 128, 61, 0.25)" : undefined,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.768.967-.941 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
        WhatsApp seller
      </button>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}
