'use client';

import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { translations } from '../data/translations';
import { supabase } from '../integrations/supabase/client';
import { NEIGHBORHOOD_PRICES, formatEUR } from '../lib/valuation';
import { Phone, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, ClipboardList } from 'lucide-react';
import Button from '../components/ui/Button';
import styles from './BuyingPower.module.css';

const DAVID_TEL = '+31641439378';

const BUDGET_BANDS = [
  { label: 'Tot EUR 500.000', value: 'tot-500k', koopkracht: 500000 },
  { label: 'EUR 500.000 tot 750.000', value: '500-750k', koopkracht: 750000 },
  { label: 'EUR 750.000 tot 1.000.000', value: '750k-1m', koopkracht: 1000000 },
  { label: 'EUR 1.000.000 tot 1.500.000', value: '1-1.5m', koopkracht: 1500000 },
  { label: 'EUR 1.500.000+', value: '1.5m+', koopkracht: 1750000 },
];

const BEDROOM_OPTIONS = ['1', '2', '3', '4+'];
const BEDROOM_MIN_M2 = { '1': 45, '2': 65, '3': 85, '4+': 110 };

const CITIES = [
  { value: 'amsterdam', labelNl: 'Amsterdam', labelEn: 'Amsterdam' },
  { value: 'utrecht', labelNl: 'Midden Nederland', labelEn: 'Central Netherlands' },
];

const verdictCardClass = { green: styles.resultCardGreen, orange: styles.resultCardOrange, red: styles.resultCardRed };
const verdictIconClass = { green: styles.resultIconGreen, orange: styles.resultIconOrange, red: styles.resultIconRed };
const verdictBadgeClass = { green: styles.resultBadgeGreen, orange: styles.resultBadgeOrange, red: styles.resultBadgeRed };
const verdictBadge = {
  green: { nl: 'Haalbaar', en: 'Feasible' },
  orange: { nl: 'Krap', en: 'Tight' },
  red: { nl: 'Niet haalbaar', en: 'Not feasible' },
};
const verdictIcon = { green: CheckCircle2, orange: AlertTriangle, red: XCircle };

