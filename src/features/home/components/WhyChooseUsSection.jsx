import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './WhyChooseUsSection.module.css';
import videoSource from '../../../assets/homepage-video-oTK_tJ-O.mp4';
import { translations } from '../../../data/translations';

const WhyChooseUsSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;

    return (
        <section className={styles.section} id="why-choose-us">
            <div className={styles.container}>
                <div className={styles.grid}>
                    <div className={styles.contentColumn}>
                        <div className={styles.card}>
                            <h2 className={styles.title}>{t.whyChooseUsTitle}</h2>
                            <p className={styles.text}>{t.whyChooseUsText}</p>
                            <div className={styles.actionWrapper}>
                                <Link to={currentLang === 'nl' ? "/nl/rent-out" : "/en/rent-out"} className={styles.btn}>{t.whyChooseUsBtn}</Link>
                            </div>
                        </div>
                    </div>
                    <div className={styles.videoColumn}>
                        <div className={styles.videoWrapper}>
                            <video className={styles.video} autoPlay loop playsInline muted>
                                <source src={videoSource} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhyChooseUsSection;
