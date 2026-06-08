'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import styles from './RentApartmentAmsterdamFAQ.module.css';
import { translations } from '../../data/translations';

const RentApartmentAmsterdamFAQ = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.rentInFaq[currentLang] || translations.rentInFaq.en;
    const apartmentsHref = currentLang === 'nl' ? '/nl/appartementen' : '/en/apartments';

    const faqJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: t.items.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: item.answerPlain,
            },
        })),
    };

    return (
        <section className={styles.section} id="rent-apartment-amsterdam-faq" aria-labelledby="rent-apartment-amsterdam-faq-title">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
            />
            <div className={styles.container}>
                <div className={styles.header}>
                    <span className={styles.eyebrow}>{t.eyebrow}</span>
                    <h2 id="rent-apartment-amsterdam-faq-title" className={styles.title}>{t.title}</h2>
                    <p className={styles.intro}>{t.intro}</p>
                </div>

                <div className={styles.grid}>
                    {t.items.map((item) => (
                        <article key={item.question} className={styles.card}>
                            <h3 className={styles.cardTitle}>{item.question}</h3>
                            <p className={styles.cardText}>{item.answer}</p>
                        </article>
                    ))}
                </div>

                <div className={styles.ctaWrapper}>
                    <Link href={apartmentsHref} className={styles.cta}>
                        {t.cta}
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default RentApartmentAmsterdamFAQ;