const BuyingPower = () => {
  const currentLang = useSelector((state) => state.ui.language);
  const t = translations.buyingPower[currentLang] || translations.buyingPower.en;
  const isNl = currentLang === 'nl';

  const defaultCity = 'amsterdam';
  const [step, setStep] = useState(1);
  const [s1, setS1] = useState({ budgetBand: '', city: defaultCity, wijken: [], minM2: '', minSlaapkamers: '' });
  const [s2, setS2] = useState({ voornaam: '', achternaam: '', email: '', telefoon: '+31 ', akkoord: false });
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');

  const wijkOptions = useMemo(() => Object.entries(NEIGHBORHOOD_PRICES[s1.city]), [s1.city]);
  const koopkracht = BUDGET_BANDS.find((b) => b.value === s1.budgetBand)?.koopkracht ?? 0;
  const minM2Num = Number(s1.minM2) || 0;

  const validStep1 = () => !!s1.budgetBand && s1.wijken.length > 0 && minM2Num > 0 && !!s1.minSlaapkamers;
  const validStep2 = () =>
    s2.voornaam && s2.achternaam && /\S+@\S+\.\S+/.test(s2.email) &&
    s2.telefoon.replace(/\D/g, '').length >= 9 && s2.akkoord;

  const toggleWijk = (w) => {
    setS1((prev) => ({
      ...prev,
      wijken: prev.wijken.includes(w) ? prev.wijken.filter((x) => x !== w) : [...prev.wijken, w],
    }));
  };

  const computeResults = () => {
    const prices = NEIGHBORHOOD_PRICES[s1.city];
    const requiredM2 = Math.max(minM2Num, BEDROOM_MIN_M2[s1.minSlaapkamers] ?? 0);
    const selected = s1.wijken.map((w) => {
      const p = prices[w];
      const haalbareM2 = Math.round(koopkracht / p);
      let verdict, message;
      if (haalbareM2 >= requiredM2) {
        verdict = 'green';
        message = isNl
          ? `In ${w} koop je met dit budget ca. ${haalbareM2} m2, ruim genoeg voor ${s1.minSlaapkamers} slaapkamer(s).`
          : `In ${w} you can buy approx. ${haalbareM2} m2 with this budget, more than enough for ${s1.minSlaapkamers} bedroom(s).`;
      } else if (haalbareM2 >= requiredM2 * 0.9) {
        verdict = 'orange';
        message = isNl
          ? `In ${w} koop je ca. ${haalbareM2} m2, krap voor ${s1.minSlaapkamers} slaapkamer(s) (richtlijn ~${requiredM2} m2). Haalbaar met scherp bieden.`
          : `In ${w} you can buy approx. ${haalbareM2} m2, tight for ${s1.minSlaapkamers} bedroom(s) (guideline ~${requiredM2} m2). Feasible with sharp bidding.`;
      } else {
        verdict = 'red';
        message = isNl
          ? `Niet haalbaar: in ${w} koop je ca. ${haalbareM2} m2, maar ${s1.minSlaapkamers} slaapkamer(s) vraagt minimaal ~${requiredM2} m2.`
          : `Not feasible: in ${w} you can buy approx. ${haalbareM2} m2, but ${s1.minSlaapkamers} bedroom(s) requires at least ~${requiredM2} m2.`;
      }
      return { wijk: w, pricePerM2: p, haalbareM2, verdict, message };
    });

    const anyFits = selected.some((r) => r.verdict === 'green');
    let sugs = [];
    if (!anyFits) {
      sugs = Object.entries(prices)
        .filter(([w]) => !s1.wijken.includes(w))
        .map(([w, p]) => {
          const haalbareM2 = Math.round(koopkracht / p);
          return {
            wijk: w, pricePerM2: p, haalbareM2, verdict: 'green',
            message: isNl ? `In ${w} haal je ca. ${haalbareM2} m2 met jouw budget.` : `In ${w} you can afford approx. ${haalbareM2} m2 with your budget.`,
          };
        })
        .filter((r) => r.haalbareM2 >= requiredM2)
        .sort((a, b) => a.pricePerM2 - b.pricePerM2)
        .slice(0, 3);
    }
    return { selected, suggestions: sugs };
  };

  const onSubmitStep2 = async () => {
    if (!validStep2()) {
      setError(isNl ? 'Vul alle verplichte velden in.' : 'Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const { error: dbError } = await supabase.from('koopkracht_leads').insert({
        stad: s1.city === 'utrecht' ? 'Midden Nederland' : 'Amsterdam',
        wijken: s1.wijken,
        budget_band: BUDGET_BANDS.find((b) => b.value === s1.budgetBand)?.label ?? s1.budgetBand,
        koopkracht,
        min_m2: minM2Num,
        min_slaapkamers: s1.minSlaapkamers,
        voornaam: s2.voornaam,
        achternaam: s2.achternaam,
        email: s2.email,
        telefoon: s2.telefoon,
      });
      if (dbError) console.warn('DB insert skipped:', dbError);
      const r = computeResults();
      setResults(r.selected);
      setSuggestions(r.suggestions);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError(isNl ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;
  const backLink = isNl ? '/nl/koop' : '/en/buy';
  const termsLink = isNl ? '/nl/algemene-voorwaarden' : '/en/terms-and-conditions';
  const privacyLink = isNl ? '/nl/privacyverklaring' : '/en/privacy-policy';
  const leadLink = isNl ? '/nl/koop/lead' : '/en/buy/lead';

  const renderResultCard = (r) => {
    const Icon = verdictIcon[r.verdict];
    return (
      <div key={r.wijk} className={`${styles.resultCard} ${verdictCardClass[r.verdict]}`}>
        <Icon className={`${styles.resultIcon} ${verdictIconClass[r.verdict]}`} />
        <div className={styles.resultContent}>
          <div className={styles.resultTitleRow}>
            <span className={styles.resultWijk}>{r.wijk}</span>
            <span className={`${styles.resultBadge} ${verdictBadgeClass[r.verdict]}`}>
              {isNl ? verdictBadge[r.verdict].nl : verdictBadge[r.verdict].en}
            </span>
          </div>
          <p className={styles.resultMessage}>{r.message}</p>
          <p className={styles.resultPrice}>{isNl ? 'Gem.' : 'Avg.'} {formatEUR(r.pricePerM2)}/m²</p>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.inner}>
        <div>
          <Link href={backLink} className={styles.backLink}>
            <ArrowLeft style={{ width: '1rem', height: '1rem' }} />{t.backLink}
          </Link>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.stepLabel}>{isNl ? `Stap ${step} van 3` : `Step ${step} of 3`}</p>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardContent}>
            {error && <p className={styles.errorText}>{error}</p>}

            {step === 1 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t.step1Title}</h2>
                <p className={styles.sectionDesc}>{t.step1Desc}</p>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t.budgetLabel}</label>
                  <div className={styles.chipGroup}>
                    {BUDGET_BANDS.map((b) => (
                      <button key={b.value} type="button" onClick={() => setS1({ ...s1, budgetBand: b.value })}
                        className={`${styles.chipButton} ${s1.budgetBand === b.value ? styles.chipButtonSelected : ''}`}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t.cityLabel}</label>
                  <div className={styles.cityGroup}>
                    {CITIES.map((c) => (
                      <button key={c.value} type="button" onClick={() => setS1({ ...s1, city: c.value, wijken: [] })}
                        className={`${styles.cityButton} ${s1.city === c.value ? styles.cityButtonSelected : ''}`}>
                        {isNl ? c.labelNl : c.labelEn}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t.wijkenLabel}</label>
                  <div className={styles.wijkGrid}>
                    {wijkOptions.map(([w, p]) => {
                      const selected = s1.wijken.includes(w);
                      return (
                        <button key={w} type="button" onClick={() => toggleWijk(w)}
                          className={`${styles.wijkButton} ${selected ? styles.wijkButtonSelected : ''}`}>
                          {selected && (
                            <span className={styles.wijkCheckIcon}>
                              <CheckCircle2 style={{ width: '0.75rem', height: '0.75rem' }} strokeWidth={3} />
                            </span>
                          )}
                          <div>{w}</div>
                          <div className={selected ? styles.wijkPriceSelected : styles.wijkPrice}>{formatEUR(p)}/m²</div>
                        </button>
                      );
                    })}
                  </div>
                  {s1.wijken.length > 0 && (
                    <p className={styles.wijkCount}>{s1.wijken.length} {isNl ? 'wijk(en) geselecteerd' : 'neighborhood(s) selected'}</p>
                  )}
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t.minM2Label}</label>
                  <input type="number" min="1" value={s1.minM2} onChange={(e) => setS1({ ...s1, minM2: e.target.value })} placeholder="75" className={styles.inputField} />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t.bedroomsLabel}</label>
                  <div className={styles.chipGroup}>
                    {BEDROOM_OPTIONS.map((b) => (
                      <button key={b} type="button" onClick={() => setS1({ ...s1, minSlaapkamers: b })}
                        className={`${styles.chipButton} ${s1.minSlaapkamers === b ? styles.chipButtonSelected : ''}`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <Button fullWidth disabled={!validStep1()} onClick={() => setStep(2)}>
                  {t.nextBtn}
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className={styles.section}>
                <h2 className={styles.sectionTitle}>{t.step2Title}</h2>
                <div className={styles.formRow}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t.firstNameLabel}</label>
                    <input value={s2.voornaam} onChange={(e) => setS2({ ...s2, voornaam: e.target.value })} className={styles.inputField} />
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>{t.lastNameLabel}</label>
                    <input value={s2.achternaam} onChange={(e) => setS2({ ...s2, achternaam: e.target.value })} className={styles.inputField} />
                  </div>
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t.emailLabel}</label>
                  <input type="email" value={s2.email} onChange={(e) => setS2({ ...s2, email: e.target.value })} className={styles.inputField} />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>{t.phoneLabel}</label>
                  <input value={s2.telefoon} onChange={(e) => setS2({ ...s2, telefoon: e.target.value })} placeholder="+31 6 12345678" className={styles.inputField} />
                </div>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={s2.akkoord} onChange={(e) => setS2({ ...s2, akkoord: e.target.checked })} className={styles.checkboxInput} />
                  <span className={styles.consentText}>
                    {t.consentPrefix}{' '}
                    <Link href={termsLink} className={styles.consentLink}>{t.consentTerms}</Link>{' '}
                    {t.consentAnd}{' '}
                    <Link href={privacyLink} className={styles.consentLink}>{t.consentPrivacy}</Link>.
                  </span>
                </label>
                <div className={styles.buttonRow}>
                  <Button variant="outline" onClick={() => setStep(1)}>{t.prevBtn}</Button>
                  <Button className={styles.submitButton} disabled={!validStep2() || submitting} onClick={onSubmitStep2}>
                    {submitting && <span className={styles.spinner} />}
                    {t.submitBtn}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className={styles.section}>
                <div>
                  <h2 className={styles.sectionTitle}>{t.resultTitle}</h2>
                  <p className={styles.resultMeta}>
                    {isNl ? 'Budget' : 'Budget'}: <strong>{formatEUR(koopkracht)}</strong> k.k. · {isNl ? 'minimaal' : 'minimum'} {minM2Num} m² · {s1.minSlaapkamers} {isNl ? 'slaapkamer(s)' : 'bedroom(s)'}
                  </p>
                </div>

                {results.every((r) => r.verdict !== 'green') && suggestions.length === 0 && (
                  <div className={styles.noResultCard}>
                    <XCircle className={styles.noResultIcon} />
                    <p className={styles.noResultText}>
                      {isNl
                        ? `Met dit budget en ${s1.minSlaapkamers} slaapkamer(s) is in ${s1.city === 'utrecht' ? 'Midden Nederland' : 'Amsterdam'} geen enkele wijk haalbaar.`
                        : `With this budget and ${s1.minSlaapkamers} bedroom(s), no neighborhood in ${s1.city === 'utrecht' ? 'Central Netherlands' : 'Amsterdam'} is feasible.`}
                    </p>
                  </div>
                )}

                <div className={styles.section}>
                  {results.map(renderResultCard)}
                </div>

                {suggestions.length > 0 && (
                  <div className={styles.suggestionsBox}>
                    <p className={styles.suggestionsTitle}>{t.suggestionsTitle}</p>
                    <ul className={styles.suggestionsList}>
                      {suggestions.map((s) => (
                        <li key={s.wijk}><strong>{s.wijk}</strong> — {isNl ? 'ca.' : 'approx.'} {s.haalbareM2} m² ({formatEUR(s.pricePerM2)}/m²)</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className={styles.disclaimer}>{t.disclaimer}</p>

                <div className={styles.actionRow}>
                  <a href={`tel:${DAVID_TEL}`} className={styles.actionButtonPrimary}>
                    <Phone style={{ width: '1rem', height: '1rem' }} />{t.callBtn}
                  </a>
                  <Link href={leadLink} className={styles.actionButtonOutline}>
                    <ClipboardList style={{ width: '1rem', height: '1rem' }} />{t.leadBtn}
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyingPower;