'use client';

import { CheckCircle2 } from 'lucide-react';
import styles from './PricingCallout.module.css';

const PricingCallout = ({ headline, supportText }) => (
    <section className={styles.section}>
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.accent}></div>
                <div className={styles.body}>
                    <div className={styles.iconBadge}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div className={styles.textBlock}>
                        <p className={styles.headline}>
                            {headline || '1% courtage exclusief BTW, no cure no pay'}
                        </p>
                        <p className={styles.support}>
                            {supportText || 'Geen kosten vooraf. Geen verrassingen. Alleen courtage bij succesvolle transactie, te voldoen bij notariële overdracht.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>
);

export default PricingCallout;