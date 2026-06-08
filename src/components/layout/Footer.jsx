'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import styles from './Footer.module.css';
import { translations } from '@/data/translations';

const Footer = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.footer[currentLang] || translations.footer.en;
    const langPrefix = currentLang === 'nl' ? '/nl' : '/en';
    const apartmentsPath = currentLang === 'nl' ? '/nl/appartementen' : '/en/apartments';

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.brandCol}>
                        <div className={styles.brandHeader}>
                            <div className={styles.logoBox}>
                                <span className={styles.logoText}>AH</span>
                            </div>
                            <span className={styles.brandName}>ApartmentHub</span>
                        </div>
                        <p className={styles.description}>
                            {t.description}
                        </p>
                        <p className={styles.email}>
                            {t.emailLabel} <a href="mailto:info@apartmenthub.nl" className={styles.emailLink}>info@apartmenthub.nl</a>
                        </p>
                    </div>

                    <div>
                        <h3 className={styles.heading}>{t.quickLinks}</h3>
                        <ul className={styles.linkList}>
                            <li><Link href={`${langPrefix}/rent-out`} className={styles.link}>{t.linkRentOut}</Link></li>
                            <li><Link href={`${langPrefix}/rent-in`} className={styles.link}>{t.linkRentIn}</Link></li>
                            <li><Link href={apartmentsPath} className={styles.link}>{t.linkApartments}</Link></li>
                            <li><Link href={`${langPrefix}/neighborhoods`} className={styles.link}>{t.linkNeighborhoods}</Link></li>
                            <li><Link href={`${langPrefix}/about-us`} className={styles.link}>{t.linkAbout}</Link></li>
                            <li><Link href={`${langPrefix}/contact`} className={styles.link}>{t.linkContact}</Link></li>
                            <li><Link href={`${langPrefix}/faq`} className={styles.link}>{t.linkFaq}</Link></li>
                            <li><Link href={`${langPrefix}/terms-and-conditions`} className={styles.link}>{t.linkTerms}</Link></li>
                            <li><Link href={`${langPrefix}/privacy-policy`} className={styles.link}>{t.linkPrivacy}</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className={styles.heading}>{t.newsletter}</h3>
                        <form className={styles.form}>
                            <input
                                type="email"
                                placeholder={t.emailPlaceholder}
                                className={styles.input}
                                required
                            />
                            <button type="submit" className={styles.button}>{t.subscribe}</button>
                        </form>
                    </div>
                </div>

                <div className={styles.bottomBar}>
                    <div className={styles.socials}>
                        <a
                            href="https://www.instagram.com/apartmenthub/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                        >
                            Instagram
                        </a>
                        <a
                            href="https://www.linkedin.com/company/apartmenthub/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.socialLink}
                        >
                            LinkedIn
                        </a>
                    </div>
                    <p className={styles.copyright}>{t.copyright}</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
