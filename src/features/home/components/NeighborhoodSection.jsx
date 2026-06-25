'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { TrendingUp, ChevronRight, Calculator } from 'lucide-react';
import styles from './NeighborhoodSection.module.css';
import { NEIGHBORHOOD_PRICES, formatEUR } from '../../../lib/valuation';

const YOY_TREND = { amsterdam: '+4,7%', utrecht: '+5,0%' };

const NEIGHBORHOOD_META = {
    amsterdam: [
        { slug: 'oud-zuid', key: 'Oud Zuid', img: '/images/oud-zuid-neighborhood-B-g-rFNe.jpg' },
        { slug: 'zuidas', key: 'Zuidas', img: '/images/zuidas-neighborhood-BS6cve9Y.jpg' },
        { slug: 'centrum', key: 'Centrum', img: '/images/centrum-neighborhood-8xGBhlo4.jpg' },
        { slug: 'jordaan', key: 'Jordaan', img: '/images/jordaan-neighborhood-D10TAM1c.jpg' },
        { slug: 'de-pijp', key: 'De Pijp', img: '/images/de-pijp-neighborhood-CerLEEUD.jpg' },
        { slug: 'oost', key: 'Oost', img: '/images/oost-neighborhood-D0P6YpX3.jpg' },
        { slug: 'noord', key: 'Noord', img: '/images/noord-neighborhood-C3afdJ-w.jpg' },
        { slug: 'west', key: 'West', img: '/images/nieuw-west-neighborhood-DhzrAv7H.jpg' },
    ],
    utrecht: [
        { slug: 'wilhelminapark', key: 'Wilhelminapark', img: '' },
        { slug: 'wittevrouwen', key: 'Wittevrouwen', img: '' },
        { slug: 'binnenstad', key: 'Binnenstad', img: '' },
        { slug: 'lombok', key: 'Lombok', img: '' },
        { slug: 'oog-in-al', key: 'Oog in Al', img: '' },
        { slug: 'tuinwijk', key: 'Tuinwijk', img: '' },
        { slug: 'voordorp', key: 'Voordorp', img: '' },
        { slug: 'leidsche-rijn', key: 'Leidsche Rijn', img: '' },
    ],
};

const descKeyMapNl = {
    'Oud Zuid': 'Prestigieus met musea en het Vondelpark',
    'Zuidas': 'Modern zakendistrict met internationale uitstraling',
    'Centrum': 'Het historische hart van Amsterdam met iconische grachten en monumenten',
    'Jordaan': 'Charmante wijk met smalle straatjes, authentieke bruine cafés en kunstgalerijen',
    'De Pijp': 'Levendige buurt bekend om de Albert Cuyp Markt en bruisend nachtleven',
    'Oost': 'Multiculturele wijk met parken en opkomende foodscene',
    'Noord': 'Creatieve hub met industriële charme en groene ruimtes',
    'West': 'Divers en groen met moderne voorzieningen',
};

const descKeyMapEn = {
    'Oud Zuid': 'Prestigious with museums and the Vondelpark',
    'Zuidas': 'Modern business district with international flair',
    'Centrum': 'The historic heart of Amsterdam with iconic canals and monuments',
    'Jordaan': 'Charming neighborhood with narrow streets, authentic brown cafes and art galleries',
    'De Pijp': 'Vibrant area known for the Albert Cuyp Market and bustling nightlife',
    'Oost': 'Multicultural neighborhood with parks and emerging food scene',
    'Noord': 'Creative hub with industrial charm and green spaces',
    'West': 'Diverse and green with modern amenities',
};

const MOBILE_VISIBLE = 3;

const NeighborhoodSection = ({ title, variant = 'verkoop' }) => {
    const currentLang = useSelector((state) => state.ui.language);
    const isNl = currentLang === 'nl';
    const [showAll, setShowAll] = useState(false);

    const city = 'amsterdam';
    const prices = NEIGHBORHOOD_PRICES[city] || {};
    const meta = NEIGHBORHOOD_META[city] || [];
    const trend = YOY_TREND[city] || '+4,7%';

    const sorted = meta
        .map((m) => ({
            ...m,
            pricePerM2: prices[m.key] || 7500,
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

    const sectionTitle = title || (isNl ? 'Wijken in Amsterdam' : 'Neighborhoods in Amsterdam');
    const viewLabel = isNl ? 'Bekijk wijk' : 'View neighborhood';
    const avgPerM2Label = isNl ? 'Gem. EUR' : 'Avg. EUR';
    const perM2Suffix = '/m²';
    const perHomeLabel = isNl ? 'Gem. woning ca. EUR' : 'Avg. home approx. EUR';
    const showMoreLabel = isNl ? `${sorted.length - MOBILE_VISIBLE} wijken meer tonen` : `Show ${sorted.length - MOBILE_VISIBLE} more neighborhoods`;
    const showLessLabel = isNl ? 'Toon minder' : 'Show less';

    const getDesc = (key) => {
        const map = isNl ? descKeyMapNl : descKeyMapEn;
        return map[key] || '';
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <h2 className={styles.title}>{sectionTitle}</h2>
                <div className={styles.grid}>
                    {sorted.map((n, idx) => (
                        <div
                            key={n.slug}
                            className={`${styles.cardWrapper} ${idx >= MOBILE_VISIBLE && !showAll ? styles.cardHiddenMobile : ''}`}
                        >
                            <Link href={`/${currentLang}/neighborhood/${n.slug}`} className={styles.card}>
                                <div className={styles.cardImageWrap}>
                                    {n.img ? (
                                        <img src={n.img} alt={`${n.key} Amsterdam`} className={styles.cardImage} loading="lazy" />
                                    ) : (
                                        <div className={styles.cardImageGradient}></div>
                                    )}
                                    <div className={styles.cardImageOverlay}></div>
                                    <span className={styles.cardNumber}>{String(idx + 1).padStart(2, '0')}</span>
                                    <span className={styles.cardTrend}>
                                        <TrendingUp size={12} /> {trend}
                                    </span>
                                </div>
                                <div className={styles.cardBody}>
                                    <h3 className={styles.cardTitle}>{n.key}</h3>
                                    <p className={styles.cardDesc}>{getDesc(n.key)}</p>
                                    <div className={styles.cardDivider}></div>
                                    <div className={styles.cardPrices}>
                                        <span className={styles.cardPriceM2}>{avgPerM2Label} {formatEUR(n.pricePerM2)}{perM2Suffix}</span>
                                        <span className={styles.cardPriceHome}>{perHomeLabel} {formatEUR(Math.round(n.pricePerM2 * 85 / 1000) * 1000)}</span>
                                    </div>
                                    <span className={styles.cardLink}>
                                        {viewLabel} <ChevronRight size={14} className={styles.cardLinkIcon} />
                                    </span>
                                </div>
                            </Link>
                        </div>
                    ))}
                </div>
                {sorted.length > MOBILE_VISIBLE && (
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
            </div>
        </section>
    );
};

export default NeighborhoodSection;