'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import styles from './MetaLeadFormB.module.css';

const META_PIXEL_ID = '171580591302554';
const LEAD_ENDPOINT = '/api/meta-lead';
const THANK_YOU = { nl: '/nl/thank-you', en: '/en/thank-you' };
const TERMS_URL = {
  nl: 'https://www.apartmenthub.nl/algemene-voorwaarden',
  en: 'https://www.apartmenthub.nl/en/terms-and-conditions',
};
const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/search/ApartmentHub+Amsterdam';
const GOOGLE_RATING = '4.9';
const VIDEO_SRC = '/images/Apartmenthub%20rent%20in.mp4';

const STRINGS = {
  nl: {
    eyebrow: 'Gratis & vrijblijvend',
    b_title: 'Op zoek naar een huurwoning?',
    b_lead: 'Vertel ons wat je zoekt; ons team stuurt je passende woningen direct via WhatsApp. Gemiddeld binnen 1 minuut antwoord.',
    b_val1: 'Direct contact met woonexperts via WhatsApp',
    b_val2: 'Toegang tot exclusieve woningen die niet online staan',
    b_val3: 'Begeleiding gedurende het hele huurproces',
    greviews: 'Google-recensies',
    back: 'Terug',
    step_count: 'Stap {n} van {t}',
    q_bedrooms: 'Hoeveel slaapkamers zoek je?',
    qs_bedrooms: 'Tik op je voorkeur · 3 korte vragen, ± 30 sec.',
    bed_1: '1 slaapkamer',
    bed_2: '2 slaapkamers',
    bed_3: '3 slaapkamers',
    bed_4: '4+ slaapkamers',
    q_budget: 'Wat is je budget per maand?',
    qs_budget: 'Tik op een prijsklasse.',
    q_contact: 'Waar mogen we de woningen naartoe sturen?',
    qs_contact: 'Laatste stap. Daarna sturen we je passend aanbod.',
    reassure: 'We sturen je pas het aanbod via WhatsApp, geen spam. Je kunt je altijd afmelden via WhatsApp met 1 druk op de knop.',
    video_title: 'Zo werkt ApartmentHub',
    trusted_title: 'Vertrouwd door duizenden',
    trusted_sub: 'We hebben duizenden mensen geholpen aan hun woning in Amsterdam en daarbuiten.',
    stat1: 'Mensen aan een woning geholpen',
    stat2: 'Slaagt binnen 30 dagen',
    stat3: 'Gemiddelde beoordeling',
    stat4: 'WhatsApp-ondersteuning',
    l_name: 'Voornaam & achternaam',
    e_name: 'Vul je naam in.',
    l_phone: 'WhatsApp',
    e_phone: 'Vul een geldig telefoonnummer in (incl. landcode, bijv. +31).',
    l_email: 'E-mailadres (optioneel)',
    e_email: 'Vul een geldig e-mailadres in.',
    add_second: '+ Tweede huurder toevoegen',
    second_title: 'Tweede huurder (optioneel)',
    l_name2: 'Voornaam & achternaam',
    l_phone2: 'WhatsApp',
    e_phone2: 'Vul een geldig telefoonnummer in (incl. landcode, bijv. +31).',
    socialproof: 'Sluit je aan bij honderden huurders. We reageren snel via WhatsApp.',
    priority: 'Via ons krijg je voorrang op de meeste huurwoningen.',
    consent: 'Ik ga akkoord met de',
    consentTerms: 'algemene voorwaarden',
    e_consent: 'Je moet akkoord gaan om verder te gaan.',
    submit: 'Stuur mij woningen op WhatsApp',
    formerror: 'Er ging iets mis. Probeer het opnieuw of neem contact op via WhatsApp.',
    formnote: 'We gebruiken je gegevens alleen om je te helpen bij het vinden van een woning.',
    docTitle: 'ApartmentHub - Vind jouw woning',
  },
  en: {
    eyebrow: 'Free & no obligation',
    b_title: 'Looking for a rental property?',
    b_lead: 'Tell us what you\u2019re looking for and our team sends you matching homes directly via WhatsApp. Average response within 1 minute.',
    b_val1: 'Direct communication with housing experts via WhatsApp',
    b_val2: 'Access to exclusive listings not found online',
    b_val3: 'Support throughout the entire rental process',
    greviews: 'Google reviews',
    back: 'Back',
    step_count: 'Step {n} of {t}',
    q_bedrooms: 'How many bedrooms are you looking for?',
    qs_bedrooms: 'Tap your preference · 3 quick questions, ± 30 sec.',
    bed_1: '1 bedroom',
    bed_2: '2 bedrooms',
    bed_3: '3 bedrooms',
    bed_4: '4+ bedrooms',
    q_budget: 'What\u2019s your monthly budget?',
    qs_budget: 'Tap a price range.',
    q_contact: 'Where can we send the properties?',
    qs_contact: 'Last step. Then we\u2019ll send matching homes.',
    reassure: 'We only send you listings via WhatsApp, no spam. You can unsubscribe anytime via WhatsApp with one tap.',
    video_title: 'How ApartmentHub works',
    trusted_title: 'Trusted by thousands',
    trusted_sub: 'We\u2019ve helped thousands of people find their home in Amsterdam and beyond.',
    stat1: 'People helped find housing',
    stat2: 'Success rate within 30 days',
    stat3: 'Average customer rating',
    stat4: 'WhatsApp support available',
    l_name: 'First & last name',
    e_name: 'Please enter your name.',
    l_phone: 'WhatsApp',
    e_phone: 'Please enter a valid phone number (incl. country code, e.g. +31).',
    l_email: 'Email address (optional)',
    e_email: 'Please enter a valid email address.',
    add_second: '+ Add a second tenant',
    second_title: 'Second tenant (optional)',
    l_name2: 'First & last name',
    l_phone2: 'WhatsApp',
    e_phone2: 'Please enter a valid phone number (incl. country code, e.g. +31).',
    socialproof: 'Join hundreds of tenants. We reply fast on WhatsApp.',
    priority: 'Through us you get priority on most rental properties.',
    consent: 'I agree to the',
    consentTerms: 'Terms and Conditions',
    e_consent: 'You must agree before submitting.',
    submit: 'Send me homes on WhatsApp',
    formerror: 'Something went wrong. Please try again or contact us via WhatsApp.',
    formnote: 'We only use your details to help you find a home.',
    docTitle: 'ApartmentHub - Find your home',
  },
};

