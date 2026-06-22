'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { translations } from '../data/translations';
import { verkoopSections } from '../data/algemene-voorwaarden-verkoop';
import { ChevronDown } from 'lucide-react';
import styles from './LegalPage.module.css';

const TermsSell = () => {
  const currentLang = useSelector((state) => state.ui.language);
  const t = translations.termsSell[currentLang] || translations.termsSell.en;
  const isNl = currentLang === 'nl';
  const [openIndex, setOpenIndex] = useState(null);

  const toggle = (i) => setOpenIndex(openIndex === i ? null : i);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t.title}</h1>
        <p className={styles.subtitle}>{t.subtitle}</p>
        {verkoopSections.map((section, i) => (
          <section key={i} className={styles.accordionItem}>
            <button className={styles.accordionButton} onClick={() => toggle(i)}>
              <h2 className={styles.sectionHeading}>
                {isNl ? `Artikel ${i + 1} ${section.heading}` : `Article ${i + 1} ${section.heading}`}
              </h2>
              <ChevronDown
                className={`${styles.chevron} ${openIndex === i ? styles.chevronOpen : ''}`}
              />
            </button>
            {openIndex === i && (
              <div className={styles.sectionBody}>
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
};

export default TermsSell;