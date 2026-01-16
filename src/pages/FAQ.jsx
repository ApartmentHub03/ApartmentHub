import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, Mail } from 'lucide-react';
import styles from './FAQ.module.css';
import { translations } from '../data/translations';

const WhatsAppIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"></path>
    </svg>
);

const FAQ = () => {
    const [openIndex, setOpenIndex] = useState(null);
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.faq[currentLang] || translations.faq.en;

    const faqs = [
        {
            question: t.q1,
            answer: t.a1
        },
        {
            question: t.q2,
            answer: t.a2
        },
        {
            question: t.q3,
            answer: t.a3
        },
        {
            question: t.q4,
            answer: t.a4
        },
        {
            question: t.q5,
            answer: t.a5
        },
        {
            question: t.q6,
            answer: t.a6
        },
        {
            question: t.q7,
            answer: t.a7
        },
        {
            question: t.q8,
            answer: t.a8
        }
    ];

    const toggleAccordion = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className={styles.pageContainer}>
            <section className={styles.heroSection}>
                <div className={styles.heroContainer}>
                    <h1 className={styles.heroTitle}>{t.title}</h1>
                    <p className={styles.heroSubtitle}>
                        {t.subtitle}
                    </p>
                </div>
            </section>

            <section className={styles.faqSection}>
                <div className={styles.faqContainer}>
                    <div className={styles.faqList}>
                        {faqs.map((faq, index) => (
                            <div key={index} className={styles.faqItem}>
                                <button
                                    className={styles.faqButton}
                                    onClick={() => toggleAccordion(index)}
                                    aria-expanded={openIndex === index}
                                >
                                    <h3 className={styles.questionText}>{faq.question}</h3>
                                    <ChevronDown
                                        className={`${styles.chevronIcon} ${openIndex === index ? styles.open : ''}`}
                                    />
                                </button>
                                <div
                                    className={`${styles.answerContainer} ${openIndex === index ? styles.open : ''}`}
                                >
                                    <div className={styles.answerContent}>
                                        <p>{faq.answer}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.contactSection}>
                <div className={styles.contactContainer}>
                    <h2 className={styles.contactTitle}>{t.contactTitle}</h2>
                    <p className={styles.contactSubtitle}>
                        {t.contactSubtitle}
                    </p>
                    <div className={styles.contactActions}>
                        <a
                            href="https://wa.me/31658975449"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.whatsappBtn}
                        >
                            <WhatsAppIcon className={styles.btnIcon} />
                            <span>{t.btnWhatsapp}</span>
                        </a>
                        <a
                            href="mailto:info@apartmenthub.nl"
                            className={styles.emailBtn}
                        >
                            <Mail className={styles.btnIcon} />
                            <span>{t.btnEmail}</span>
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default FAQ;
