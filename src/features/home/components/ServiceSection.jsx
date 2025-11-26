import React from 'react';
import { useSelector } from 'react-redux';
import { Check } from 'lucide-react';
import styles from './ServiceSection.module.css';
import { translations } from '../../../data/translations';

const ServiceSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.title}>{t.serviceTitle}</h2>

                <div className={styles.grid}>
                    {/* Landlord Card */}
                    <div className={styles.card}>
                        <div className={styles.iconWrapper}>
                            <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                            </svg>
                        </div>
                        <h3 className={styles.cardTitle}>{t.landlordTitle}</h3>
                        <p className={styles.cardText}>
                            {t.landlordText}
                        </p>
                        <ul className={styles.list}>
                            <li className={styles.listItem}>
                                <Check className={styles.checkIcon} />
                                <span>{t.landlordList1}</span>
                            </li>
                            <li className={styles.listItem}>
                                <Check className={styles.checkIcon} />
                                <span>{t.landlordList2}</span>
                            </li>
                            <li className={styles.listItem}>
                                <Check className={styles.checkIcon} />
                                <span>{t.landlordList3}</span>
                            </li>
                        </ul>
                    </div>

                    {/* Tenant Card */}
                    <div className={styles.card}>
                        <div className={styles.iconWrapper}>
                            <svg className={styles.icon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </div>
                        <h3 className={styles.cardTitle}>{t.tenantTitle}</h3>
                        <p className={styles.cardText}>
                            {t.tenantText}
                        </p>
                        <ul className={styles.list}>
                            <li className={styles.listItem}>
                                <Check className={styles.checkIcon} />
                                <span>{t.tenantList1}</span>
                            </li>
                            <li className={styles.listItem}>
                                <Check className={styles.checkIcon} />
                                <span>{t.tenantList2}</span>
                            </li>
                            <li className={styles.listItem}>
                                <Check className={styles.checkIcon} />
                                <span>{t.tenantList3}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ServiceSection;
