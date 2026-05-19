"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./sell.module.css";
import { Logo } from "@/app/lib/components/Logo";

// Segmented 6-digit OTP input — 6 individual cells that auto-advance.
// Supports paste (full code into any cell), arrow keys, and backspace-to-prev.
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
    if (raw.length === 0) {
      setAt(i, "");
      return;
    }
    if (raw.length === 1) {
      setAt(i, raw);
      if (i < 5) refs.current[i + 1]?.focus();
      return;
    }
    const chars = raw.slice(0, 6 - i).split("");
    const next = digits.slice();
    chars.forEach((c, k) => (next[i + k] = c));
    onChange(next.join(""));
    const focusIdx = Math.min(i + chars.length, 5);
    refs.current[focusIdx]?.focus();
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) {
      e.preventDefault();
      setAt(i - 1, "");
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      refs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      e.preventDefault();
      refs.current[i + 1]?.focus();
    }
  }

  return (
    <div className={styles.otpRow}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={styles.otpCell}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
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

type Lang = "nl" | "en";

type Step = "phone" | "code";

const COPY: Record<Lang, Record<string, string>> = {
  nl: {
    eyebrow: "Inloggen",
    titlePhone: "Begin je verkoop",
    leadPhone: "Vul je mobiele nummer in. We sturen je een 6-cijferige code via WhatsApp.",
    titleCode: "Voer de code in",
    leadCode: "We hebben een code gestuurd naar",
    labelPhone: "Mobiel nummer",
    labelCode: "6-cijferige code",
    placeholderPhone: "06 1234 5678",
    placeholderCode: "••••••",
    ctaSend: "Stuur code via WhatsApp",
    ctaSending: "Bezig met versturen…",
    ctaVerify: "Bevestig en ga verder",
    ctaVerifying: "Controleren…",
    resend: "Code opnieuw sturen",
    changeNumber: "Ander nummer gebruiken",
    stepPhone: "Stap 1 — nummer",
    stepCode: "Stap 2 — code",
    errInvalid: "Vul een geldig Nederlands mobiel nummer in (bv. 06 12 34 56 78).",
    errRate: "Te veel pogingen. Wacht even en probeer opnieuw.",
    errSend: "Versturen via WhatsApp is mislukt. Probeer opnieuw of controleer je nummer.",
    errWrong: "Code klopt niet. Probeer het nog eens.",
    errAttempts: "Te veel verkeerde pogingen. Vraag een nieuwe code aan.",
    errExpired: "Code is verlopen of niet meer actief. Vraag een nieuwe code aan.",
    errGeneric: "Er ging iets mis. Probeer het opnieuw.",
    success: "Code verzonden. Check WhatsApp",
    successDev: "Zoko-keys ontbreken — dev-code:",
    footerHelp: "Hulp nodig?",
    footerPrivacy: "Privacy",
    footerLang: "EN",
  },
  en: {
    eyebrow: "Sign in",
    titlePhone: "Start your sale",
    leadPhone: "Enter your mobile number. We'll send a 6-digit code via WhatsApp.",
    titleCode: "Enter the code",
    leadCode: "We just sent a code to",
    labelPhone: "Mobile number",
    labelCode: "6-digit code",
    placeholderPhone: "+31 6 1234 5678",
    placeholderCode: "••••••",
    ctaSend: "Send code via WhatsApp",
    ctaSending: "Sending…",
    ctaVerify: "Confirm and continue",
    ctaVerifying: "Checking…",
    resend: "Resend code",
    changeNumber: "Use a different number",
    stepPhone: "Step 1 — number",
    stepCode: "Step 2 — code",
    errInvalid: "Enter a valid mobile number (e.g. +31 6 1234 5678).",
    errRate: "Too many attempts. Wait a moment and try again.",
    errSend: "WhatsApp delivery failed. Try again or check the number.",
    errWrong: "That code is incorrect. Try again.",
    errAttempts: "Too many wrong attempts. Request a new code.",
    errExpired: "Code expired or no longer active. Request a new one.",
    errGeneric: "Something went wrong. Please try again.",
    success: "Code sent. Check WhatsApp",
    successDev: "Zoko keys missing — dev code:",
    footerHelp: "Need help?",
    footerPrivacy: "Privacy",
    footerLang: "NL",
  },
};

const ERR_MAP: Record<string, keyof typeof COPY.nl> = {
  invalid_phone: "errInvalid",
  rate_limited: "errRate",
  send_failed: "errSend",
  wrong_code: "errWrong",
  too_many_attempts: "errAttempts",
  no_active_code: "errExpired",
  invalid_input: "errInvalid",
};

type Country = { code: string; flag: string; name: string; example: string };
const COUNTRIES: Country[] = [
  { code: "31", flag: "🇳🇱", name: "Netherlands",   example: "6 1234 5678" },
  { code: "32", flag: "🇧🇪", name: "Belgium",        example: "470 12 34 56" },
  { code: "49", flag: "🇩🇪", name: "Germany",        example: "1512 3456789" },
  { code: "33", flag: "🇫🇷", name: "France",         example: "6 12 34 56 78" },
  { code: "44", flag: "🇬🇧", name: "United Kingdom", example: "7400 123456" },
  { code: "1",  flag: "🇺🇸", name: "United States",  example: "415 555 0132" },
  { code: "1",  flag: "🇨🇦", name: "Canada",         example: "416 555 0132" },
  { code: "91", flag: "🇮🇳", name: "India",          example: "98765 43210" },
  { code: "971",flag: "🇦🇪", name: "United Arab Em.", example: "50 123 4567" },
  { code: "966",flag: "🇸🇦", name: "Saudi Arabia",   example: "50 123 4567" },
  { code: "34", flag: "🇪🇸", name: "Spain",          example: "612 34 56 78" },
  { code: "39", flag: "🇮🇹", name: "Italy",          example: "312 345 6789" },
  { code: "41", flag: "🇨🇭", name: "Switzerland",    example: "78 123 45 67" },
  { code: "43", flag: "🇦🇹", name: "Austria",        example: "664 1234567" },
  { code: "351",flag: "🇵🇹", name: "Portugal",       example: "912 345 678" },
  { code: "46", flag: "🇸🇪", name: "Sweden",         example: "70 123 45 67" },
  { code: "47", flag: "🇳🇴", name: "Norway",         example: "406 12 345" },
  { code: "45", flag: "🇩🇰", name: "Denmark",        example: "20 12 34 56" },
  { code: "358",flag: "🇫🇮", name: "Finland",        example: "40 123 4567" },
  { code: "353",flag: "🇮🇪", name: "Ireland",        example: "85 012 3456" },
  { code: "48", flag: "🇵🇱", name: "Poland",         example: "512 345 678" },
  { code: "90", flag: "🇹🇷", name: "Turkey",         example: "501 234 56 78" },
  { code: "30", flag: "🇬🇷", name: "Greece",         example: "691 234 5678" },
  { code: "420",flag: "🇨🇿", name: "Czech Republic", example: "601 234 567" },
  { code: "36", flag: "🇭🇺", name: "Hungary",        example: "20 123 4567" },
  { code: "40", flag: "🇷🇴", name: "Romania",        example: "712 345 678" },
  { code: "972",flag: "🇮🇱", name: "Israel",         example: "50 123 4567" },
  { code: "27", flag: "🇿🇦", name: "South Africa",   example: "71 123 4567" },
  { code: "61", flag: "🇦🇺", name: "Australia",      example: "412 345 678" },
  { code: "64", flag: "🇳🇿", name: "New Zealand",    example: "21 123 4567" },
];

const ckey = (c: Country) => `${c.flag}:${c.code}`;

export default function SellLoginPage() {
  const [lang, setLang] = useState<Lang>("nl");
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [countryKey, setCountryKey] = useState<string>(ckey(COUNTRIES[0]));
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const t = COPY[lang];
  const country = useMemo(
    () => COUNTRIES.find((c) => ckey(c) === countryKey) ?? COUNTRIES[0],
    [countryKey]
  );

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.language.startsWith("en")) {
      setLang("en");
    }
  }, []);

  const localDigits = useMemo(
    () => phone.replace(/[^\d]/g, "").replace(new RegExp("^" + country.code), ""),
    [phone, country.code]
  );

  const fullE164 = useMemo(
    () => (localDigits ? `+${country.code}${localDigits}` : ""),
    [country.code, localDigits]
  );

  const maskedPhone = useMemo(() => {
    if (!fullE164) return "";
    const visible = fullE164.slice(-3);
    const masked = fullE164.slice(0, -3).replace(/\d/g, "•");
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
        body: JSON.stringify({ phone: fullE164, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        const key = ERR_MAP[data.error] ?? "errGeneric";
        setErr(t[key]);
        return;
      }
      setInfo(t.success);
      if (data.devCode) setDevCode(data.devCode);
      setStep("code");
    } catch {
      setErr(t.errGeneric);
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
        const key = ERR_MAP[data.error] ?? "errGeneric";
        setErr(t[key]);
        return;
      }
      // Post-login redirect:
      //   1. Staff phone → /dashboard-selling (placeholder, not yet wired in main app)
      //   2. ?next= param if present (preserves original destination)
      //   3. Otherwise stay on /sell with a resume flag for returning sellers
      if (data.isStaff) {
        window.location.href = "/dashboard-selling";
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const nextParam = params.get("next");
      const baseTarget =
        nextParam && nextParam.startsWith("/") ? nextParam : "/sell";
      const sep = baseTarget.includes("?") ? "&" : "?";
      const url = data.isReturning ? `${baseTarget}${sep}resume=1` : baseTarget;
      window.location.href = url;
    } catch {
      setErr(t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.root}>
      <header className={styles.topbar}>
        <span
          className={styles.brand}
          style={{ display: "inline-flex", alignItems: "center", gap: 9 }}
        >
          <Logo variant="light" />
          ApartmentHub
        </span>
        <div className={styles.langSwitch} role="group" aria-label="Language">
          <button
            type="button"
            onClick={() => setLang("nl")}
            className={lang === "nl" ? styles.active : ""}
          >
            NL
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={lang === "en" ? styles.active : ""}
          >
            EN
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.eyebrow}>{t.eyebrow}</div>

          <div className={styles.steps} aria-hidden>
            <span className={`${styles.dot} ${styles.on}`} />
            <span className={styles.sep} />
            <span className={`${styles.dot} ${step === "code" ? styles.on : ""}`} />
            <span style={{ marginLeft: 8 }}>
              {step === "phone" ? t.stepPhone : t.stepCode}
            </span>
          </div>

          {step === "phone" ? (
            <form onSubmit={requestCode}>
              <h1 className={styles.title}>{t.titlePhone}</h1>
              <p className={styles.lead}>{t.leadPhone}</p>

              <label className={styles.label} htmlFor="phone">
                {t.labelPhone}
              </label>
              <div className={styles.phoneRow}>
                <span className={styles.countrySelectWrap}>
                  <span className={styles.countryFlag} aria-hidden>
                    {country.flag}
                  </span>
                  <span className={styles.countryDial}>+{country.code}</span>
                  <select
                    className={styles.countrySelect}
                    value={countryKey}
                    onChange={(e) => setCountryKey(e.target.value)}
                    disabled={busy}
                    aria-label="Country"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={ckey(c)} value={ckey(c)}>
                        {c.flag} {c.name} (+{c.code})
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
                  placeholder={country.example}
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
                {busy ? t.ctaSending : t.ctaSend}
              </button>

              {err && <div className={styles.error} role="alert">{err}</div>}
            </form>
          ) : (
            <form onSubmit={verifyCode}>
              <h1 className={styles.title}>{t.titleCode}</h1>
              <p className={styles.lead}>
                {t.leadCode}{" "}
                <span className={styles.maskedPhone}>{maskedPhone}</span>
              </p>

              <label className={styles.label}>{t.labelCode}</label>
              <OtpCells value={code} onChange={setCode} disabled={busy} />

              <button
                type="submit"
                className={styles.cta}
                disabled={busy || code.length !== 6}
              >
                {busy ? t.ctaVerifying : t.ctaVerify}
              </button>

              <div className={styles.footerRow}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setErr(null);
                    setInfo(null);
                    setDevCode(null);
                  }}
                  disabled={busy}
                >
                  {t.changeNumber}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => requestCode()}
                  disabled={busy}
                >
                  {t.resend}
                </button>
              </div>

              {info && !devCode && <div className={styles.success}>{info}</div>}
              {devCode && (
                <div className={styles.devNote}>
                  {t.successDev} <strong>{devCode}</strong>
                </div>
              )}
              {err && <div className={styles.error} role="alert">{err}</div>}
            </form>
          )}
        </div>
      </main>

      <footer className={styles.pageFooter}>
        <a href="/">{lang === "en" ? "Back to home" : "Terug naar home"}</a>
        {" · "}
        <a href="#privacy">{t.footerPrivacy}</a>
      </footer>
    </div>
  );
}
