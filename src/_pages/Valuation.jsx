'use client';

import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { translations } from '../data/translations';
import {
  calculateValuation, formatEUR, NEIGHBORHOOD_PRICES, DEFAULT_PRICE,
  TYPE_OPTIONS, TYPE_OPTIONS_EN, BOUWPERIODE_OPTIONS, BOUWPERIODE_OPTIONS_EN,
  STAAT_OPTIONS, STAAT_OPTIONS_EN, ENERGIE_OPTIONS, BUITEN_OPTIONS, BUITEN_OPTIONS_EN,
  SOUTERRAIN_OPTIONS, SOUTERRAIN_OPTIONS_EN, PARKEREN_OPTIONS, PARKEREN_OPTIONS_EN,
  bouwjaarToBouwperiode,
} from '../lib/valuation';
import { lookupBag, osmEmbedUrl } from '../lib/bag';
import useServiceContacts from '../hooks/useServiceContacts';
import styles from './Valuation.module.css';
import {
  Phone, ArrowLeft, Search, MapPin, CheckCircle2, Home,
} from 'lucide-react';

const UTRECHT_PLAATSEN = /utrecht|amersfoort|nieuwegein|zeist|houten|ijsselstein|vleuten|bilthoven|de bilt|maarssen|bunnik|vianen/i;
const AMSTERDAM_PLAATSEN = /amsterdam|amstelveen|diemen|duivendrecht/i;

const COUNTRIES = [
  'Nederland', 'België', 'Duitsland', 'Verenigd Koninkrijk', 'Verenigde Staten',
  'Frankrijk', 'Italië', 'Spanje', 'Portugal', 'Polen', 'Zweden', 'Noorwegen',
  'Denemarken', 'Finland', 'Ierland', 'Oostenrijk', 'Zwitserland', 'Australië',
  'Canada', 'Brazilië', 'India', 'China', 'Japan', 'Zuid-Afrika', 'Anders',
];

const DIAL_CODES = {
  'Nederland': '+31', 'België': '+32', 'Duitsland': '+49', 'Verenigd Koninkrijk': '+44',
  'Verenigde Staten': '+1', 'Frankrijk': '+33', 'Italië': '+39', 'Spanje': '+34',
  'Portugal': '+351', 'Polen': '+48', 'Zweden': '+46', 'Noorwegen': '+47',
  'Denemarken': '+45', 'Finland': '+358', 'Ierland': '+353', 'Oostenrijk': '+43',
  'Zwitserland': '+41', 'Australië': '+61', 'Canada': '+1', 'Brazilië': '+55',
  'India': '+91', 'China': '+86', 'Japan': '+81', 'Zuid-Afrika': '+27', 'Anders': '+',
};

const PHONE_EXAMPLES = {
  'Nederland': '612345678', 'België': '412345678', 'Duitsland': '1512345678',
  'Verenigd Koninkrijk': '7123456789', 'Verenigde Staten': '5512345678',
  'Frankrijk': '612345678', 'Italië': '3123456789', 'Spanje': '612345678',
  'Portugal': '912345678', 'Polen': '5123456789', 'Zweden': '7123456789',
  'Noorwegen': '412345678', 'Denemarken': '21234567', 'Finland': '4123456789',
  'Ierland': '8123456789', 'Oostenrijk': '612345678', 'Zwitserland': '7123456789',
  'Australië': '4123456789', 'Canada': '5512345678', 'Brazilië': '9123456789',
  'India': '91234567890', 'China': '11234567890', 'Japan': '91234567890',
  'Zuid-Afrika': '7123456789', 'Anders': '12345678',
};

const tOpt = (opts, map, lang) => (lang === 'en' ? opts.map((o) => ({ value: o, label: map[o] || o })) : opts.map((o) => ({ value: o, label: o })));

