import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { House, ArrowRight, Heart, Users, Clock, TrendingUp } from 'lucide-react';
import styles from './HeroSection.module.css';
import logoImage from '../../../assets/5a9afd14-27a5-40d8-a185-fac727f64fdf.png';
import { translations } from '../../../data/translations';

import ChatWidget from './ChatWidget';

const HeroSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;

    return (
        <section className={styles.heroSection}>
            <div className={styles.bgGradientOverlay}></div>
            <div className={styles.blob1}></div>
            <div className={styles.blob2}></div>

            <div className={styles.container}>
                <div className={styles.logoContainer}>
                    <div className={styles.logoWrapper}>
                        <img
                            src={logoImage}
                            alt="ApartmentHub Logo"
                            className={styles.logoIcon}
                        />
                    </div>
                </div>

                <div className={styles.contentWrapper}>
                    <h1 className={styles.headline}>
                        <span className={styles.gradientText1}>{t.heroTitle1}</span>
                        <span className={styles.gradientText2}>{t.heroTitle2}</span>
                    </h1>
                </div>

                <p className={styles.subtext1}>{t.heroSubtext1}</p>
                <p className={styles.subtext2}>{t.heroSubtext2}</p>

                <div className={styles.actionButtons}>
                    <Link to={currentLang === 'nl' ? "/nl/rent-out" : "/en/rent-out"} className={`${styles.btn} ${styles.btnPrimary}`}>
                        <House className={styles.btnIcon} />
                        <span>{t.ctaRentOut}</span>
                        <ArrowRight className={styles.arrowIcon} />
                    </Link>
                    <Link to={currentLang === 'nl' ? "/nl/rent-in" : "/en/rent-in"} className={`${styles.btn} ${styles.btnSecondary}`}>
                        <Heart className={styles.btnIcon} />
                        <span>{t.ctaRentIn}</span>
                        <ArrowRight className={styles.arrowIcon} />
                    </Link>
                </div>

                <div className={styles.statsContainer}>
                    <div className={styles.statsBox}>
                        <div className={`${styles.statItem} ${styles.groupHoverPrimary}`}>
                            <Users className={styles.statIcon} />
                            <span className={styles.statText}>{t.statsClients}</span>
                        </div>
                        <div className={styles.divider}></div>
                        <div className={`${styles.statItem} ${styles.groupHoverOrange}`}>
                            <Clock className={styles.statIcon} />
                            <span className={styles.statText}>{t.statsSupport}</span>
                        </div>
                        <div className={styles.dividerLg}></div>
                        <div className={`${styles.statItem} ${styles.groupHoverPrimary} ${styles.hiddenLg}`}>
                            <TrendingUp className={styles.statIcon} />
                            <span className={styles.statText}>{t.statsService}</span>
                        </div>
                    </div>
                </div>
            </div>
            <ChatWidget />
        </section>
    );
};

export default HeroSection;