const COUNTRY_CODES = [
  { code: '+31', flag: '\uD83C\uDDF3\uD83C\uDDF1', label: 'NL +31' },
  { code: '+32', flag: '\uD83C\uDDE7\uD83C\uDDEA', label: 'BE +32' },
  { code: '+49', flag: '\uD83C\uDDE9\uD83C\uDDEA', label: 'DE +49' },
  { code: '+44', flag: '\uD83C\uDDEC\uD83C\uDDE7', label: 'UK +44' },
  { code: '+33', flag: '\uD83C\uDDEB\uD83C\uDDF7', label: 'FR +33' },
  { code: '+34', flag: '\uD83C\uDDEA\uD83C\uDDF8', label: 'ES +34' },
  { code: '+39', flag: '\uD83C\uDDEE\uD83C\uDDF9', label: 'IT +39' },
  { code: '+351', flag: '\uD83C\uDDF5\uD83C\uDDF9', label: 'PT +351' },
  { code: '+48', flag: '\uD83C\uDDF5\uD83C\uDDF1', label: 'PL +48' },
  { code: '+40', flag: '\uD83C\uDDF7\uD83C\uDDF4', label: 'RO +40' },
  { code: '+90', flag: '\uD83C\uDDF7\uD83C\uDDEA', label: 'TR +90' },
  { code: '+1', flag: '\uD83C\uDDFA\uD83C\uDDF8', label: 'US +1' },
  { code: '+91', flag: '\uD83C\uDDEE\uD83C\uDDF3', label: 'IN +91' },
  { code: '+55', flag: '\uD83C\uDDE7\uD83C\uDDF7', label: 'BR +55' },
  { code: '+63', flag: '\uD83C\uDDF5\uD83C\uDDED', label: 'PH +63' },
];

const BEDROOMS = [
  { value: '1', key: 'bed_1' },
  { value: '2', key: 'bed_2' },
  { value: '3', key: 'bed_3' },
  { value: '4+', key: 'bed_4' },
];

const BUDGETS = [
  { value: '2000-2500', label: '\u20AC2.000 - \u20AC2.500' },
  { value: '2500-3000', label: '\u20AC2.500 - \u20AC3.000' },
  { value: '3000-3500', label: '\u20AC3.000 - \u20AC3.500' },
  { value: '3500-4000', label: '\u20AC3.500 - \u20AC4.000' },
  { value: '4000-4500', label: '\u20AC4.000 - \u20AC4.500' },
];

const STATS = [
  { num: '2.884', key: 'stat1' },
  { num: '98%', key: 'stat2' },
  { num: '5/5', key: 'stat3' },
  { num: '24/7', key: 'stat4' },
];

const E164_RE = /^\+[1-9][0-9]{6,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LS_KEY = 'ah_leadform_b_v1';

function Logo() {
  return (
    <img src="/images/horizontal-logo.png" alt="ApartmentHub" className={styles.logo} />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" />
      <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34A21.99 21.99 0 0 0 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z" />
      <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="9" viewBox="0 0 12 9">
      <path d="M1 4.5l3.5 3.5L11 1" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14">
      <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function combinePhone(cc, phone) {
  const num = (phone || '').replace(/[\s().\-]/g, '');
  if (num.charAt(0) === '+') return num;
  const stripped = num.replace(/^0+/, '');
  return stripped ? cc + stripped : '';
}

function getCookie(name) {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match('(?:^|; )' + name + '=([^;]*)');
  return m ? decodeURIComponent(m[1]) : '';
}

function getTracking() {
  if (typeof window === 'undefined') return { fbp: '', fbc: '', fbclid: '', utm: {}, referrer: '' };
  const p = new URLSearchParams(window.location.search);
  const utm = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((k) => {
    const v = p.get(k);
    if (v) utm[k] = v;
  });
  let fbc = getCookie('_fbc');
  const fbclid = p.get('fbclid');
  if (!fbc && fbclid) fbc = 'fb.1.' + Date.now() + '.' + fbclid;
  return { fbp: getCookie('_fbp'), fbc, fbclid: fbclid || '', utm, referrer: document.referrer || '' };
}

function makeEventId() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) return 'lead_' + window.crypto.randomUUID();
  return 'lead_' + Date.now() + '_' + Math.random().toString(16).slice(2);
}

const MetaLeadFormB = () => {
  const pathname = usePathname();
  const lang = pathname && pathname.includes('/en/') ? 'en' : 'nl';
  const s = STRINGS[lang];
  const pageUrl = lang === 'en' ? '/en/meta-leadform-b' : '/nl/meta-leadform-b';

  const [step, setStep] = useState(1);
  const [bedrooms, setBedrooms] = useState('');
  const [budget, setBudget] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cc, setCc] = useState('+31');
  const [email, setEmail] = useState('');
  const [fullName2, setFullName2] = useState('');
  const [phone2, setPhone2] = useState('');
  const [cc2, setCc2] = useState('+31');
  const [showSecond, setShowSecond] = useState(false);
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errors, setErrors] = useState({});
  const [consentErr, setConsentErr] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef(null);
  const pixelLoadedRef = useRef(false);
  const startedRef = useRef(false);
  const submittingRef = useRef(false);

  const TOTAL = 3;

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = s.docTitle;
  }, [s.docTitle]);

  // Restore from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.ts && Date.now() - d.ts > 7 * 24 * 3600 * 1000) { localStorage.removeItem(LS_KEY); return; }
      if (d.bedrooms) setBedrooms(d.bedrooms);
      if (d.budget) setBudget(d.budget);
      if (d.fullName) setFullName(d.fullName);
      if (d.phone) setPhone(d.phone);
      if (d.cc) setCc(d.cc);
      if (d.email) setEmail(d.email);
      if (d.fullName2) { setFullName2(d.fullName2); setShowSecond(true); }
      if (d.phone2) setPhone2(d.phone2);
      if (d.cc2) setCc2(d.cc2);
      if (d.bedrooms && d.budget) setStep(3);
      else if (d.bedrooms) setStep(2);
    } catch {}
  }, []);

  // Save to localStorage
  const saveState = useCallback(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        bedrooms, budget, fullName, phone, cc, email,
        fullName2, phone2, cc2, ts: Date.now(),
      }));
    } catch {}
  }, [bedrooms, budget, fullName, phone, cc, email, fullName2, phone2, cc2]);

  // Deferred Meta Pixel loading
  useEffect(() => {
    if (pixelLoadedRef.current) return;
    const loadPixel = () => {
      if (pixelLoadedRef.current) return;
      pixelLoadedRef.current = true;
      if (typeof window === 'undefined') return;
      if (!window.fbq) {
        window.fbq = function() { (window.fbq.callMethod ? window.fbq.callMethod.apply(window.fbq, arguments) : window.fbq.queue.push(arguments)); };
        window.fbq.push = window.fbq; window.fbq.loaded = true; window.fbq.version = '2.0'; window.fbq.queue = [];
      }
      window.fbq('init', META_PIXEL_ID);
      window.fbq('track', 'PageView');
      const t = document.createElement('script');
      t.async = true;
      t.src = 'https://connect.facebook.net/en_US/fbevents.js';
      const sc = document.getElementsByTagName('script')[0];
      if (sc && sc.parentNode) sc.parentNode.insertBefore(t, sc);
    };
    ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach((ev) =>
      window.addEventListener(ev, loadPixel, { once: true, passive: true })
    );
    const timer = setTimeout(loadPixel, 3000);
    return () => clearTimeout(timer);
  }, []);

  const goStep = (n) => {
    const next = Math.max(1, Math.min(TOTAL, n));
    setStep(next);
    if (next > 1 && !startedRef.current) {
      startedRef.current = true;
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('trackCustom', 'StartLeadForm', { language: lang, variant: 'B' });
      }
    }
    if (next === 3) {
      setTimeout(() => {
        const el = document.getElementById('fullName');
        if (el) el.focus();
      }, 60);
    }
    try {
      const card = document.querySelector('.' + styles.card);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch {}
  };

  const handleChoice = (name, value) => {
    if (name === 'bedrooms') setBedrooms(value);
    if (name === 'budget') setBudget(value);
    saveState();
    setTimeout(() => goStep(step + 1), 240);
  };

  const validateContact = () => {
    const errs = {};
    let ok = true;
    if (fullName.trim().length < 2) { errs.name = true; ok = false; }
    const phoneOk = E164_RE.test(combinePhone(cc, phone));
    if (!phoneOk) { errs.phone = true; ok = false; }
    const emailVal = email.trim();
    if (emailVal !== '' && !EMAIL_RE.test(emailVal)) { errs.email = true; ok = false; }
    const p2num = (phone2 || '').replace(/[\s().\-]/g, '');
    if (p2num !== '' && !E164_RE.test(combinePhone(cc2, phone2))) { errs.phone2 = true; ok = false; }
    if (!consent) { setConsentErr(true); ok = false; } else { setConsentErr(false); }
    setErrors(errs);
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    setShowError(false);
    if (!bedrooms) { goStep(1); return; }
    if (!budget) { goStep(2); return; }
    if (!validateContact()) {
      const card = document.querySelector('.' + styles.card);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (honeypot) { return; }
    submittingRef.current = true;
    setSubmitting(true);
    const tracking = getTracking();
    const eventId = makeEventId();
    const payload = {
      fullName: fullName.trim(),
      phone: combinePhone(cc, phone),
      email: email.trim().toLowerCase(),
      fullName2: fullName2.trim(),
      phone2: combinePhone(cc2, phone2),
      websiteUrl: honeypot,
      bedrooms,
      budget,
      language: lang,
      consent: true,
      source: (tracking.utm.utm_source === 'facebook' || tracking.utm.utm_source === 'meta' || tracking.fbclid) ? 'meta_ads' : tracking.utm.utm_source === 'instagram' ? 'instagram' : tracking.utm.utm_source === 'google' ? 'google_ads' : tracking.referrer.includes('instagram') ? 'instagram' : tracking.referrer.includes('google') ? 'google_ads' : 'organic',
      sourceUrl: typeof window !== 'undefined' ? window.location.href : '',
      variant: 'B',
      submittedAt: new Date().toISOString(),
      eventId,
      tracking,
      tags: [
        'Meta Ads',
        'variant_b',
        bedrooms === '4+' ? '4+ Bedrooms' : bedrooms === '1' ? '1 Bedroom' : bedrooms + ' Bedrooms',
        '€' + budget.replace('-', ' - €'),
      ],
    };
    try {
      const res = await fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Bad response ' + res.status);
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'Lead', { content_name: 'meta_leadform', language: lang, variant: 'B' }, { eventID: eventId });
      }
      try { localStorage.removeItem(LS_KEY); } catch {}
      window.location.href = THANK_YOU[lang] || THANK_YOU.nl;
    } catch (err) {
      console.error('Lead submit failed:', err);
      submittingRef.current = false;
      setSubmitting(false);
      setShowError(true);
    }
  };

  const handleVideoPlay = () => {
    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play();
      setVideoPlaying(true);
    }
  };

  const stepCountText = s.step_count.replace('{n}', step).replace('{t}', TOTAL);

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <a href={`/${lang}`} className={styles.logoLink} aria-label="ApartmentHub">
          <Logo />
        </a>
        <div className={styles.right}>
          <div className={styles.lang} role="group" aria-label="Taal / Language">
            <a href="/nl/meta-leadform-b" className={lang === 'nl' ? styles.activeLang : ''}>NL</a>
            <a href="/en/meta-leadform-b" className={lang === 'en' ? styles.activeLang : ''}>EN</a>
          </div>
        </div>
      </header>

      <main className={styles.wrap}>
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <p className={styles.eyebrow}>{s.eyebrow}</p>
            <h1 className={styles.heroTitle}>{s.b_title}</h1>
            <p className={styles.heroLead}>{s.b_lead}</p>
            <ul className={styles.usp}>
              <li><span className={styles.emoji}>💬</span><span>{s.b_val1}</span></li>
              <li><span className={styles.emoji}>🔑</span><span>{s.b_val2}</span></li>
              <li><span className={styles.emoji}>🤝</span><span>{s.b_val3}</span></li>
            </ul>
            <div className={styles.trustRow}>
              <a className={styles.gtrust} href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener">
                <GoogleIcon />
                <span className={styles.grate}>{GOOGLE_RATING}</span>
                <span className={styles.gstars}>★★★★★</span>
                <span className={styles.gtext}>{s.greviews}</span>
              </a>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.card}>
              <div className={styles.wizHead}>
                <button
                  type="button"
                  className={`${styles.backBtn} ${step > 1 ? styles.backBtnShow : ''}`}
                  onClick={() => goStep(step - 1)}
                >
                  <BackIcon />
                  <span>{s.back}</span>
                </button>
                <span className={styles.stepCount}>{stepCountText}</span>
              </div>
              <div className={styles.progress}>
                <span className={`${styles.seg} ${step > 1 ? styles.segDone : ''} ${step === 1 ? styles.segActive : ''}`} />
                <span className={`${styles.seg} ${step > 2 ? styles.segDone : ''} ${step === 2 ? styles.segActive : ''}`} />
                <span className={`${styles.seg} ${step === 3 ? styles.segActive : ''}`} />
              </div>

              <form onSubmit={handleSubmit} noValidate>
                {/* Step 1: Bedrooms */}
                <div className={`${styles.step} ${step === 1 ? styles.stepActive : ''}`}>
                  <div className={styles.priority}>
                    <span style={{ fontSize: '15px', lineHeight: 1 }}>🔑</span>
                    <span>{s.priority}</span>
                  </div>
                  <h2 className={styles.stepTitle}>{s.q_bedrooms}</h2>
                  <p className={styles.stepSub}>{s.qs_bedrooms}</p>
                  <div className={styles.choiceGrid}>
                    {BEDROOMS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        className={`${styles.choice} ${bedrooms === b.value ? styles.choiceSelected : ''}`}
                        onClick={() => handleChoice('bedrooms', b.value)}
                      >
                        <span>{s[b.key]}</span>
                        <span className={styles.tick}><CheckIcon /></span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 2: Budget */}
                <div className={`${styles.step} ${step === 2 ? styles.stepActive : ''}`}>
                  <h2 className={styles.stepTitle}>{s.q_budget}</h2>
                  <p className={styles.stepSub}>{s.qs_budget}</p>
                  <div className={styles.choiceGrid}>
                    {BUDGETS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        className={`${styles.choice} ${budget === b.value ? styles.choiceSelected : ''}`}
                        onClick={() => handleChoice('budget', b.value)}
                      >
                        <span>{b.label}</span>
                        <span className={styles.tick}><CheckIcon /></span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Step 3: Contact */}
                <div className={`${styles.step} ${step === 3 ? styles.stepActive : ''}`}>
                  <h2 className={styles.stepTitle}>{s.q_contact}</h2>
                  <p className={styles.stepSub}>{s.qs_contact}</p>

                  <div className={styles.reassure}>
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>💬</span>
                    <span>{s.reassure}</span>
                  </div>

                  <div className={`${styles.field} ${errors.name ? styles.fieldErr : ''}`}>
                    <label className={styles.lbl} htmlFor="fullName">{s.l_name} <span className={styles.req}>*</span></label>
                    <input
                      type="text"
                      id="fullName"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); saveState(); }}
                      className={errors.name ? styles.inputInvalid : ''}
                      autoComplete="name"
                    />
                    {errors.name && <div className={styles.errMsg}>{s.e_name}</div>}
                  </div>

                  <div className={`${styles.field} ${errors.phone ? styles.fieldErr : ''}`}>
                    <label className={styles.lbl} htmlFor="phone">{s.l_phone} <span className={styles.req}>*</span></label>
                    <div className={styles.phoneRow}>
                      <select className={styles.cc} value={cc} onChange={(e) => { setCc(e.target.value); saveState(); }} aria-label="Country code">
                        {COUNTRY_CODES.map((c) => (
                          <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        id="phone"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); saveState(); }}
                        className={errors.phone ? styles.inputInvalid : ''}
                        autoComplete="tel"
                        inputMode="tel"
                        placeholder="6 12345678"
                      />
                    </div>
                    {errors.phone && <div className={styles.errMsg}>{s.e_phone}</div>}
                  </div>

                  <div className={`${styles.field} ${errors.email ? styles.fieldErr : ''}`}>
                    <label className={styles.lbl} htmlFor="email">{s.l_email}</label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); saveState(); }}
                      className={errors.email ? styles.inputInvalid : ''}
                      autoComplete="email"
                    />
                    {errors.email && <div className={styles.errMsg}>{s.e_email}</div>}
                  </div>

                  {/* Honeypot */}
                  <input
                    type="text"
                    className={styles.honeypot}
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  {!showSecond ? (
                    <button type="button" className={styles.addSecond} onClick={() => setShowSecond(true)}>
                      {s.add_second}
                    </button>
                  ) : (
                    <div className={styles.secondPerson}>
                      <p className={styles.subLabel}>{s.second_title}</p>
                      <div className={styles.field}>
                        <label className={styles.lbl} htmlFor="fullName2">{s.l_name2}</label>
                        <input
                          type="text"
                          id="fullName2"
                          value={fullName2}
                          onChange={(e) => { setFullName2(e.target.value); saveState(); }}
                          autoComplete="name"
                        />
                      </div>
                      <div className={`${styles.field} ${errors.phone2 ? styles.fieldErr : ''}`}>
                        <label className={styles.lbl} htmlFor="phone2">{s.l_phone2}</label>
                        <div className={styles.phoneRow}>
                          <select className={styles.cc} value={cc2} onChange={(e) => { setCc2(e.target.value); saveState(); }} aria-label="Country code">
                            {COUNTRY_CODES.map((c) => (
                              <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            id="phone2"
                            value={phone2}
                            onChange={(e) => { setPhone2(e.target.value); saveState(); }}
                            className={errors.phone2 ? styles.inputInvalid : ''}
                            inputMode="tel"
                            placeholder="6 12345678"
                          />
                        </div>
                        {errors.phone2 && <div className={styles.errMsg}>{s.e_phone2}</div>}
                      </div>
                    </div>
                  )}

                  <div className={styles.consent}>
                    <input
                      type="checkbox"
                      id="consent"
                      checked={consent}
                      onChange={(e) => { setConsent(e.target.checked); setConsentErr(false); saveState(); }}
                    />
                    <label htmlFor="consent">
                      {s.consent}{' '}
                      <a href={TERMS_URL[lang]} target="_blank" rel="noopener">{s.consentTerms}</a>.
                    </label>
                  </div>
                  {consentErr && <div className={styles.errMsg} style={{ display: 'block', marginLeft: '2px' }}>{s.e_consent}</div>}

                  <p className={styles.socialProof}>{s.socialproof}</p>

                  <button type="submit" className={`${styles.btn} ${submitting ? styles.btnLoading : ''} ${!consent ? styles.btnLocked : ''}`}>
                    {submitting && <span className={styles.spinner} aria-hidden="true" />}
                    <span>{s.submit}</span>
                  </button>

                  {showError && <div className={`${styles.formError} ${styles.formErrorShow}`}>{s.formerror}</div>}
                  <p className={styles.formNote}>{s.formnote}</p>
                </div>
              </form>
            </div>
          </div>
        </section>

        <section className={styles.videoSection}>
          <h2 className={styles.secTitle}>{s.video_title}</h2>
          <div className={styles.videoWrap}>
            <video
              ref={videoRef}
              src={`${VIDEO_SRC}#t=0.1`}
              controls
              muted
              playsInline
              preload="metadata"
              onEnded={() => setVideoPlaying(false)}
            />
            {!videoPlaying && (
              <button className={styles.videoPlay} onClick={handleVideoPlay} aria-label="Play video">
                <PlayIcon />
              </button>
            )}
          </div>
        </section>

        <section className={styles.trusted}>
          <h2 className={styles.secTitle}>{s.trusted_title}</h2>
          <p className={styles.secSub}>{s.trusted_sub}</p>
          <div className={styles.stats}>
            {STATS.map((stat) => (
              <div key={stat.key} className={styles.stat}>
                <div className={styles.num}>{stat.num}</div>
                <div className={styles.slbl}>{s[stat.key]}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} ApartmentHub</span> ·
        <a href="https://www.apartmenthub.nl" target="_blank" rel="noopener">apartmenthub.nl</a>
      </footer>
    </div>
  );
};

export default MetaLeadFormB;