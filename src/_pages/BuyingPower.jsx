'use client';

import { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { translations } from '../data/translations';
import { NEIGHBORHOOD_PRICES, formatEUR } from '../lib/valuation';
import { berekenHypotheek, ENERGIELABEL_OPTIES, energielabelLabel } from '../lib/hypotheek';
import useServiceContacts from '../hooks/useServiceContacts';
import CountUp from '../components/motion/CountUp';
import { ArrowLeft, Calculator, Phone, ClipboardList, Wallet, Home, TrendingUp } from 'lucide-react';
import styles from './BuyingPower.module.css';

const CITIES = [
  { value: 'amsterdam', labelNl: 'Amsterdam', labelEn: 'Amsterdam' },
  { value: 'utrecht', labelNl: 'Midden Nederland', labelEn: 'Central Netherlands' },
];

const cityLabel = (city, isNl) => city === 'utrecht' ? (isNl ? 'Midden Nederland' : 'Central Netherlands') : 'Amsterdam';

const BuyingPower = () => {
  const currentLang = useSelector((state) => state.ui.language);
  const t = translations.buyingPower[currentLang] || translations.buyingPower.en;
  const contacts = useServiceContacts('koop');
  const isNl = currentLang === 'nl';
  const telHref = `tel:${contacts.phone.replace(/\s/g, '')}`;

  const backLink = isNl ? '/nl/koop' : '/en/buy';
  const leadLink = isNl ? '/nl/koop/lead' : '/en/buy/lead';

  const [inkomen, setInkomen] = useState('');
  const [partner, setPartner] = useState('');
  const [eigenGeld, setEigenGeld] = useState('');
  const [rente, setRente] = useState('4');
  const [studieschuld, setStudieschuld] = useState('');
  const [energielabel, setEnergielabel] = useState('');
  const [city, setCity] = useState('amsterdam');

  const result = useMemo(
    () =>
      berekenHypotheek({
        inkomen: Number(inkomen) || 0,
        partnerInkomen: Number(partner) || 0,
        eigenGeld: Number(eigenGeld) || 0,
        rente: Number(rente) || 4,
        studieschuld: Number(studieschuld) || 0,
        energielabel,
      }),
    [inkomen, partner, eigenGeld, rente, studieschuld, energielabel],
  );

  const cityKey = city;
  const gemM2 = result ? Math.round(result.maxKoopprijs / (NEIGHBORHOOD_PRICES[cityKey]?.Centrum || 8500)) : 0;

  const fmtEUR = (n) => formatEUR(Math.round(n));

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <Link href={backLink} className={styles.backLink}>
          <ArrowLeft style={{ width: '1rem', height: '1rem' }} />{t.backLink}
        </Link>
        <div className={styles.badge}>
          <Calculator size={14} className={styles.badgeIcon} />
          {t.badge}
        </div>
        <h1 className={styles.heading}>{t.heading}</h1>
        <p className={styles.intro}>{t.intro}</p>
        <p className={styles.disclaimerTop}>{t.disclaimerTop}</p>

        <div className={styles.grid}>
          <div className={styles.formCard}>
            <div className={styles.formContent}>
              <Field label={t.fields.inkomen}>
                <input type="number" min="0" inputMode="numeric" value={inkomen} onChange={(e) => setInkomen(e.target.value)} placeholder="45000" className={styles.input} />
              </Field>
              <Field label={t.fields.partner}>
                <input type="number" min="0" inputMode="numeric" value={partner} onChange={(e) => setPartner(e.target.value)} placeholder="35000" className={styles.input} />
              </Field>
              <Field label={t.fields.eigenGeld}>
                <input type="number" min="0" inputMode="numeric" value={eigenGeld} onChange={(e) => setEigenGeld(e.target.value)} placeholder="30000" className={styles.input} />
              </Field>
              <div className={styles.fieldRow}>
                <Field label={t.fields.rente}>
                  <input type="number" min="0" step="0.1" inputMode="decimal" value={rente} onChange={(e) => setRente(e.target.value)} placeholder="4" className={styles.input} />
                </Field>
                <Field label={t.fields.studieschuld}>
                  <input type="number" min="0" inputMode="numeric" value={studieschuld} onChange={(e) => setStudieschuld(e.target.value)} placeholder="0" className={styles.input} />
                </Field>
              </div>
              <Field label={t.fields.energielabel}>
                <select value={energielabel} onChange={(e) => setEnergielabel(e.target.value)} className={styles.select}>
                  <option value="">{t.fields.energielabelPlaceholder}</option>
                  {ENERGIELABEL_OPTIES.map((o) => (
                    <option key={o} value={o}>{energielabelLabel(o, isNl)}</option>
                  ))}
                </select>
              </Field>
              <Field label={t.fields.city}>
                <div className={styles.cityGroup}>
                  {CITIES.map((c) => (
                    <button key={c.value} type="button" onClick={() => setCity(c.value)}
                      className={`${styles.cityButton} ${city === c.value ? styles.cityButtonSelected : ''}`}>
                      {isNl ? c.labelNl : c.labelEn}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </div>

          <div className={styles.resultCard}>
            <div className={styles.resultContent}>
              {!result ? (
                <div className={styles.emptyState}>
                  <Wallet size={40} className={styles.emptyIcon} />
                  <p className={styles.emptyText}>{t.empty}</p>
                </div>
              ) : (
                <div className={styles.resultData}>
                  <div className={styles.resultMain}>
                    <p className={styles.resultLabel}>{t.result.maxKoopprijs}</p>
                    <CountUp to={result.maxKoopprijs} format={fmtEUR} className={styles.resultBigNumber} />
                  </div>
                  <div className={styles.resultRows}>
                    <Row icon={Home} label={t.result.maxHypotheek} value={<CountUp to={result.maxHypotheek} format={fmtEUR} />} />
                    <Row icon={Wallet} label={t.result.maandlasten} value={<CountUp to={result.maandlasten} format={(n) => `${fmtEUR(n)} ${t.result.maandlastenSuffix}`} />} />
                    <Row icon={TrendingUp} label={t.result.gemiddeldIn.replace('{regio}', cityLabel(cityKey, isNl))} value={<CountUp to={gemM2} format={(n) => t.result.m2.replace('{m2}', Math.round(n))} />} />
                  </div>

                  <div className={styles.breakdown}>
                    <p className={styles.breakdownTitle}>{t.onderbouwing.title}</p>
                    <p>{t.onderbouwing.toetsinkomen.replace('{bedrag}', fmtEUR(result.toetsinkomen))}</p>
                    <p>{t.onderbouwing.financieringslast.replace('{percentage}', (result.woonquote * 100).toFixed(1))}</p>
                    <p>{t.onderbouwing.toetsrente.replace('{rente}', Number(rente) || 4)}</p>
                    {result.energieExtra > 0 && <p>{t.onderbouwing.energieExtra.replace('{bedrag}', fmtEUR(result.energieExtra))}</p>}
                    {result.studieEffect > 0 && <p>{t.onderbouwing.studieEffect.replace('{bedrag}', fmtEUR(result.studieEffect))}</p>}
                  </div>

                  <p className={styles.disclaimerBottom}>{t.disclaimerBottom}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.ctaRow}>
          <Link href={leadLink} className={styles.ctaPrimary}>
            <ClipboardList size={18} />{t.ctaIntake}
          </Link>
          <a href={telHref} className={styles.ctaOutline}>
            <Phone size={18} />{t.ctaBel}
          </a>
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div className={styles.field}>
    <label className={styles.fieldLabel}>{label}</label>
    {children}
  </div>
);

const Row = ({ icon: Icon, label, value }) => (
  <div className={styles.row}>
    <span className={styles.rowLabel}>
      <Icon size={16} className={styles.rowIcon} />{label}
    </span>
    <span className={styles.rowValue}>{value}</span>
  </div>
);

export default BuyingPower;