'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import styles from './AmsterdamGuideSection.module.css';
import { translations } from '../../../data/translations';

const AmsterdamGuideSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;
    const guide = t.guide;

    return (
        <section className={styles.section} id="amsterdam-apartment-guide" aria-labelledby="amsterdam-apartment-guide-title">
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles.eyebrow}>{guide.eyebrow}</span>
                    <h2 id="amsterdam-apartment-guide-title" className={styles.title}>{guide.title}</h2>
                    <p className={styles.intro}>{guide.intro}</p>
                </div>

                <div className={styles.grid}>
                    {guide.neighborhoods.map((item) => (
                        <article key={item.slug} className={styles.card}>
                            <span className={styles.cardTag}>{item.tag}</span>
                            <h3 className={styles.cardTitle}>{item.name}</h3>
                            <p className={styles.cardText}>{item.description}</p>
                            <p className={styles.cardPrice}>{item.priceRange}</p>
                        </article>
                    ))}
                </div>

                <div className={styles.tipsWrapper}>
                    <h3 className={styles.tipsTitle}>{guide.tipsTitle}</h3>
                    <p className={styles.tipsSubtitle}>{guide.tipsSubtitle}</p>
                    <ol className={styles.tipsList}>
                        {guide.tips.map((tip, index) => (
                            <li key={tip.heading} className={styles.tipItem}>
                                <span className={styles.tipNumber} aria-hidden="true">{index + 1}</span>
                                <div className={styles.tipBody}>
                                    <h4 className={styles.tipHeading}>{tip.heading}</h4>
                                    <p className={styles.tipText}>{tip.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                    <Link
                        href={currentLang === 'nl' ? '/nl/neighborhoods' : '/en/neighborhoods'}
                        className={styles.cta}
                    >
                        {guide.cta}
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default AmsterdamGuideSection;