const Valuation = () => {
  const currentLang = useSelector((state) => state.ui.language);
  const t = translations.valuation[currentLang] || translations.valuation.en;
  const contacts = useServiceContacts('verkoop');
  const isNl = currentLang === 'nl';

  const defaultCity = 'amsterdam';
  const [step, setStep] = useState(1);
  const [s1, setS1] = useState({
    adres: '', postcode: '', city: defaultCity, wijk: '', oppervlakte: '',
    type: '', bouwperiode: '', staat: '', energielabel: '',
    buitenruimte: '', parkeren: '', souterrain: '',
  });
  const [s2, setS2] = useState({ voornaam: '', achternaam: '', email: '', dialCode: '+31', phone: '', akkoord: false });
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [bag, setBag] = useState(null);
  const [bagLoading, setBagLoading] = useState(false);
  const [bagDone, setBagDone] = useState(false);
  const [error, setError] = useState('');

  const wijkOptions = useMemo(() => Object.keys(NEIGHBORHOOD_PRICES[s1.city]), [s1.city]);
  const marktwaarde = useMemo(
    () => NEIGHBORHOOD_PRICES[s1.city]?.[s1.wijk] ?? DEFAULT_PRICE[s1.city],
    [s1.city, s1.wijk],
  );

  const validStep1 = () => !!s1.adres && !!s1.wijk;
  const validStep2 = () =>
    Number(s1.oppervlakte) > 0 && !!s1.type && !!s1.bouwperiode && !!s1.staat &&
    !!s1.energielabel && !!s1.buitenruimte && !!s1.parkeren && !!s1.souterrain;
  const validStep3 = () =>
    !!s2.voornaam && !!s2.achternaam && /\S+@\S+\.\S+/.test(s2.email) &&
    s2.phone.replace(/\D/g, '').length >= 6 && s2.akkoord;

  const zoekWoning = async () => {
    if (!s1.adres.trim()) return;
    setBagLoading(true);
    setBagDone(false);
    try {
      const q = [s1.adres, s1.postcode].filter(Boolean).join(' ');
      const res = await lookupBag(q);
      setBag(res);
      setBagDone(true);
      if (res.found) {
        setS1((prev) => {
          const next = { ...prev };
          if (res.oppervlakte && !prev.oppervlakte) next.oppervlakte = String(res.oppervlakte);
          if (res.bouwjaar && !prev.bouwperiode) next.bouwperiode = bouwjaarToBouwperiode(res.bouwjaar);
          const wp = res.woonplaats ?? res.weergavenaam ?? '';
          if (AMSTERDAM_PLAATSEN.test(wp)) next.city = 'amsterdam';
          else if (UTRECHT_PLAATSEN.test(wp)) next.city = 'utrecht';
          return next;
        });
      }
    } catch {
      setBag({ found: false });
      setBagDone(true);
    } finally {
      setBagLoading(false);
    }
  };

  const onSubmit = async () => {
    if (!validStep3()) {
      setError(isNl ? 'Vul alle verplichte velden in.' : 'Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setError('');
    const calc = calculateValuation({
      city: s1.city, wijk: s1.wijk, oppervlakte: Number(s1.oppervlakte),
      bouwperiode: s1.bouwperiode, staat: s1.staat, energielabel: s1.energielabel,
      buitenruimte: s1.buitenruimte, parkeren: s1.parkeren, souterrain: s1.souterrain,
    });
    const stadLabel = s1.city === 'utrecht' ? 'Midden Nederland' : 'Amsterdam';
    try {
      try {
        await fetch('/api/verkoop/valuation-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            adres: s1.adres, postcode: s1.postcode, stad: stadLabel, wijk: s1.wijk,
            oppervlakte: Number(s1.oppervlakte), type: s1.type, bouwperiode: s1.bouwperiode,
            staat: s1.staat, energielabel: s1.energielabel, buitenruimte: s1.buitenruimte,
            parkeren: s1.parkeren, souterrain: s1.souterrain,
            voornaam: s2.voornaam, achternaam: s2.achternaam,
            email: s2.email, telefoon: `${s2.dialCode}${s2.phone}`.trim(), taal: currentLang,
            geschatte_waarde_laag: calc.laag, geschatte_waarde_hoog: calc.hoog,
          }),
        });
      } catch (dbErr) {
        console.warn('valuation-lead submit failed (non-blocking):', dbErr);
      }
      setResult(calc);
      setStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      setError(isNl ? 'Er ging iets mis. Probeer het opnieuw.' : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const progress = result ? 100 : step === 1 ? 33 : step === 2 ? 66 : 90;
  const backLink = currentLang === 'nl' ? '/nl/verkoop-aanvraag' : '/en/sell-lead';
  const termsLink = currentLang === 'nl' ? '/nl/algemene-voorwaarden' : '/en/terms-and-conditions';
  const privacyLink = currentLang === 'nl' ? '/nl/privacyverklaring' : '/en/privacy-policy';

  const renderSelect = (label, value, options, onChange) => (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>{label}</label>
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{isNl ? 'Kies een optie' : 'Choose an option'}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const renderField = (label, children) => (
    <div className={styles.fieldGroup}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );

  return (
    <div className={styles.pageContainer}>
      <div className={styles.innerContainer}>
        <div className={styles.header}>
          <Link href={backLink} className={styles.backLink}>
            <ArrowLeft className={styles.icon4} />{t.backLink}
          </Link>
          <div className={styles.badge}>
            <Home className={styles.icon3_5} />{t.badge}
          </div>
          <h1 className={styles.title}>{t.title}</h1>
          <p className={styles.subtitle}>{t.subtitle}</p>
          {!result && (
            <>
              <p className={styles.stepLabel}>{t.step} {step} {t.stepOf} 3</p>
              <div className={styles.progressBarTrack}>
                <div className={styles.progressBarFill} style={{ width: `${progress}%` }} />
              </div>
            </>
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.cardContent}>
            {error && <p className={styles.errorText}>{error}</p>}

            {!result && step === 1 && (
              <div className={styles.stepSection}>
                <h2 className={styles.stepTitle}>{t.step1Title}</h2>
                <div className={styles.grid3}>
                  <div>
                    {renderField(t.addressLabel, <input className={styles.input} value={s1.adres} onChange={(e) => setS1({ ...s1, adres: e.target.value })} placeholder={isNl ? 'Voorbeeldstraat 12' : 'Example Street 12'} />)}
                  </div>
                  {renderField(t.postcodeLabel, <input className={styles.input} value={s1.postcode} onChange={(e) => setS1({ ...s1, postcode: e.target.value })} placeholder="1011 AB" />)}
                </div>

                <button className={styles.btnOutline} onClick={zoekWoning} disabled={!s1.adres.trim() || bagLoading} type="button">
                  {bagLoading ? <span className={styles.spinner} /> : <Search className={styles.icon4} />}
                  {t.searchBtn}
                </button>

                {bagDone && bag?.found && (
                  <div className={styles.bagResult}>
                    {bag.lat != null && bag.lon != null && (
                      <iframe title="Location" loading="lazy" src={osmEmbedUrl(bag.lat, bag.lon)} className={styles.bagMap} />
                    )}
                    <div className={styles.bagFoundLabel}>
                      <CheckCircle2 className={styles.icon4} />{bag.weergavenaam}
                    </div>
                    <div className={styles.bagTags}>
                      {bag.bouwjaar && <span className={styles.bagTag}>{isNl ? 'Bouwjaar' : 'Built'} {bag.bouwjaar}</span>}
                      {bag.oppervlakte && <span className={styles.bagTag}>{bag.oppervlakte} m² (BAG)</span>}
                    </div>
                    <p className={styles.bagNote}>{t.bagNote}</p>
                  </div>
                )}
                {bagDone && bag && !bag.found && (
                  <p className={styles.bagNotFound}>{t.bagNotFound}</p>
                )}

                <div className={styles.grid2}>
                  {renderSelect(t.cityLabel, s1.city, [
                    { value: 'amsterdam', label: 'Amsterdam' },
                    { value: 'utrecht', label: isNl ? 'Midden Nederland' : 'Central Netherlands' },
                  ], (v) => setS1({ ...s1, city: v, wijk: '' }))}
                  {renderSelect(t.districtLabel, s1.wijk, wijkOptions.map((w) => ({ value: w, label: w })), (v) => setS1({ ...s1, wijk: v }))}
                </div>

                {s1.wijk && (
                  <div className={styles.neighborhoodInfo}>
                    <MapPin className={styles.icon4} />
                    <span>{isNl ? 'Gemiddeld in' : 'Average in'} <strong>{s1.wijk}</strong>: <strong>{formatEUR(marktwaarde)}</strong> {isNl ? 'per m²' : 'per m²'}</span>
                  </div>
                )}

                <button className={styles.btnPrimary} disabled={!validStep1()} onClick={() => setStep(2)} type="button">
                  {t.nextBtn}
                </button>
              </div>
            )}

            {!result && step === 2 && (
              <div className={styles.stepSection}>
                <h2 className={styles.stepTitle}>{t.step2Title}</h2>
                <p className={styles.stepDesc}>{t.step2Desc}</p>

                {renderField(t.areaLabel, <input className={styles.input} type="number" min="1" value={s1.oppervlakte} onChange={(e) => setS1({ ...s1, oppervlakte: e.target.value })} placeholder="85" />)}
                {renderSelect(t.typeLabel, s1.type, tOpt(TYPE_OPTIONS, TYPE_OPTIONS_EN, currentLang), (v) => setS1({ ...s1, type: v }))}
                {renderSelect(t.periodLabel, s1.bouwperiode, tOpt(BOUWPERIODE_OPTIONS, BOUWPERIODE_OPTIONS_EN, currentLang), (v) => setS1({ ...s1, bouwperiode: v }))}
                {renderSelect(t.conditionLabel, s1.staat, tOpt(STAAT_OPTIONS, STAAT_OPTIONS_EN, currentLang), (v) => setS1({ ...s1, staat: v }))}
                {renderSelect(t.energyLabel, s1.energielabel, ENERGIE_OPTIONS.map((o) => ({ value: o, label: o })), (v) => setS1({ ...s1, energielabel: v }))}
                {renderSelect(t.outdoorLabel, s1.buitenruimte, tOpt(BUITEN_OPTIONS, BUITEN_OPTIONS_EN, currentLang), (v) => setS1({ ...s1, buitenruimte: v }))}
                {renderSelect(t.basementLabel, s1.souterrain, tOpt(SOUTERRAIN_OPTIONS, SOUTERRAIN_OPTIONS_EN, currentLang), (v) => setS1({ ...s1, souterrain: v }))}
                {renderSelect(t.parkingLabel, s1.parkeren, tOpt(PARKEREN_OPTIONS, PARKEREN_OPTIONS_EN, currentLang), (v) => setS1({ ...s1, parkeren: v }))}
                <div className={styles.btnRow}>
                  <button className={styles.btnOutline} onClick={() => setStep(1)} type="button">{t.prevBtn}</button>
                  <button className={styles.btnPrimary} disabled={!validStep2()} onClick={() => setStep(3)} type="button">{t.nextBtn}</button>
                </div>
              </div>
            )}

            {!result && step === 3 && (
              <div className={styles.stepSection}>
                <h2 className={styles.stepTitle}>{t.step3Title}</h2>
                <p className={styles.stepDesc}>{t.step3Desc}</p>
                <div className={styles.grid2}>
                  {renderField(t.firstNameLabel, <input className={styles.input} value={s2.voornaam} onChange={(e) => setS2({ ...s2, voornaam: e.target.value })} />)}
                  {renderField(t.lastNameLabel, <input className={styles.input} value={s2.achternaam} onChange={(e) => setS2({ ...s2, achternaam: e.target.value })} />)}
                </div>
                {renderField(t.emailLabel, <input className={styles.input} type="email" value={s2.email} onChange={(e) => setS2({ ...s2, email: e.target.value })} />)}
                {renderField(t.phoneLabel,
                  <div className={styles.phoneRow}>
                    <select
                      className={styles.dialCodeSelect}
                      value={s2.dialCode}
                      onChange={(e) => setS2({ ...s2, dialCode: e.target.value })}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c} value={DIAL_CODES[c]}>{c} {DIAL_CODES[c]}</option>
                      ))}
                    </select>
                    <input
                      className={styles.phoneInput}
                      type="tel"
                      value={s2.phone}
                      onChange={(e) => {
                        let v = e.target.value.replace(/[^\d]/g, '');
                        v = v.replace(/^0+/, '');
                        setS2({ ...s2, phone: v });
                      }}
                      placeholder={PHONE_EXAMPLES[Object.keys(DIAL_CODES).find((k) => DIAL_CODES[k] === s2.dialCode)] || '12345678'}
                    />
                  </div>
                )}

                <label className={styles.consentRow}>
                  <input
                    type="checkbox"
                    className={styles.consentCheckbox}
                    checked={s2.akkoord}
                    onChange={(e) => setS2({ ...s2, akkoord: e.target.checked })}
                  />
                  <span className={styles.consentText}>
                    {t.consentPrefix}{' '}
                    <Link href={termsLink} className={styles.consentLink}>{t.consentTerms}</Link>{' '}
                    {t.consentAnd}{' '}
                    <Link href={privacyLink} className={styles.consentLink}>{t.consentPrivacy}</Link>.
                  </span>
                </label>

                <div className={styles.btnRow}>
                  <button className={styles.btnOutline} onClick={() => setStep(2)} type="button">{t.prevBtn}</button>
                  <button className={styles.btnOrange} disabled={!validStep3() || submitting} onClick={onSubmit} type="button">
                    {submitting && <span className={styles.spinner} />}
                    {t.submitBtn}
                  </button>
                </div>
              </div>
            )}

            {result && (
              <div className={styles.resultSection}>
                <div>
                  <p className={styles.resultAddressLabel}>{isNl ? 'Geschatte marktwaarde van' : 'Estimated market value of'}</p>
                  <p className={styles.resultAddress}>{s1.adres}{s1.postcode ? `, ${s1.postcode}` : ''}</p>
                </div>
                <p className={styles.resultPrice}>
                  {formatEUR(result.laag)} {isNl ? 'tot' : 'to'} {formatEUR(result.hoog)}
                </p>
                <div className={styles.breakdownCard}>
                  <p className={styles.breakdownTitle}>{isNl ? 'Onderbouwing' : 'Breakdown'}</p>
                  <p className={styles.breakdownDetail}>{isNl ? 'Basiswaarde' : 'Base value'}: {formatEUR(result.basiswaarde)}{' '}
                    <span className={styles.breakdownSmall}>({formatEUR(result.pricePerM2)}/m² × {s1.oppervlakte} m²)</span>
                  </p>
                  <div className={styles.breakdownTags}>
                    {[
                      [isNl ? 'Wijk' : 'District', s1.wijk],
                      [isNl ? 'Bouwperiode' : 'Period', s1.bouwperiode],
                      [isNl ? 'Staat' : 'Condition', s1.staat],
                      ['Energielabel', s1.energielabel],
                      [isNl ? 'Buitenruimte' : 'Outdoor', s1.buitenruimte],
                      [isNl ? 'Souterrain' : 'Basement', s1.souterrain],
                      [isNl ? 'Parkeren' : 'Parking', s1.parkeren],
                    ].map(([k, v]) => (
                      <span key={k} className={styles.breakdownTag}>{k}: {v}</span>
                    ))}
                  </div>
                </div>
                <p className={styles.resultNote}>
                  {isNl
                    ? <>We hebben de indicatie naar <strong>{s2.email}</strong> gestuurd en nemen binnenkort contact met je op.</>
                    : <>We&apos;ve sent the estimate to <strong>{s2.email}</strong> and will contact you soon.</>}
                </p>
                <p className={styles.resultDisclaimer}>
                  {isNl
                    ? 'Dit is een geautomatiseerde indicatie op basis van marktdata en het BAG, geen taxatie. Voor een exacte waardebepaling komen we graag langs.'
                    : 'This is an automated indication based on market data and the BAG, not a formal appraisal. For an exact valuation, we are happy to visit.'}
                </p>
                <a href={`tel:${contacts.phone.replace(/\s/g, '')}`} className={styles.callButton}>
                    <Phone className={styles.icon4} />{t.callBtn}
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Valuation;