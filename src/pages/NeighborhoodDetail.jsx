import React, { useState } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { MapPin, ArrowLeft, TrendingUp, Users, House, AlertCircle, TramFront, Footprints, Utensils, Coffee, GraduationCap } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import styles from './NeighborhoodDetail.module.css';
import { neighborhoodsData } from '../data/neighborhoodsData';

import { useSelector } from 'react-redux';

const NeighborhoodDetail = () => {
    const { id } = useParams();
    const currentLang = useSelector((state) => state.ui.language);
    const [activeTab, setActiveTab] = useState('overview');
    const [priceType, setPriceType] = useState('rent');

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
                        {activeTab === 'market' && neighborhood.marketData && (
                            <div>
                                <h2 className={styles.sectionTitle}>{currentLang === 'nl' ? `Marktindicatoren voor ${neighborhood.title}` : `Market Indicators for ${neighborhood.title}`}</h2>
                                <div className={styles.marketGrid}>
                                    {neighborhood.marketData.indicators.map((indicator, index) => (
                                        <div key={index} className={`${styles.indicatorCard} ${indicator.color === 'yellow' ? styles.indicatorYellow :
                                            indicator.color === 'green' ? styles.indicatorGreen :
                                                styles.indicatorRed
                                            }`}>
                                            <div className={styles.indicatorHeader}>
                                                {index === 0 || index === 1 ? <TrendingUp className={styles.textYellow} size={20} /> :
                                                    index === 2 ? <Users className={styles.textGreen} size={20} /> :
                                                        <House className={styles.textRed} size={20} />}
                                                <span className={`${styles.indicatorValue} ${indicator.color === 'yellow' ? styles.textYellow :
                                                    indicator.color === 'green' ? styles.textGreen :
                                                        styles.textRed
                                                    }`}>{indicator.value}</span>
                                            </div>
                                            <div className={styles.indicatorLabel}>{indicator.label}</div>
                                            <div className={styles.indicatorSubtext}>{indicator.subtext}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className={styles.chartSection}>
                                    <div className={styles.chartCard}>
                                        <div className={styles.chartHeader}>
                                            <h3 className={styles.chartTitle}>
                                                {priceType === 'rent'
                                                    ? (currentLang === 'nl' ? `Huurprijzen per Woningtype in ${neighborhood.title}` : `Rental Prices by Property Type in ${neighborhood.title}`)
                                                    : (currentLang === 'nl' ? `Koopprijzen per Woningtype in ${neighborhood.title}` : `Purchase Prices by Property Type in ${neighborhood.title}`)
                                                }
                                            </h3>
                                            <div className={styles.chartToggle}>
                                                <button
                                                    className={`${styles.toggleButton} ${priceType === 'rent' ? styles.toggleButtonActive : ''}`}
                                                    onClick={() => setPriceType('rent')}
                                                >
                                                    {currentLang === 'nl' ? 'Huur' : 'Rent'}
                                                </button>
                                                <button
                                                    className={`${styles.toggleButton} ${priceType === 'buy' ? styles.toggleButtonActiveGreen : ''}`}
                                                    onClick={() => setPriceType('buy')}
                                                >
                                                    {currentLang === 'nl' ? 'Koop' : 'Buy'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className={styles.chartContainer}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={priceType === 'rent' ? neighborhood.marketData.rentalPrices : neighborhood.marketData.purchasePrices}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} interval={0} angle={-45} textAnchor="end" height={60} />
                                                    <YAxis
                                                        axisLine={false}
                                                        tickLine={false}
                                                        tick={{ fontSize: 12, fill: '#6B7280' }}
                                                        ticks={priceType === 'rent' ? [0, 1500, 3000, 4500, 6000] : [0, 300000, 600000, 900000, 1200000]}
                                                        tickFormatter={(value) => `€${(value / 1000).toFixed(priceType === 'rent' ? 1 : 0)}k`}
                                                        domain={priceType === 'rent' ? [0, 6000] : [0, 1200000]}
                                                    />
                                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                    <Bar dataKey="price" fill={priceType === 'rent' ? "#F97316" : "#0F766E"} radius={[4, 4, 0, 0]} barSize={40} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className={styles.chartCard}>
                                        <h3 className={styles.chartTitle}>{currentLang === 'nl' ? `Prijsontwikkeling in ${neighborhood.title} (2020-2024)` : `Price Development in ${neighborhood.title} (2020-2024)`}</h3>
                                        <div className={styles.chartContainer}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={neighborhood.marketData.priceTrend}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                    <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} ticks={[0, 200000, 400000, 600000, 800000]} tickFormatter={(value) => `€${value / 1000}k`} domain={[0, 800000]} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                                    <Legend />
                                                    <Line type="monotone" dataKey="rent" name={currentLang === 'nl' ? "Gemiddelde Huur (€)" : "Average Rent (€)"} stroke="#F97316" strokeWidth={3} dot={{ r: 4, fill: '#F97316', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                                    <Line type="monotone" dataKey="buy" name={currentLang === 'nl' ? "Gemiddelde Koopprijs (€)" : "Average Purchase Price (€)"} stroke="#0F766E" strokeWidth={3} dot={{ r: 4, fill: '#0F766E', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.demographicsSection}>
                                    <h2 className={styles.sectionTitle}>{currentLang === 'nl' ? 'Demografische Gegevens' : 'Demographics'}</h2>
                                    <div className={styles.demographicsGrid}>
                                        {neighborhood.marketData.demographics.map((stat, index) => (
                                            <div key={index} className={styles.statCard}>
                                                <div className={styles.statValue}>{stat.value}</div>
                                                <div className={styles.statLabel}>{stat.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                        {activeTab === 'livability' && neighborhood.livability && (
                            <div className={styles.spaceY8}>
                                <div>
                                    <h3 className={styles.sectionTitle}>{currentLang === 'nl' ? 'Leefbaarheidsscores' : 'Livability Scores'}</h3>
                                    <div className={styles.livabilityGrid}>
                                        {neighborhood.livability.scores.map((score, index) => (
                                            <div key={index} className={styles.scoreCard}>
                                                <div className={styles.cardHeader}>
                                                    {score.type === 'transport' ? <TramFront className={styles.cardIcon} /> : <Footprints className={styles.cardIcon} />}
                                                    <span className={styles.cardLabel}>{score.label}</span>
                                                </div>
                                                <div className={styles.scoreContainer}>
                                                    <div className={styles.progressBar}>
                                                        <div className={styles.progressFill} style={{ width: '100%' }}></div>
                                                    </div>
                                                    <span className={styles.scoreValue}>{score.value}</span>
                                                </div>
                                            </div>
                                        ))}
                                        {neighborhood.livability.amenities.map((amenity, index) => (
                                            <div key={index} className={styles.amenityCard}>
                                                <div className={styles.cardHeader}>
                                                    {amenity.type === 'restaurants' ? <Utensils className={styles.cardIcon} /> :
                                                        amenity.type === 'cafes' ? <Coffee className={styles.cardIcon} /> :
                                                            <GraduationCap className={styles.cardIcon} />}
                                                    <span className={styles.cardLabel}>{amenity.label}</span>
                                                </div>
                                                <div className={styles.amenityCount}>{amenity.count}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.specialSection}>
                                    <h4 className={styles.specialTitle}>{currentLang === 'nl' ? `Wat maakt ${neighborhood.title} bijzonder?` : `What makes ${neighborhood.title} special?`}</h4>
                                    <p className={styles.paragraph}>
                                        {neighborhood.atmosphere}
                                    </p>
                                </div>
                            </div>
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
            </div >
        </div >
    );
};

export default NeighborhoodDetail;
