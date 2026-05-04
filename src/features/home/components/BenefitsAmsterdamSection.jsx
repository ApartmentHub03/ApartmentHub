'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Bike, Briefcase, Globe2, Train, Sparkles, ShieldCheck } from 'lucide-react';
import styles from './BenefitsAmsterdamSection.module.css';
import { translations } from '../../../data/translations';

const ICONS = [Briefcase, Bike, Train, Globe2, Sparkles, ShieldCheck];

const BenefitsAmsterdamSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;
    const benefits = t.benefitsAmsterdam;

    return (
        <section className={styles.section} id="benefits-renting-amsterdam" aria-labelledby="benefits-renting-amsterdam-title">
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles.eyebrow}>{benefits.eyebrow}</span>
                    <h2 id="benefits-renting-amsterdam-title" className={styles.title}>{benefits.title}</h2>
                    <p className={styles.intro}>{benefits.intro}</p>
                </div>

                <div className={styles.grid}>
                    {benefits.items.map((item, index) => {
                        const Icon = ICONS[index] || Sparkles;
                        return (
                            <article key={item.heading} className={styles.card}>
                                <Icon className={styles.cardIcon} aria-hidden="true" />
                                <h3 className={styles.cardTitle}>{item.heading}</h3>
                                <p className={styles.cardText}>{item.text}</p>
                            </article>
                        );
                    })}
                </div>

                <p className={styles.outro}>{benefits.outro}</p>

                <div className={styles.ctaWrapper}>
                    <Link
                        href={currentLang === 'nl' ? '/nl/appartementen-te-huur-in-amsterdam' : '/en/apartments-for-rent-in-amsterdam'}
                        className={styles.cta}
                    >
                        {benefits.cta}
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default BenefitsAmsterdamSection;
