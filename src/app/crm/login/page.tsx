"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./crm-login.module.css";
import { Logo } from "@/app/lib/components/Logo";
import { COUNTRIES as COUNTRY_NAMES, DIAL_CODES, PHONE_EXAMPLES } from "@/data/countries";

type Step = "phone" | "code";

const ERR_MAP: Record<string, string> = {
  invalid_phone: "Enter a valid mobile number.",
  rate_limited: "Too many attempts. Wait a moment and try again.",
  send_failed: "WhatsApp delivery failed. Try again.",
  wrong_code: "That code is incorrect. Try again.",
  too_many_attempts: "Too many wrong attempts. Request a new code.",
  no_active_code: "Code expired or no longer active. Request a new one.",
  invalid_input: "Enter a valid mobile number.",
  not_staff: "Access denied. This area is for staff only.",
  session_failed: "Could not create a session. Try again.",
};

function OtpCells({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  function setAt(i: number, ch: string) {
    const next = digits.slice();
    next[i] = ch;
    onChange(next.join(""));
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw.length === 0) { setAt(i, ""); return; }
    if (raw.length === 1) { setAt(i, raw); if (i < 5) refs.current[i + 1]?.focus(); return; }
    const chars = raw.slice(0, 6 - i).split("");
    const next = digits.slice();
    chars.forEach((c, k) => (next[i + k] = c));
    onChange(next.join(""));
    refs.current[Math.min(i + chars.length, 5)]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      refs.current[i - 1]?.focus();
    }
  }

  return (
    <div className={styles.otpRow}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          className={styles.otpCell}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

export default function CrmLoginPage() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [countryKey, setCountryKey] = useState("Nederland");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const dialCode = DIAL_CODES[countryKey] ?? "+31";
  const phoneExample = PHONE_EXAMPLES[countryKey] ?? "612345678";
  const numericCode = dialCode.replace("+", "");

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.language.startsWith("en")) {
      // Keep default NL for CRM staff
    }
  }, []);

  const localDigits = useMemo(
    () => phone.replace(/[^\d]/g, "").replace(new RegExp("^" + numericCode), ""),
    [phone, numericCode]
  );

  const fullE164 = useMemo(
    () => (localDigits ? `${dialCode}${localDigits}` : ""),
    [dialCode, localDigits]
  );

  const maskedPhone = useMemo(() => {
    if (!fullE164) return "";
    const visible = fullE164.slice(-3);
    const masked = fullE164.slice(0, -3).replace(/\d/g, "\u2022");
    return masked + visible;
  }, [fullE164]);

  async function requestCode(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setInfo(null);
    setDevCode(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullE164 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(ERR_MAP[data.error] ?? "Something went wrong. Please try again.");
        return;
      }
      setInfo("Code sent. Check WhatsApp.");
      if (data.devCode) setDevCode(data.devCode);
      setStep("code");
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullE164, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(ERR_MAP[data.error] ?? "Something went wrong. Please try again.");
        return;
      }
      if (!data.isStaff) {
        setErr("Access denied. This area is for staff only.");
        return;
      }
      window.location.href = "/crm/kanban";
    } catch {
      setErr("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <span className={styles.brand}>
          <Logo variant="light" />
          <span className={styles.brandSub}>CRM</span>
        </span>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.eyebrow}>Staff Login</div>

          {step === "phone" ? (
            <form onSubmit={requestCode}>
              <h1 className={styles.title}>Sign in to CRM</h1>
              <p className={styles.lead}>
                Enter your mobile number. We&apos;ll send a 6-digit code via WhatsApp.
              </p>

              <label className={styles.label} htmlFor="phone">Mobile number</label>
              <div className={styles.phoneRow}>
                <span className={styles.countrySelectWrap}>
                  <span className={styles.countryDial}>{dialCode}</span>
                  <select
                    className={styles.countrySelect}
                    value={countryKey}
                    onChange={(e) => setCountryKey(e.target.value)}
                    disabled={busy}
                    aria-label="Country"
                  >
                    {COUNTRY_NAMES.map((name) => (
                      <option key={name} value={name}>
                        {name} ({DIAL_CODES[name]})
                      </option>
                    ))}
                  </select>
                </span>
                <input
                  id="phone"
                  className={styles.input}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={phoneExample}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={busy}
                  required
                />
              </div>

              <button
                type="submit"
                className={styles.cta}
                disabled={busy || localDigits.length < 7}
              >
                {busy ? "Sending\u2026" : "Send code via WhatsApp"}
              </button>

              {err && <div className={styles.error} role="alert">{err}</div>}
              {info && !devCode && <div className={styles.success}>{info}</div>}
              {devCode && (
                <div className={styles.devNote}>
                  Dev code: <strong>{devCode}</strong>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <h1 className={styles.title}>Enter the code</h1>
              <p className={styles.lead}>
                We sent a code to <span className={styles.maskedPhone}>{maskedPhone}</span>
              </p>

              <label className={styles.label}>6-digit code</label>
              <OtpCells value={code} onChange={setCode} disabled={busy} />

              <button
                type="submit"
                className={styles.cta}
                disabled={busy || code.length !== 6}
              >
                {busy ? "Checking\u2026" : "Confirm and continue"}
              </button>

              <div className={styles.footerRow}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => { setStep("phone"); setCode(""); setErr(null); setInfo(null); setDevCode(null); }}
                  disabled={busy}
                >
                  Use a different number
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => requestCode()}
                  disabled={busy}
                >
                  Resend code
                </button>
              </div>

              {err && <div className={styles.error} role="alert">{err}</div>}
            </form>
          )}
        </div>
      </main>

      <footer className={styles.pageFooter}>
        <a href="/">Back to home</a>
      </footer>
    </div>
  );
}