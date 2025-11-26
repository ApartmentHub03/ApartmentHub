import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowLeft } from 'lucide-react';
import styles from './Centrum.module.css';

const Centrum = () => {
    const [activeTab, setActiveTab] = useState('overview');

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentWrapper}>
                <Link to="/en/neighborhoods" className={styles.backLink}>
                    <ArrowLeft size={20} />
                    Back to Map
                </Link>

                <div className={styles.headerCard}>
                    <div className={styles.headerTitleWrapper}>
                        <MapPin className={styles.headerIcon} />
                        <h1 className={styles.title}>Centrum</h1>
                    </div>
                    <p className={styles.description}>
                        The historic heart of Amsterdam, where centuries-old architecture meets modern city life, offering an unparalleled urban experience in one of Europe's most beautiful city centers.
                    </p>
                </div>

                <div className={styles.mainCard}>
                    <div className={styles.tabs}>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('overview')}
                        >
                            Overview
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'market' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('market')}
                        >
                            Market Data
                        </button>
                        <button
                            className={`${styles.tabButton} ${activeTab === 'livability' ? styles.activeTab : ''}`}
                            onClick={() => setActiveTab('livability')}
                        >
                            Livability
                        </button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === 'overview' && (
                            <div className={styles.grid}>
                                <div>
                                    <h2 className={styles.sectionTitle}>Atmosphere & Lifestyle</h2>
                                    <p className={styles.paragraph}>
                                        Centrum attracts those who want to be in the center of everything - tourists, young professionals, and urbanites who thrive on energy and convenience. Living here means being walking distance from major attractions, restaurants, and nightlife.
                                    </p>
                                </div>
                                <div>
                                    <h2 className={styles.sectionTitle}>Key Highlights</h2>
                                    <ul className={styles.list}>
                                        <li className={styles.listItem}>
                                            <div className={styles.bullet}></div>
                                            <span className={styles.listText}>Dam Square and Royal Palace</span>
                                        </li>
                                        <li className={styles.listItem}>
                                            <div className={styles.bullet}></div>
                                            <span className={styles.listText}>Red Light District historic area</span>
                                        </li>
                                        <li className={styles.listItem}>
                                            <div className={styles.bullet}></div>
                                            <span className={styles.listText}>Historic canal ring (UNESCO World Heritage)</span>
                                        </li>
                                        <li className={styles.listItem}>
                                            <div className={styles.bullet}></div>
                                            <span className={styles.listText}>Central Station transportation hub</span>
                                        </li>
                                        <li className={styles.listItem}>
                                            <div className={styles.bullet}></div>
                                            <span className={styles.listText}>Countless museums, cafés, and shops</span>
                                        </li>
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
                    <h3 className={styles.ctaTitle}>Interested in Centrum?</h3>
                    <p className={styles.ctaText}>Let us help you find the perfect home in this neighborhood.</p>
                    <div className={styles.ctaButtons}>
                        <Link to="/en/rent-in" className={styles.primaryButton}>
                            Find a Home Here
                        </Link>
                        <Link to="/en/contact" className={styles.secondaryButton}>
                            Get Expert Advice
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Centrum;
