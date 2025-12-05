import React from 'react';
import styles from '../../pages/RentIn.module.css';

const StatsSection = ({ translations }) => {
    const t = translations;

    return (
        <section className={styles.trustedSection}>
            <div className={styles.container}>
                <h2 className={styles.trustedTitle}>{t.trustedTitle}</h2>
                <p className={styles.trustedSubtitle}>{t.trustedSubtitle}</p>
                <div className={styles.trustedGrid}>
                    <div className={styles.trustedCard}>
                        <div className={styles.trustedValue}>2884</div>
                        <div className={styles.trustedLabel}>{t.trustedStat1Label}</div>
                    </div>
                    <div className={styles.trustedCard}>
                        <div className={styles.trustedValue}>98%</div>
                        <div className={styles.trustedLabel}>{t.trustedStat2Label}</div>
                    </div>
                    <div className={styles.trustedCard}>
                        <div className={styles.trustedValue}>5/5</div>
                        <div className={styles.trustedLabel}>{t.trustedStat3Label}</div>
                    </div>
                    <div className={styles.trustedCard}>
                        <div className={styles.trustedValue}>24/7</div>
                        <div className={styles.trustedLabel}>{t.trustedStat4Label}</div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default StatsSection;
