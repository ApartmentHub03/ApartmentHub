'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { translations } from '../data/translations';
import { COUNTRIES, DIAL_CODES, PHONE_EXAMPLES } from '../data/countries';
import { supabase } from '../integrations/supabase/client';
import dynamic from 'next/dynamic';
import Button from '../components/ui/Button';
import { ArrowLeft, ArrowRight, Check, Home, Loader2 } from 'lucide-react';
import styles from './BuyLead.module.css';

const NeighborhoodMap = dynamic(() => import('../components/map/NeighborhoodMap'), { ssr: false });

const NEIGHBORHOODS = {
  amsterdam: ['Centrum', 'Jordaan', 'De Pijp', 'Oud Zuid', 'Oost', 'West', 'Noord', 'Zuidas'],
  utrecht: ['Binnenstad', 'Wittevrouwen', 'Lombok', 'Oog in Al', 'Voordorp', 'Leidsche Rijn', 'Tuinwijk', 'Wilhelminapark'],
};

const BUDGETS = [
  { key: 'up_to_500k',     nl: 'Tot € 500.000',                  en: 'Up to € 500,000' },
  { key: '500k_750k',      nl: '€ 500.000 tot 750.000',           en: '€ 500,000 to 750,000' },
  { key: '750k_1m',        nl: '€ 750.000 tot 1.000.000',         en: '€ 750,000 to 1,000,000' },
  { key: '1m_1_5m',        nl: '€ 1.000.000 tot 1.500.000',       en: '€ 1,000,000 to 1,500,000' },
  { key: '1_5m_plus',      nl: '€ 1.500.000+',                    en: '€ 1,500,000+' },
];
const PROPERTY_TYPES = [
  { key: 'apartment',      nl: 'Appartement',     en: 'Apartment' },
  { key: 'house',          nl: 'Eengezinswoning', en: 'House' },
  { key: 'penthouse',      nl: 'Penthouse',       en: 'Penthouse' },
  { key: 'maisonette',     nl: 'Maisonette',      en: 'Maisonette' },
  { key: 'no_preference', nl: 'Geen voorkeur',   en: 'No preference' },
];
const BEDROOMS = ['1', '2', '3', '4+'];
const MUST_HAVES = [
  { key: 'balcony',        nl: 'Balkon',                en: 'Balcony' },
  { key: 'garden',        nl: 'Tuin',                  en: 'Garden' },
  { key: 'parking',       nl: 'Parkeerplek',           en: 'Parking' },
  { key: 'elevator',      nl: 'Lift',                  en: 'Elevator' },
  { key: 'shared_outdoor', nl: 'Buitenruimte algemeen', en: 'Shared outdoor space' },
];

const TIMELINES = [
  { key: 'asap',     nl: 'Zo snel mogelijk (0-3 mnd)', en: 'As soon as possible (0-3 months)' },
  { key: '3_6_m',    nl: '3 tot 6 maanden',            en: '3 to 6 months' },
  { key: '6_12_m',   nl: '6 tot 12 maanden',           en: '6 to 12 months' },
  { key: '12_m_plus', nl: 'Meer dan 12 maanden',       en: 'More than 12 months' },
  { key: 'open',     nl: 'Open / geen haast',         en: 'Open / no rush' },
];

const BUYER_TYPES = [
  { key: 'first_home',  nl: 'Eerste woning',  en: 'First home' },
  { key: 'moving_up',   nl: 'Doorstromer',    en: 'Moving up' },
  { key: 'investor',    nl: 'Belegger',       en: 'Investor' },
  { key: 'second_home', nl: 'Tweede huis',    en: 'Second home' },
];
const HOUSEHOLD = [
  { key: 'solo',        nl: 'Solo',        en: 'Solo' },
  { key: 'with_partner', nl: 'Met partner', en: 'With partner' },
  { key: 'with_family',  nl: 'Met familie', en: 'With family' },
];
const MORTGAGE = [
  { key: 'pre_approval',       nl: 'Pre-approval',              en: 'Pre-approval' },
  { key: 'talking_to_advisor', nl: 'In gesprek met adviseur',   en: 'Talking to advisor' },
  { key: 'own_funds',          nl: 'Volledig eigen geld',       en: 'Fully own funds' },
  { key: 'not_started',        nl: 'Nog niet gestart',          en: 'Not started yet' },
];
const LIVES_IN_NL = [
  { key: 'yes', nl: 'Ja', en: 'Yes' },
  { key: 'no',  nl: 'Nee', en: 'No' },
];

