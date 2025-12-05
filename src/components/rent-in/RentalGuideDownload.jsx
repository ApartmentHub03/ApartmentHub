import React from 'react';
import { FileText, Home, Shield, Users, CheckCircle, Download, Play } from 'lucide-react';
import styles from '../../pages/RentIn.module.css';
import rentalGuide from '../../assets/amsterdam-rental-guide-2024.pdf';

const RentalGuideDownload = ({ translations }) => {
    const t = translations;

    return (
        <section className={styles.guideSection}>
            <div className={styles.container}>
                <div className={styles.guideGrid}>
                    <div className={styles.guideContent}>
                        <div className={styles.freeDownloadBadge}>
                            <FileText className={styles.badgeIcon} />
                            <span className={styles.badgeText}>{t.guideBadge}</span>
                        </div>
                        <h2 className={styles.guideTitle}>{t.guideTitle}</h2>
                        <p className={styles.guideDesc}>{t.guideDesc}</p>

                        <div className={styles.featuresGrid}>
                            <div className={styles.featureItem}>
                                <div className={styles.featureIconBox}>
                                    <Home className={styles.featureIcon} />
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>{t.feature1Title}</h3>
                                    <p className={styles.featureDesc}>{t.feature1Desc}</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <div className={styles.featureIconBox}>
                                    <Shield className={styles.featureIcon} />
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>{t.feature2Title}</h3>
                                    <p className={styles.featureDesc}>{t.feature2Desc}</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <div className={styles.featureIconBox}>
                                    <Users className={styles.featureIcon} />
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>{t.feature3Title}</h3>
                                    <p className={styles.featureDesc}>{t.feature3Desc}</p>
                                </div>
                            </div>
                            <div className={styles.featureItem}>
                                <div className={styles.featureIconBox}>
                                    <FileText className={styles.featureIcon} />
                                </div>
                                <div>
                                    <h3 className={styles.featureTitle}>{t.feature4Title}</h3>
                                    <p className={styles.featureDesc}>{t.feature4Desc}</p>
                                </div>
                            </div>
                        </div>

                        <div className={styles.statsRow}>
                            <div className={styles.statBadge}>
                                <CheckCircle className={styles.checkIcon} />
                                <span>{t.statDownloads}</span>
                            </div>
                            <div className={styles.statBadge}>
                                <CheckCircle className={styles.checkIcon} />
                                <span>{t.statFree}</span>
                            </div>
                            <div className={styles.statBadge}>
                                <CheckCircle className={styles.checkIcon} />
                                <span>{t.statUpdated}</span>
                            </div>
                        </div>

                        <a
                            href={rentalGuide}
                            download="Amsterdam_Rental_Guide_2024.pdf"
                            className={styles.downloadBtn}
                        >
                            <div className={styles.btnContent}>
                                <Download className={styles.btnIcon} />
                                <span>{t.btnDownload}</span>
                            </div>
                        </a>
                    </div>

                    <div className={styles.guideVisual}>
                        <div className={styles.videoPlaceholder}>
                            <div className={styles.videoPlayButton}>
                                <Play style={{ width: '3rem', height: '3rem', color: 'white' }} />
                            </div>
                            <div className={styles.videoOverlay}>
                                <p className={styles.videoText}>Video komt binnenkort</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default RentalGuideDownload;
