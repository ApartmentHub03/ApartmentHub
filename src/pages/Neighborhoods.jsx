import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from './Neighborhoods.module.css';
import { translations } from '../data/translations';

import centrumImg from '../assets/centrum-neighborhood-8xGBhlo4.jpg';
import jordaanImg from '../assets/jordaan-neighborhood-D10TAM1c.jpg';
import noordImg from '../assets/noord-neighborhood-C3afdJ-w.jpg';
import oostImg from '../assets/oost-neighborhood-D0P6YpX3.jpg';
import dePijpImg from '../assets/de-pijp-neighborhood-CerLEEUD.jpg';
import oudZuidImg from '../assets/oud-zuid-neighborhood-B-g-rFNe.jpg';
import zuidasImg from '../assets/zuidas-neighborhood-BS6cve9Y.jpg';
import zeeburgImg from '../assets/zeeburg-neighborhood-BtRlc8ql.jpg';
import nieuwWestImg from '../assets/nieuw-west-neighborhood-DhzrAv7H.jpg';

const neighborhoods = [
    { id: 'centrum', name: 'Centrum', image: centrumImg },
    { id: 'jordaan', name: 'Jordaan', image: jordaanImg },
    { id: 'noord', name: 'Noord', image: noordImg },
    { id: 'oost', name: 'Oost', image: oostImg },
    { id: 'de-pijp', name: 'De Pijp', image: dePijpImg },
    { id: 'oud-zuid', name: 'Oud-Zuid', image: oudZuidImg },
    { id: 'zuidas', name: 'Zuidas', image: zuidasImg },
    { id: 'zeeburg', name: 'Zeeburg', image: zeeburgImg },
    { id: 'nieuw-west', name: 'Nieuw-West', image: nieuwWestImg },
];

const Neighborhoods = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.neighborhoods[currentLang] || translations.neighborhoods.en;

    return (
        <div className={styles.pageContainer}>
            <section className={styles.heroSection}>
                <div className={styles.container}>
                    <h1 className={styles.heroTitle}>{t.title}</h1>
                    <p className={styles.heroSubtitle}>
                        {t.subtitle}
                    </p>
                </div>
            </section>

            <section className={styles.gridSection}>
                <div className={styles.container}>
                    <div className={styles.grid}>
                        {neighborhoods.map((neighborhood) => (
                            <Link
                                key={neighborhood.id}
                                to={`/${currentLang}/neighborhood/${neighborhood.id}`}
                                className={styles.card}
                            >
                                <div className={styles.imageWrapper}>
                                    <img
                                        src={neighborhood.image}
                                        alt={neighborhood.name}
                                        className={styles.image}
                                        loading="lazy"
                                    />
                                </div>
                                <div className={styles.cardOverlay}>
                                    <div className={styles.cardContent}>
                                        <h3 className={styles.cardTitle}>{neighborhood.name}</h3>
                                        <p className={styles.cardLink}>{t.readMore} →</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Neighborhoods;
