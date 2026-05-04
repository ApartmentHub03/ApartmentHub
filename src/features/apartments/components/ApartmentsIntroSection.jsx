'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import styles from './ApartmentsIntroSection.module.css';
import { translations } from '../../../data/translations';

const ApartmentsIntroSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.apartmentsIntro[currentLang] || translations.apartmentsIntro.en;

    return (
        <section className={styles.section} aria-labelledby="apartments-intro-title">
            <div className={styles.container}>
                <span className={styles.eyebrow}>{t.eyebrow}</span>
                <h1 id="apartments-intro-title" className={styles.title}>{t.title}</h1>
                <p className={styles.lead}>{t.lead}</p>
                <p className={styles.paragraph}>{t.paragraph1}</p>
                <p className={styles.paragraph}>{t.paragraph2}</p>
            </div>
        </section>
    );
};

export default ApartmentsIntroSection;