const initialData = {
  journey: '', firstName: '', lastName: '', email: '', dialCode: '+31', phone: '',
  nationality: 'Nederland', buyerType: '', livesInNL: '', household: '',
  mortgageStatus: '', budget: '', ownCapital: '',
  neighborhoods: [], otherNeighborhood: '', minBedrooms: '',
  propertyType: '', minSqm: '', mustHaves: [], timeline: '',
  agreed: false, marketingOptIn: true,
};

const Pill = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${styles.pill} ${active ? styles.pillActive : ''}`}
  >
    {children}
  </button>
);

const Chip = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${styles.chip} ${active ? styles.chipActive : ''}`}
  >
    {children}
  </button>
);

const NeighborhoodCard = ({ name, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`${styles.neighborhoodCard} ${active ? styles.neighborhoodCardActive : ''}`}
  >
    {active && (
      <span className={styles.neighborhoodCardCheck}>
        <Check className="w-3 h-3" strokeWidth={3} />
      </span>
    )}
    {name}
  </button>
);

const BuyLead = () => {
  const currentLang = useSelector((state) => state.ui.language);
  const t = translations.buyLead[currentLang] || translations.buyLead.en;
  const isNl = currentLang === 'nl';
  const cityKey = 'amsterdam';

  const [step, setStep] = useState(1);
  const [data, setData] = useState({ ...initialData });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const update = (key, value) => setData((d) => ({ ...d, [key]: value }));
  const toggleArr = (key, value) => setData((d) => ({
    ...d, [key]: d[key].includes(value) ? d[key].filter((v) => v !== value) : [...d[key], value],
  }));
  const goToStep = (next) => { setTransitioning(true); setTimeout(() => { setStep(next); setTransitioning(false); }, 250); };

  const label = (arr, keyVal) => {
    const item = arr.find((x) => x.key === keyVal);
    return item ? (isNl ? item.nl : item.en) : keyVal;
  };
  const steps = isNl ? ['Start', 'Gegevens', 'Profiel', 'Financiering', 'Wensen', 'Planning', 'Akkoord'] : ['Start', 'Details', 'Profile', 'Financing', 'Preferences', 'Timeline', 'Agree'];
  const neighborhoods = NEIGHBORHOODS[cityKey];
  const termsLink = isNl ? '/nl/algemene-voorwaarden' : '/en/terms-and-conditions';
  const privacyLink = isNl ? '/nl/privacyverklaring' : '/en/privacy-policy';

  const canNext = () => {
    switch (step) {
      case 1: return data.journey === 'buy';
      case 2: return data.firstName && data.lastName && /\S+@\S+\.\S+/.test(data.email) && data.phone.replace(/\D/g, '').length >= 6 && data.nationality;
      case 3: return data.buyerType && data.livesInNL && data.household;
      case 4: return data.mortgageStatus && data.budget;
      case 5: return data.minBedrooms && data.propertyType;
      case 6: return data.timeline;
      case 7: return data.agreed;
      default: return false;
    }
  };

  const handleJourney = (value) => {
    update('journey', value);
    if (value === 'sell') {
      router.push(isNl ? '/nl/verkoop' : '/en/sell');
      return;
    }
    setTimeout(() => goToStep(2), 300);
  };

  const submit = async () => {
    setLoading(true);
    setError('');
    const payload = {
      journey: data.journey, first_name: data.firstName, last_name: data.lastName,
      email: data.email, phone: `${data.dialCode}${data.phone}`.trim(), nationality: data.nationality,
      buyer_type: data.buyerType, lives_in_nl: data.livesInNL, household: data.household,
      mortgage_status: data.mortgageStatus, budget: data.budget, own_capital: data.ownCapital,
      neighborhoods: data.neighborhoods, other_neighborhood: data.otherNeighborhood,
      min_bedrooms: data.minBedrooms, property_type: data.propertyType,
      min_sqm: data.minSqm, must_haves: data.mustHaves, timeline: data.timeline,
      city: cityKey, marketing_opt_in: data.marketingOptIn,
    };
    try {
      const { error: insertError } = await supabase.from('koop_leads').insert([payload]);
      if (insertError) {
        console.error('koop_leads insert error:', insertError);
        setError(isNl ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('koop_leads submit failed:', err);
      setError(isNl ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.successContainer}>
        <div className={styles.successCard}>
          <div className={styles.successIconCircle}>
            <Check style={{ width: '2rem', height: '2rem' }} />
          </div>
          <h1 className={styles.successTitle}>{t.thankYou}, {data.firstName}!</h1>
          <p className={styles.successMessage}>{t.successMessage}</p>
          <div className={styles.successButtons}>
            <Link href={isNl ? '/nl' : '/en'} className={styles.ctaOutline}>
              <Home style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />{t.backHome}
            </Link>
            <Link href={isNl ? '/nl/koop' : '/en/buy'} className={styles.ctaPrimary}>{t.viewMarketData}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div style={{ marginBottom: '2rem' }}>
        <div className={styles.progressBarHeader}>
          <span className={styles.progressBarStepLabel}>{t.step} {step} {t.stepOf} {steps.length}</span>
          <span className={styles.progressBarStepName}>{steps[step - 1]}</span>
        </div>
        <div className={styles.progressBarTrack}>
          <div className={styles.progressBarFill} style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>
        <div className={styles.progressBarSteps}>
          {steps.map((s, i) => (
            <span key={s} className={i + 1 === step ? styles.progressBarStepActive : ''}>{s}</span>
          ))}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardContent}>
          {error && <p className={styles.error}>{error}</p>}
          <div className={`${styles.stepContent} ${transitioning ? styles.stepContentTransitioning : styles.stepContentVisible}`}>

            {step === 1 && (
              <>
                <h2 className={styles.heading}>{t.journeyTitle}</h2>
                <p className={styles.subheading}>{t.journeyDesc}</p>
                <div className={styles.journeyGrid}>
                  {[
                    { key: 'buy',  nl: 'Kopen',   en: 'Buy' },
                    { key: 'sell', nl: 'Verkopen', en: 'Sell' },
                  ].map((j) => (
                    <button
                      key={j.key}
                      type="button"
                      onClick={() => handleJourney(j.key)}
                      className={`${styles.journeyButton} ${data.journey === j.key ? styles.journeyButtonActive : ''}`}
                    >
                      {isNl ? j.nl : j.en}
                    </button>
                  ))}
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className={styles.heading}>{t.step2Title}</h2>
                <p className={styles.subheading}>{t.step2Desc}</p>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t.firstNameLabel}</label>
                    <input className={styles.input} value={data.firstName} onChange={(e) => update('firstName', e.target.value)} />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t.lastNameLabel}</label>
                    <input className={styles.input} value={data.lastName} onChange={(e) => update('lastName', e.target.value)} />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>{t.emailLabel}</label>
                    <input className={styles.input} type="email" value={data.email} onChange={(e) => update('email', e.target.value)} />
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>{t.phoneLabel}</label>
                    <div className={styles.phoneRow}>
                      <select
                        className={styles.dialCodeSelect}
                        value={data.dialCode}
                        onChange={(e) => update('dialCode', e.target.value)}
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={DIAL_CODES[c]}>{c} {DIAL_CODES[c]}</option>
                        ))}
                      </select>
                      <input
                        className={styles.phoneInput}
                        type="tel"
                        value={data.phone}
                        onChange={(e) => {
                          let v = e.target.value.replace(/[^\d]/g, '');
                          v = v.replace(/^0+/, '');
                          update('phone', v);
                        }}
                        placeholder={PHONE_EXAMPLES[Object.keys(DIAL_CODES).find((k) => DIAL_CODES[k] === data.dialCode)] || '12345678'}
                      />
                    </div>
                  </div>
                  <div className={styles.formGroupFull}>
                    <label className={styles.label}>{t.nationalityLabel}</label>
                    <select className={styles.select} value={data.nationality} onChange={(e) => { update('nationality', e.target.value); update('dialCode', DIAL_CODES[e.target.value] || '+'); }}>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className={styles.heading}>{t.step3Title}</h2>
                <div className={styles.sectionGroup}>
                  <div>
                    <label className={styles.sectionLabel}>{t.buyerTypeLabel}</label>
                    <div className={styles.radioButtonGroup}>
                      {BUYER_TYPES.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => update('buyerType', o.key)}
                          className={`${styles.radioButton} ${data.buyerType === o.key ? styles.radioButtonActive : ''}`}
                        >
                          <div className={`${styles.radioIndicator} ${data.buyerType === o.key ? styles.radioIndicatorActive : ''}`}>
                            {data.buyerType === o.key && <div className={styles.radioIndicatorDot} />}
                          </div>
                          <span>{isNl ? o.nl : o.en}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={styles.sectionLabel}>{t.livesInNLLabel}</label>
                    <div className={styles.radioButtonSideGroup}>
                      {LIVES_IN_NL.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => update('livesInNL', o.key)}
                          className={`${styles.radioButtonCenter} ${data.livesInNL === o.key ? styles.radioButtonCenterActive : ''}`}
                        >
                          <div className={`${styles.radioIndicator} ${data.livesInNL === o.key ? styles.radioIndicatorActive : ''}`}>
                            {data.livesInNL === o.key && <div className={styles.radioIndicatorDot} />}
                          </div>
                          <span>{isNl ? o.nl : o.en}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={styles.sectionLabel}>{t.householdLabel}</label>
                    <div className={styles.radioButtonGroup}>
                      {HOUSEHOLD.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => update('household', o.key)}
                          className={`${styles.radioButton} ${data.household === o.key ? styles.radioButtonActive : ''}`}
                        >
                          <div className={`${styles.radioIndicator} ${data.household === o.key ? styles.radioIndicatorActive : ''}`}>
                            {data.household === o.key && <div className={styles.radioIndicatorDot} />}
                          </div>
                          <span>{isNl ? o.nl : o.en}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className={styles.heading}>{t.step4Title}</h2>
                <div className={styles.sectionGroup}>
                  <div>
                    <label className={styles.sectionLabel}>{t.mortgageLabel}</label>
                    <div className={styles.radioButtonGroup}>
                      {MORTGAGE.map((o) => (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => { update('mortgageStatus', o.key); if (data.budget) setTimeout(() => goToStep(5), 300); }}
                          className={`${styles.radioButton} ${data.mortgageStatus === o.key ? styles.radioButtonActive : ''}`}
                        >
                          {isNl ? o.nl : o.en}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={styles.sectionLabel}>{t.budgetLabel}</label>
                    <div className={styles.pillGroup}>
                      {BUDGETS.map((b) => (
                        <Pill key={b.key} active={data.budget === b.key} onClick={() => { update('budget', b.key); if (data.mortgageStatus) setTimeout(() => goToStep(5), 300); }}>{isNl ? b.nl : b.en}</Pill>
                      ))}
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t.ownCapitalLabel}</label>
                    <input className={styles.input} value={data.ownCapital} onChange={(e) => update('ownCapital', e.target.value)} placeholder={isNl ? 'bv. 100.000' : 'e.g. 100,000'} />
                  </div>
                </div>
              </>
            )}

            {step === 5 && (
              <>
                <h2 className={styles.heading}>{t.step5Title}</h2>
                <div className={styles.sectionGroup}>
                  <div>
                    <label className={styles.sectionLabel}>{isNl ? 'Voorkeurswijken in Amsterdam' : 'Preferred neighborhoods in Amsterdam'}</label>
                    <NeighborhoodMap
                      selectedNeighborhoods={data.neighborhoods}
                      onSelect={(n) => toggleArr('neighborhoods', n)}
                      city={cityKey}
                    />
                    <div className={styles.neighborhoodGrid}>
                      {neighborhoods.map((n) => (
                        <NeighborhoodCard key={n} name={n} active={data.neighborhoods.includes(n)} onClick={() => toggleArr('neighborhoods', n)} />
                      ))}
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t.otherNeighborhoodLabel}</label>
                    <input className={styles.input} value={data.otherNeighborhood} onChange={(e) => update('otherNeighborhood', e.target.value)} />
                  </div>
                  <div>
                    <label className={styles.sectionLabel}>{t.bedroomsLabel}</label>
                    <div className={styles.pillGroup}>
                      {BEDROOMS.map((b) => <Pill key={b} active={data.minBedrooms === b} onClick={() => update('minBedrooms', b)}>{b}</Pill>)}
                    </div>
                  </div>
                  <div>
                    <label className={styles.sectionLabel}>{t.propertyTypeLabel}</label>
                    <div className={styles.pillGroup}>
                      {PROPERTY_TYPES.map((pt) => <Pill key={pt.key} active={data.propertyType === pt.key} onClick={() => update('propertyType', pt.key)}>{isNl ? pt.nl : pt.en}</Pill>)}
                    </div>
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>{t.minSqmLabel}</label>
                    <input className={styles.input} value={data.minSqm} onChange={(e) => update('minSqm', e.target.value)} placeholder={isNl ? 'bv. 75' : 'e.g. 75'} />
                  </div>
                  <div>
                    <label className={styles.sectionLabel}>{t.mustHavesLabel}</label>
                    <div className={styles.pillGroup}>
                      {MUST_HAVES.map((m) => <Chip key={m.key} active={data.mustHaves.includes(m.key)} onClick={() => toggleArr('mustHaves', m.key)}>{isNl ? m.nl : m.en}</Chip>)}
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 6 && (
              <>
                <h2 className={styles.heading}>{t.step6Title}</h2>
                <div className={styles.sectionGroup}>
                  <div>
                    <label className={styles.sectionLabel}>{t.timelineLabel}</label>
                    <div className={styles.pillGroup}>
                      {TIMELINES.map((tl) => <Pill key={tl.key} active={data.timeline === tl.key} onClick={() => { update('timeline', tl.key); setTimeout(() => goToStep(7), 300); }}>{isNl ? tl.nl : tl.en}</Pill>)}
                    </div>
                  </div>
                </div>
              </>
            )}

            {step === 7 && (
              <>
                <h2 className={styles.heading}>{t.step7Title}</h2>
                <div className={styles.summaryBox}>
                  <div><span className={styles.summaryLabel}>{t.summaryName}:</span> {data.firstName} {data.lastName}</div>
                  <div><span className={styles.summaryLabel}>Email:</span> {data.email}</div>
                  <div><span className={styles.summaryLabel}>{t.summaryPhone}:</span> {data.dialCode}{data.phone}</div>
                  <div><span className={styles.summaryLabel}>{t.summaryNationality}:</span> {data.nationality}</div>
                  <div><span className={styles.summaryLabel}>{t.summaryProfile}:</span> {label(BUYER_TYPES, data.buyerType)} · {label(HOUSEHOLD, data.household)} · {t.livesInNLLabel} {label(LIVES_IN_NL, data.livesInNL)}</div>
                  <div><span className={styles.summaryLabel}>{t.summaryFinancing}:</span> {label(MORTGAGE, data.mortgageStatus)} · {label(BUDGETS, data.budget)} · {isNl ? 'eigen geld' : 'own funds'} € {data.ownCapital || (isNl ? 'n.v.t.' : 'n/a')}</div>
                  <div><span className={styles.summaryLabel}>{t.summaryNeighborhoods}:</span> {[...data.neighborhoods, data.otherNeighborhood].filter(Boolean).join(', ') || (isNl ? 'n.v.t.' : 'n/a')}</div>
                  <div><span className={styles.summaryLabel}>{t.summaryProperty}:</span> {label(PROPERTY_TYPES, data.propertyType)} · {data.minBedrooms} {isNl ? 'slpk' : 'br'} · {isNl ? 'min' : 'min'} {data.minSqm || (isNl ? 'n.v.t.' : 'n/a')} m²</div>
                  <div><span className={styles.summaryLabel}>{t.mustHavesLabel}:</span> {data.mustHaves.map((k) => label(MUST_HAVES, k)).join(', ') || (isNl ? 'n.v.t.' : 'n/a')}</div>
                  <div><span className={styles.summaryLabel}>{t.summaryTimeline}:</span> {label(TIMELINES, data.timeline)}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkboxInput} checked={data.agreed} onChange={(e) => update('agreed', e.target.checked)} />
                    <span className={styles.checkboxText}>
                      {t.consentPrefix}{' '}
                      <Link href={termsLink} className={styles.checkboxLink}>{t.consentTerms}</Link>{' '}
                      {t.consentAnd}{' '}
                      <Link href={privacyLink} className={styles.checkboxLink}>{t.consentPrivacy}</Link>.
                    </span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input type="checkbox" className={styles.checkboxInput} checked={data.marketingOptIn} onChange={(e) => update('marketingOptIn', e.target.checked)} />
                    <span className={styles.checkboxText}>{t.marketingOptIn}</span>
                  </label>
                </div>
                <button className={styles.submitButton} onClick={submit} disabled={!canNext() || loading}>
                  {loading && <Loader2 className={styles.spinner} />}
                  {t.submitBtn}
                </button>
              </>
            )}

            {step > 1 && step < 7 && (
              <div className={styles.navButtons}>
                <Button variant="outline" onClick={() => goToStep(step - 1)}>
                  <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />{t.prevBtn}
                </Button>
                <Button onClick={() => { if (!canNext()) { setError(t.fillRequired); return; } setError(''); goToStep(step + 1); }} style={{ background: 'hsl(var(--myrtle))', color: 'white' }}>
                  {t.nextBtn} <ArrowRight style={{ width: '1rem', height: '1rem', marginLeft: '0.5rem' }} />
                </Button>
              </div>
            )}
            {step === 7 && (
              <div className={styles.navButtonsStart}>
                <Button variant="outline" onClick={() => goToStep(6)}>
                  <ArrowLeft style={{ width: '1rem', height: '1rem', marginRight: '0.5rem' }} />{t.prevBtn}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default BuyLead;