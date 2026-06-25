'use client';

import { useSelector } from 'react-redux';
import Link from 'next/link';
import { translations } from '../data/translations';
import styles from './Valuation.module.css';
import ValuationWidget from './ValuationWidget';
import { ArrowLeft, Home } from 'lucide-react';

const Valuation = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.valuation[currentLang] || translations.valuation.en;
    const backLink = currentLang === 'nl' ? '/verkoop' : '/en/sell';

    return (
        <div className={styles.pageContainer}>
            <div className={styles.innerContainer}>
                <div className={styles.header}>
                    <Link href={backLink} className={styles.backLink}>
                        <ArrowLeft className={styles.icon4} />{t.backLink}
                    </Link>
                    <div className={styles.badge}>
                        <Home className={styles.icon3_5} />{t.badge}
                    </div>
                    <h1 className={styles.title}>{t.title}</h1>
                    <p className={styles.subtitle}>{t.subtitle}</p>
                </div>

                <ValuationWidget embedded={false} />
            </div>
        </div>
    );
};

export default Valuation;