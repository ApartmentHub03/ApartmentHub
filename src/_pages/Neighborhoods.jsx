'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import styles from './Neighborhoods.module.css';
import { translations } from '../data/translations';
import { neighborhoodsData } from '../data/neighborhoodsData';

const neighborhoods = [
    { id: 'centrum', name: 'Centrum', image: '/images/centrum-neighborhood-8xGBhlo4.jpg' },
    { id: 'jordaan', name: 'Jordaan', image: '/images/jordaan-neighborhood-D10TAM1c.jpg' },
    { id: 'noord', name: 'Noord', image: '/images/noord-neighborhood-C3afdJ-w.jpg' },
    { id: 'oost', name: 'Oost', image: '/images/oost-neighborhood-D0P6YpX3.jpg' },
    { id: 'de-pijp', name: 'De Pijp', image: '/images/de-pijp-neighborhood-CerLEEUD.jpg' },
    { id: 'oud-zuid', name: 'Oud-Zuid', image: '/images/oud-zuid-neighborhood-B-g-rFNe.jpg' },
    { id: 'zuidas', name: 'Zuidas', image: '/images/zuidas-neighborhood-BS6cve9Y.jpg' },
    { id: 'zeeburg', name: 'Zeeburg', image: '/images/zeeburg-neighborhood-BtRlc8ql.jpg' },
    { id: 'nieuw-west', name: 'Nieuw-West', image: '/images/nieuw-west-neighborhood-DhzrAv7H.jpg' },
];

const getStudioPrice = (id) => {
    const studio = neighborhoodsData?.[id]?.en?.marketData?.rentalPrices?.find((p) => p.name === 'Studio');
    return studio ? studio.price : null;
};

const formatEuro = (amount, lang) => {
    const locale = lang === 'nl' ? 'nl-NL' : 'en-IE';
    return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(amount);
};

const Neighborhoods = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.neighborhoods[currentLang] || translations.neighborhoods.en;
    const resources = translations.neighborhoodsResources[currentLang] || translations.neighborhoodsResources.en;

    const priceGuide = useMemo(() => {
        return neighborhoods
            .map((n) => ({ ...n, studio: getStudioPrice(n.id) }))
            .filter((n) => n.studio != null)
            .sort((a, b) => a.studio - b.studio);
    }, []);

    const nameById = useMemo(() => {
        const map = {};
        neighborhoods.forEach((n) => {
            map[n.id] = n.name;
        });
        return map;
    }, []);

    return (
        <div className={styles.pageContainer}>
            <section className={styles.heroSection}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>{t.title}</h1>
                    <p className={styles.heroSubtitle}>
                        {t.subtitle}
                    </p>
                </div>
            </section>

            <section className={styles.introSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>{t.introHeading}</h2>
                    <p className={styles.introBody}>{t.introBody}</p>
                </div>
            </section>

            <section className={styles.gridSection}>
                <div className={styles.container}>
                    <div className={styles.grid}>
                        {neighborhoods.map((neighborhood) => (
                            <Link
                                key={neighborhood.id}
                                href={`/${currentLang}/neighborhood/${neighborhood.id}`}
                                className={styles.card}
                            >
                                <div className={styles.imageWrapper}>
                                    <img
                                        src={neighborhood.image}
                                        alt={`${neighborhood.name} Amsterdam neighborhood`}
                                        className={styles.image}
                                        loading="lazy"
                                    />
                                </div>
                                <div className={styles.cardOverlay}>
                                    <div className={styles.cardContent}>
                                        <h3 className={styles.cardTitle}>{neighborhood.name}</h3>
                                        <p className={styles.cardLink}>{t.readMore} →</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.bestForSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>{t.bestForTitle}</h2>
                    <p className={styles.sectionSubtitle}>{t.bestForSubtitle}</p>
                    <div className={styles.bestForGrid}>
                        {t.bestFor.map((group) => (
                            <article key={group.label} className={styles.bestForCard}>
                                <h3 className={styles.bestForLabel}>{group.label}</h3>
                                <p className={styles.bestForDescription}>{group.description}</p>
                                <ul className={styles.bestForList}>
                                    {group.picks.map((slug) => (
                                        <li key={slug}>
                                            <Link
                                                href={`/${currentLang}/neighborhood/${slug}`}
                                                className={styles.bestForLink}
                                            >
                                                {nameById[slug] || slug} →
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.priceSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>{t.priceGuideTitle}</h2>
                    <p className={styles.sectionSubtitle}>{t.priceGuideSubtitle}</p>
                    <div className={styles.priceTableWrapper}>
                        <table className={styles.priceTable}>
                            <thead>
                                <tr>
                                    <th scope="col">{t.priceGuideColArea}</th>
                                    <th scope="col">{t.priceGuideColStudio}</th>
                                    <th scope="col" className={styles.priceColCta}>{t.priceGuideColCta}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {priceGuide.map((row) => (
                                    <tr key={row.id}>
                                        <th scope="row" className={styles.priceArea}>{row.name}</th>
                                        <td>{formatEuro(row.studio, currentLang)}</td>
                                        <td className={styles.priceColCta}>
                                            <Link
                                                href={`/${currentLang}/neighborhood/${row.id}`}
                                                className={styles.priceLink}
                                            >
                                                {t.priceGuideCta} →
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <section className={styles.resourcesSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>{t.resourcesTitle}</h2>
                    <p className={styles.sectionSubtitle}>{t.resourcesSubtitle}</p>
                    <div className={styles.resourcesGrid}>
                        {resources.map((resource) => (
                            <Link key={resource.key} href={resource.href} className={styles.resourceCard}>
                                <h3 className={styles.resourceTitle}>{resource.title}</h3>
                                <p className={styles.resourceDescription}>{resource.description}</p>
                                <span className={styles.resourceCta}>{resource.cta} →</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.faqSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>{t.faqTitle}</h2>
                    <div className={styles.faqList}>
                        {t.faq.map((item) => (
                            <details key={item.q} className={styles.faqItem}>
                                <summary className={styles.faqQuestion}>{item.q}</summary>
                                <p className={styles.faqAnswer}>{item.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Neighborhoods;
