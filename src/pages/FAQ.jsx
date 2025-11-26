import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, Mail, MessageCircle } from 'lucide-react';
import styles from './FAQ.module.css';
import { translations } from '../data/translations';

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
                            <MessageCircle className={styles.btnIcon} />
                            <span>{t.btnWhatsapp}</span>
                        </a>
                        <a
                            href="mailto:hello@apartmenthub.com"
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
