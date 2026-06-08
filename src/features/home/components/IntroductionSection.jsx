'use client';

import React from 'react';
import { useSelector } from 'react-redux';
import { Building2, Users, Globe } from 'lucide-react';
import styles from './IntroductionSection.module.css';
import { translations } from '../../../data/translations';

const IntroductionSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;

    return (
        <section className={styles.section} id="about-apartmenthub">
            <div className={styles.container}>
                <span className={styles.eyebrow}>{t.introEyebrow}</span>
                <h2 className={styles.title}>{t.introTitle}</h2>
                <p className={styles.lead}>{t.introLead}</p>
                <p className={styles.paragraph}>{t.introParagraph1}</p>
                <p className={styles.paragraph}>{t.introParagraph2}</p>

                <h3 className={styles.servicesHeading}>{t.introServiceHeading}</h3>
                <ul className={styles.servicesList}>
                    <li className={styles.serviceItem}>
                        <Users className={styles.serviceIcon} aria-hidden="true" />
                        <span>{t.introServiceTenants}</span>
                    </li>
                    <li className={styles.serviceItem}>
                        <Building2 className={styles.serviceIcon} aria-hidden="true" />
                        <span>{t.introServiceLandlords}</span>
                    </li>
                    <li className={styles.serviceItem}>
                        <Globe className={styles.serviceIcon} aria-hidden="true" />
                        <span>{t.introServiceExpats}</span>
                    </li>
                </ul>
            </div>
        </section>
    );
};

export default IntroductionSection;
