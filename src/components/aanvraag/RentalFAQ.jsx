import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import styles from './RentalFAQ.module.css';

const faqs = {
    nl: [
        {
            q: 'Welke documenten zijn verplicht?',
            a: 'De vereiste documenten zijn afhankelijk van uw arbeidsstatus. Selecteer uw status om te zien welke documenten nodig zijn.'
        },
        {
            q: 'Wat is inbegrepen in de huurprijs?',
            a: 'De huurprijs is exclusief gas, water en elektra. Servicekosten kunnen wel inbegrepen zijn, afhankelijk van de woning.'
        },
        {
            q: 'Hoe lang duurt de aanvraagprocedure? Wanneer krijg ik reactie op mijn bod?',
            a: 'Na het indienen van uw aanvraag ontvangt u binnen 24-48 uur een reactie. De gehele procedure duurt gemiddeld 1-2 weken.'
        },
        {
            q: 'Wat gebeurt er na indienen van de aanvraag?',
            a: 'Na indienen wordt uw aanvraag beoordeeld door de verhuurder. Bij goedkeuring nemen wij contact met u op voor de volgende stappen.'
        },
    ],
    en: [
        {
            q: 'Which documents are required?',
            a: 'The required documents depend on your employment status. Select your status to see which documents are needed.'
        },
        {
            q: 'What is included in the rent price?',
            a: 'The rent price excludes gas, water and electricity. Service costs may be included, depending on the property.'
        },
        {
            q: 'How long does the application process take? When will I receive a response to my bid?',
            a: 'After submitting your application, you will receive a response within 24-48 hours. The entire process takes an average of 1-2 weeks.'
        },
        {
            q: 'What happens after submitting the application?',
            a: 'After submission, your application will be reviewed by the landlord. If approved, we will contact you for the next steps.'
        },
    ]
};

const RentalFAQ = ({ lang = 'nl' }) => {
    const [openIndex, setOpenIndex] = useState(null);
    const questions = faqs[lang] || faqs.nl;

    const toggle = (index) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className={styles.container}>
            <h3 className={styles.header}>
                <div className={styles.iconWrapper}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={styles.headerIcon}
                    >
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                    </svg>
                </div>
                {lang === 'en' ? 'Frequently asked questions' : 'Veelgestelde vragen'}
            </h3>

            <div className={styles.accordion}>
                {questions.map((faq, index) => (
                    <div key={index} className={styles.item}>
                        <button
                            type="button"
                            className={styles.trigger}
                            onClick={() => toggle(index)}
                        >
                            <span className={styles.question}>{faq.q}</span>
                            <ChevronDown
                                size={18}
                                className={`${styles.chevron} ${openIndex === index ? styles.chevronOpen : ''}`}
                            />
                        </button>
                        {openIndex === index && (
                            <div className={styles.content}>
                                {faq.a}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RentalFAQ;
