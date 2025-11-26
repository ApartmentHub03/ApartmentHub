import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { MapPin, ArrowLeft } from 'lucide-react';
import styles from './NeighborhoodDetail.module.css';
import { neighborhoodsData } from '../data/neighborhoodsData';

import { useSelector } from 'react-redux';

const NeighborhoodDetail = () => {
    const { id } = useParams();
    const currentLang = useSelector((state) => state.ui.language);
    const [activeTab, setActiveTab] = useState('overview');

    const neighborhood = neighborhoodsData[id]?.[currentLang] || neighborhoodsData[id]?.['en'];

    if (!neighborhood) {
        return <Navigate to="/en/neighborhoods" replace />;
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <Link to={currentLang === 'nl' ? "/nl/neighborhoods" : "/en/neighborhoods"} className={styles.backLink}>
                    <ArrowLeft size={20} />
                    {currentLang === 'nl' ? 'Terug naar Kaart' : 'Back to Map'}
                </Link>

                <div className={styles.headerCard}>
                    <div className={styles.headerTitleWrapper}>
                        <MapPin className={styles.headerIcon} />
                        <h1 className={styles.title}>{neighborhood.title}</h1>
                    </div>
                    <p className={styles.description}>
                        {neighborhood.description}
                    </p>
                </div>

                <div className={styles.mainCard}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            {currentLang === 'nl' ? 'Overzicht' : 'Overview'}
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'market' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('market')}
                        >
                            {currentLang === 'nl' ? 'Marktdata' : 'Market Data'}
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'livability' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('livability')}
                        >
                            {currentLang === 'nl' ? 'Leefbaarheid' : 'Livability'}
                        </button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === 'overview' && (
                            <div className={styles.grid}>
                                <div>
                                    <h2 className={styles.sectionTitle}>{currentLang === 'nl' ? 'Sfeer & Levensstijl' : 'Atmosphere & Lifestyle'}</h2>
                                    <p className={styles.paragraph}>
                                        {neighborhood.atmosphere}
                                    </p>
                                </div>
                                <div>
                                    <h2 className={styles.sectionTitle}>{currentLang === 'nl' ? 'Belangrijkste Hoogtepunten' : 'Key Highlights'}</h2>
                                    <ul className={styles.list}>
                                        {neighborhood.highlights.map((highlight, index) => (
                                            <li key={index} className={styles.listItem}>
                                                <div className={styles.bullet}></div>
                                                <span className={styles.listText}>{highlight}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                        {activeTab === 'market' && (
                            <div className={styles.paragraph}>Market Data content coming soon...</div>
                        )}
                        {activeTab === 'livability' && (
                            <div className={styles.paragraph}>Livability content coming soon...</div>
                        )}
                    </div>
                </div>

                <div className={styles.ctaCard}>
                    <h3 className={styles.ctaTitle}>{currentLang === 'nl' ? `Geïnteresseerd in ${neighborhood.title}?` : `Interested in ${neighborhood.title}?`}</h3>
                    <p className={styles.ctaText}>{currentLang === 'nl' ? 'Laat ons je helpen het perfecte huis in deze wijk te vinden.' : 'Let us help you find the perfect home in this neighborhood.'}</p>
                    <div className={styles.ctaButtons}>
                        <Link to="/en/rent-in" className={styles.primaryButton}>
                            {currentLang === 'nl' ? 'Zoek een Huis Hier' : 'Find a Home Here'}
                        </Link>
                        <Link to="/en/contact" className={styles.secondaryButton}>
                            {currentLang === 'nl' ? 'Krijg Deskundig Advies' : 'Get Expert Advice'}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NeighborhoodDetail;
