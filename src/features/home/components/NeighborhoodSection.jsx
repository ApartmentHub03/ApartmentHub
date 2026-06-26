'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { TrendingUp, ChevronRight, Calculator } from 'lucide-react';
import styles from './NeighborhoodSection.module.css';
import { NEIGHBORHOOD_PRICES, DEFAULT_PRICE, formatEUR } from '../../../lib/valuation';
import { translations } from '../../../data/translations';

const REMOTE_IMAGES = {
    binnenstad: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/View_of_Oudegracht_from_Vollersbrug%2C_Utrecht_2024-11-28.jpg/1280px-View_of_Oudegracht_from_Vollersbrug%2C_Utrecht_2024-11-28.jpg',
    wittevrouwen: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Kapelstraat_Utrecht_Nederland.JPG/1280px-Kapelstraat_Utrecht_Nederland.JPG',
    lombok: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Utrecht-Lombok_-_Kanaalstraat.jpg/1280px-Utrecht-Lombok_-_Kanaalstraat.jpg',
    'oog-in-al': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Oude-Rijn-Oog-in-Al.JPG/1280px-Oude-Rijn-Oog-in-Al.JPG',
    voordorp: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Voordorp.JPG/1280px-Voordorp.JPG',
    'leidsche-rijn': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Centrum_Leidsche_Rijn%2C_Utrecht_%2850004554237%29.jpg/1280px-Centrum_Leidsche_Rijn%2C_Utrecht_%2850004554237%29.jpg',
    tuinwijk: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Tuinwijk-Oost%2C_Utrecht%2C_Netherlands_-_panoramio_%285%29.jpg/1280px-Tuinwijk-Oost%2C_Utrecht%2C_Netherlands_-_panoramio_%285%29.jpg',
    wilhelminapark: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fe/Utrecht_TeaHouse_Wilhelminapark_018_2444.jpg/1280px-Utrecht_TeaHouse_Wilhelminapark_018_2444.jpg',
};

const AMSTERDAM_IMAGES = {
    centrum: '/images/centrum-neighborhood-8xGBhlo4.jpg',
    jordaan: '/images/jordaan-neighborhood-D10TAM1c.jpg',
    'de-pijp': '/images/de-pijp-neighborhood-CerLEEUD.jpg',
    oost: '/images/oost-neighborhood-D0P6YpX3.jpg',
    noord: '/images/noord-neighborhood-C3afdJ-w.jpg',
    'oud-zuid': '/images/oud-zuid-neighborhood-B-g-rFNe.jpg',
    zuidas: '/images/zuidas-neighborhood-BS6cve9Y.jpg',
    zeeburg: '/images/zeeburg-neighborhood-BtRlc8ql.jpg',
    'nieuw-west': '/images/nieuw-west-neighborhood-DhzrAv7H.jpg',
};

const YOY_TREND = { amsterdam: '+4,7%', utrecht: '+5,0%' };

const MOBILE_VISIBLE = 3;

