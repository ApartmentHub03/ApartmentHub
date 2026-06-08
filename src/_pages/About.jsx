'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { Shield, Users, Award, CheckCircle } from 'lucide-react';
import styles from './About.module.css';
import { translations } from '../data/translations';

const About = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.about[currentLang] || translations.about.en;

    return (
        <div className={styles.pageContainer}>
            <section className={styles.heroSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.heroContent}>
                        <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
                        <p className={styles.heroSubtitle}>
                            {t.heroSubtitle}
                        </p>
                    </div>
                </div>
            </section>

            <section className={styles.missionSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.missionGrid}>
                        <div className={styles.missionContent}>
                            <div className={styles.card}>
                                <h2 className={styles.sectionTitle}>{t.missionTitle}</h2>
                                <p className={styles.text}>
                                    {t.missionText1}
                                </p>
                                <p className={styles.text}>
                                    {t.missionText2}
                                </p>
                                <div className={styles.btnWrapper}>
                                    <Link href={`/${currentLang}/contact`} className={styles.primaryBtn}>
                                        {t.btnContact}
                                    </Link>
                                </div>
                            </div>
                        </div>
                        <div className={styles.imageContainer}>
                            <div className={styles.imageWrapper}>
                                <img
                                    src="/images/about-mission.jpg"
                                    alt="Amsterdam canal cityscape - ApartmentHub rental mission in the Netherlands"
                                    className={styles.image}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.statsSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.heroContent}>
                        <h2 className={styles.statsTitle}>{t.statsTitle}</h2>
                        <p className={styles.statsSubtitle}>{t.statsSubtitle}</p>
                    </div>
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{t.stat1Value}</div>
                            <div className={styles.statLabel}>{t.stat1Label}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{t.stat2Value}</div>
                            <div className={styles.statLabel}>{t.stat2Label}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{t.stat3Value}</div>
                            <div className={styles.statLabel}>{t.stat3Label}</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statValue}>{t.stat4Value}</div>
                            <div className={styles.statLabel}>{t.stat4Label}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.teamSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.teamGrid}>
                        <div className={styles.teamImageContainer}>
                            <div className={styles.imageWrapper}>
                                <img
                                    src="/images/about2.jpg"
                                    alt="ApartmentHub team helping tenants find apartments for rent in Amsterdam"
                                    className={styles.image}
                                />
                            </div>
                        </div>
                        <div className={styles.missionContent}>
                            <div className={styles.card}>
                                <h2 className={styles.sectionTitle}>{t.teamTitle}</h2>
                                <p className={styles.text}>
                                    {t.teamText1}
                                </p>
                                <p className={styles.text}>
                                    {t.teamText2}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.statsSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.heroContent}>
                        <h2 className={styles.statsTitle}>{t.servicesTitle}</h2>
                        <p className={styles.statsSubtitle}>{t.servicesSubtitle}</p>
                    </div>
                    <div className={styles.valuesGrid}>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.service1Title}</h3>
                            <p className={styles.statLabel}>{t.service1Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.service2Title}</h3>
                            <p className={styles.statLabel}>{t.service2Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.service3Title}</h3>
                            <p className={styles.statLabel}>{t.service3Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.service4Title}</h3>
                            <p className={styles.statLabel}>{t.service4Desc}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.teamSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.heroContent}>
                        <h2 className={styles.statsTitle}>{t.apartmentTypesTitle}</h2>
                        <p className={styles.statsSubtitle}>{t.apartmentTypesSubtitle}</p>
                    </div>
                    <div className={styles.valuesGrid}>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.type1Title}</h3>
                            <p className={styles.statLabel}>{t.type1Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.type2Title}</h3>
                            <p className={styles.statLabel}>{t.type2Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.type3Title}</h3>
                            <p className={styles.statLabel}>{t.type3Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <h3 className={styles.valueTitle}>{t.type4Title}</h3>
                            <p className={styles.statLabel}>{t.type4Desc}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.valuesSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.heroContent}>
                        <h2 className={styles.statsTitle}>{t.valuesTitle}</h2>
                        <p className={styles.statsSubtitle}>{t.valuesSubtitle}</p>
                    </div>
                    <div className={styles.valuesGrid}>
                        <div className={styles.valueCard}>
                            <div className={styles.iconWrapper}>
                                <Shield className={styles.valueIcon} />
                            </div>
                            <h3 className={styles.valueTitle}>{t.val1Title}</h3>
                            <p className={styles.statLabel}>{t.val1Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <div className={styles.iconWrapper}>
                                <Users className={styles.valueIcon} />
                            </div>
                            <h3 className={styles.valueTitle}>{t.val2Title}</h3>
                            <p className={styles.statLabel}>{t.val2Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <div className={styles.iconWrapper}>
                                <Award className={styles.valueIcon} />
                            </div>
                            <h3 className={styles.valueTitle}>{t.val3Title}</h3>
                            <p className={styles.statLabel}>{t.val3Desc}</p>
                        </div>
                        <div className={styles.valueCard}>
                            <div className={styles.iconWrapper}>
                                <CheckCircle className={styles.valueIcon} />
                            </div>
                            <h3 className={styles.valueTitle}>{t.val4Title}</h3>
                            <p className={styles.statLabel}>{t.val4Desc}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.ctaSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.ctaCard}>
                        <h2 className={styles.ctaTitle}>{t.ctaTitle}</h2>
                        <p className={styles.ctaText}>{t.ctaText}</p>
                        <div className={styles.ctaButtons}>
                            <Link href={`/${currentLang}/contact`} className={styles.ctaBtnPrimary}>
                                {t.ctaBtnPrimary}
                            </Link>
                            <Link href={`/${currentLang}/rent-out`} className={styles.ctaBtnSecondary}>
                                {t.ctaBtnSecondary}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default About;