const NeighborhoodSection = ({ title, variant = 'verkoop', layout = 'grid', showCta = true }) => {
    const currentLang = useSelector((state) => state.ui.language);
    const city = useSelector((state) => state.ui.city);
    const isNl = currentLang === 'nl';
    const [showAll, setShowAll] = useState(false);
    const carouselRef = useRef(null);
    const autoScrollRef = useRef(null);

    useEffect(() => {
        return () => {
            if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        };
    }, []);

    const t = translations.neighborhoodNames[currentLang] || translations.neighborhoodNames.en;

    const prices = NEIGHBORHOOD_PRICES[city] || {};
    const defaultPrice = DEFAULT_PRICE[city] || 7500;
    const trend = YOY_TREND[city] || '+4,7%';
    const cityLabel = city === 'utrecht' ? 'Utrecht' : 'Amsterdam';

    const getPriceKey = (name) => {
        if (city === 'amsterdam' && name === 'Nieuw West') return 'West';
        return name;
    };

    const getImg = (id) => {
        if (city === 'amsterdam') return AMSTERDAM_IMAGES[id] || '';
        return REMOTE_IMAGES[id] || '';
    };

    const amsterdamNeighborhoods = [
        { id: 'centrum', name: t.centrum.name, description: t.centrum.description, linkable: true },
        { id: 'jordaan', name: t.jordaan.name, description: t.jordaan.description, linkable: true },
        { id: 'de-pijp', name: t.dePijp.name, description: t.dePijp.description, linkable: true },
        { id: 'oost', name: t.oost.name, description: t.oost.description, linkable: true },
        { id: 'noord', name: t.noord.name, description: t.noord.description, linkable: true },
        { id: 'oud-zuid', name: t.oudZuid.name, description: t.oudZuid.description, linkable: true },
        { id: 'zuidas', name: t.zuidas.name, description: t.zuidas.description, linkable: true },
        { id: 'zeeburg', name: t.zeeburg.name, description: t.zeeburg.description, linkable: true },
        { id: 'nieuw-west', name: t.nieuwWest.name, description: t.nieuwWest.description, linkable: true },
    ];

    const utrechtNeighborhoods = [
        { id: 'binnenstad', name: t.binnenstad.name, description: t.binnenstad.description, linkable: false },
        { id: 'wittevrouwen', name: t.wittevrouwen.name, description: t.wittevrouwen.description, linkable: false },
        { id: 'lombok', name: t.lombok.name, description: t.lombok.description, linkable: false },
        { id: 'oog-in-al', name: t['oog-in-al'].name, description: t['oog-in-al'].description, linkable: false },
        { id: 'voordorp', name: t.voordorp.name, description: t.voordorp.description, linkable: false },
        { id: 'leidsche-rijn', name: t['leidsche-rijn'].name, description: t['leidsche-rijn'].description, linkable: false },
        { id: 'tuinwijk', name: t.tuinwijk.name, description: t.tuinwijk.description, linkable: false },
        { id: 'wilhelminapark', name: t.wilhelminapark.name, description: t.wilhelminapark.description, linkable: false },
    ];

    const neighborhoods = city === 'utrecht' ? utrechtNeighborhoods : amsterdamNeighborhoods;

    const sorted = neighborhoods
        .map((n) => ({
            ...n,
            img: getImg(n.id),
            pricePerM2: prices[getPriceKey(n.name)] || defaultPrice,
        }))
        .sort((a, b) => b.pricePerM2 - a.pricePerM2);

    const ctaLink = variant === 'verkoop'
        ? (isNl ? '/waardebepaling' : '/en/valuation')
        : (isNl ? '/nl/koop/koopkracht' : '/en/buy/buying-power');

    const ctaTitle = variant === 'verkoop'
        ? (isNl ? 'Bereken je verkoopwaarde' : 'Calculate your sale value')
        : (isNl ? 'Bereken je koopkracht' : 'Calculate your buying power');

    const ctaSubtitle = variant === 'verkoop'
        ? (isNl ? 'Ontdek in 2 minuten wat je woning waard is' : 'Discover what your home is worth in 2 minutes')
        : (isNl ? 'Bereken je maximale hypotheek en koopprijs' : 'Calculate your maximum mortgage and purchase price');

    const sectionTitle = title || t.discoverTitle;
    const viewLabel = isNl ? 'Bekijk wijk' : 'View neighborhood';
    const avgPerM2Label = isNl ? 'Gem. EUR' : 'Avg. EUR';
    const perM2Suffix = '/m²';
    const perHomeLabel = isNl ? 'Gem. woning ca. EUR' : 'Avg. home approx. EUR';
    const showMoreLabel = isNl ? `${sorted.length - MOBILE_VISIBLE} wijken meer tonen` : `Show ${sorted.length - MOBILE_VISIBLE} more neighborhoods`;
    const showLessLabel = isNl ? 'Toon minder' : 'Show less';

    const startAutoScroll = (direction) => {
        if (autoScrollRef.current) clearInterval(autoScrollRef.current);
        autoScrollRef.current = setInterval(() => {
            if (carouselRef.current) {
                const scrollAmount = direction === 'right' ? 2 : -2;
                carouselRef.current.scrollLeft += scrollAmount;
                const maxScroll = carouselRef.current.scrollWidth / 2;
                if (carouselRef.current.scrollLeft >= maxScroll) {
                    carouselRef.current.scrollLeft = 0;
                } else if (carouselRef.current.scrollLeft <= 0 && direction === 'left') {
                    carouselRef.current.scrollLeft = maxScroll;
                }
            }
        }, 16);
    };

    const stopAutoScroll = () => {
        if (autoScrollRef.current) {
            clearInterval(autoScrollRef.current);
            autoScrollRef.current = null;
        }
    };

    const renderCard = (n, idx) => {
        const cardContent = (
            <>
                <div className={styles.cardImageWrap}>
                    {n.img ? (
                        <img src={n.img} alt={`${n.name} ${cityLabel}`} className={styles.cardImage} loading="lazy" />
                    ) : (
                        <div className={styles.cardImageGradient} />
                    )}
                    <div className={styles.cardImageOverlay} />
                    <span className={styles.cardNumber}>{String(idx + 1).padStart(2, '0')}</span>
                    <span className={styles.cardTrend}>
                        <TrendingUp size={12} /> {trend}
                    </span>
                </div>
                <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{n.name}</h3>
                    <p className={styles.cardDesc}>{n.description}</p>
                    <div className={styles.cardDivider} />
                    <div className={styles.cardPrices}>
                        <span className={styles.cardPriceM2}>{avgPerM2Label} {formatEUR(n.pricePerM2)}{perM2Suffix}</span>
                        <span className={styles.cardPriceHome}>{perHomeLabel} {formatEUR(Math.round(n.pricePerM2 * 85 / 1000) * 1000)}</span>
                    </div>
                    {n.linkable && (
                        <span className={styles.cardLink}>
                            {viewLabel} <ChevronRight size={14} className={styles.cardLinkIcon} />
                        </span>
                    )}
                </div>
            </>
        );

        return n.linkable ? (
            <Link href={`/${currentLang}/neighborhood/${n.id}`} className={styles.card}>
                {cardContent}
            </Link>
        ) : (
            <div className={styles.card}>{cardContent}</div>
        );
    };

    const renderGrid = () => (
        <div className={styles.grid}>
            {sorted.map((n, idx) => (
                <div
                    key={n.id}
                    className={`${styles.cardWrapper} ${idx >= MOBILE_VISIBLE && !showAll ? styles.cardHiddenMobile : ''}`}
                >
                    {renderCard(n, idx)}
                </div>
            ))}
        </div>
    );

    const renderCarousel = () => {
        const duplicated = [...sorted, ...sorted];
        return (
            <div className={styles.carouselSection}>
                <div
                    className={styles.carouselTrack}
                    ref={carouselRef}
                    style={{ scrollBehavior: 'auto' }}
                    onMouseEnter={() => startAutoScroll('right')}
                    onMouseLeave={stopAutoScroll}
                    data-scroll-container
                >
                    {duplicated.map((n, idx) => (
                        <div key={`${n.id}-${idx}`} className={styles.carouselCard}>
                            {renderCard(n, idx)}
                        </div>
                    ))}
                </div>
                <div
                    className={styles.carouselScrollLeft}
                    onMouseEnter={() => startAutoScroll('left')}
                    onMouseLeave={stopAutoScroll}
                />
                <div
                    className={styles.carouselScrollRight}
                    onMouseEnter={() => startAutoScroll('right')}
                    onMouseLeave={stopAutoScroll}
                />
            </div>
        );
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.title}>{sectionTitle}</h2>

                {layout === 'carousel' ? renderCarousel() : renderGrid()}

                {sorted.length > MOBILE_VISIBLE && layout === 'grid' && (
                    <div className={styles.showMoreWrap}>
                        <button
                            type="button"
                            onClick={() => setShowAll((v) => !v)}
                            className={styles.showMoreBtn}
                        >
                            {showAll ? showLessLabel : showMoreLabel}
                            <ChevronRight size={14} className={`${styles.showMoreIcon} ${showAll ? styles.showMoreIconUp : ''}`} />
                        </button>
                    </div>
                )}

                {showCta && (
                    <div className={styles.ctaBanner}>
                        <div className={styles.ctaBannerInner}>
                            <div className={styles.ctaIconCircle}>
                                <Calculator size={28} />
                            </div>
                            <h3 className={styles.ctaTitle}>{ctaTitle}</h3>
                            <p className={styles.ctaSubtitle}>{ctaSubtitle}</p>
                            <Link href={ctaLink} className={styles.ctaButton}>
                                {ctaTitle}
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

export default NeighborhoodSection;