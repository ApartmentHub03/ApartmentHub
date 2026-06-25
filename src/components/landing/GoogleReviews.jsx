'use client';

import { useSelector } from 'react-redux';
import { Star } from 'lucide-react';
import GoogleG from './GoogleG';
import useGoogleReviews from '@/hooks/useGoogleReviews';
import styles from './GoogleReviews.module.css';

const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/search/ApartmentHub+Amsterdam';

const REVIEW_TEXTS = {
    en: {
        heading: 'What clients say about us',
        reviewCount: '{count} reviews · rated on Google',
        ctaButton: 'Read all our reviews on Google',
    },
    nl: {
        heading: 'Wat klanten over ons zeggen',
        reviewCount: '{count} reviews · beoordeeld op Google',
        ctaButton: 'Lees al onze reviews op Google',
    },
};

const ReviewCard = ({ r, text }) => (
    <div className={styles.card}>
        <div className={styles.cardInner}>
            <div className={styles.cardHeader}>
                <div className={styles.stars} aria-hidden>
                    {Array.from({ length: r.rating || 5 }).map((_, i) => (
                        <Star key={i} size={16} className={styles.starIcon} />
                    ))}
                </div>
                <GoogleG size={20} />
            </div>
            <p className={styles.cardText}>&ldquo;{text}&rdquo;</p>
            <div className={styles.cardAuthor}>
                <img src={r.photo || r.photoUrl} alt={r.name || r.authorName} loading="lazy" className={styles.cardPhoto} />
                <div>
                    <p className={styles.cardName}>{r.name || r.authorName}</p>
                    <p className={styles.cardLocation}>{r.location || ''}</p>
                </div>
            </div>
        </div>
    </div>
);

const GoogleReviews = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const isNl = currentLang === 'nl';
    const texts = isNl ? REVIEW_TEXTS.nl : REVIEW_TEXTS.en;
    const { rating, reviewCount, reviews } = useGoogleReviews(currentLang);

    const ratingDisplay = rating.toFixed(1);

    const track = [...reviews, ...reviews];

    return (
        <section className={styles.section}>
            <div className={styles.headerContainer}>
                <div className={styles.headerContent}>
                    <div className={styles.badgeRow}>
                        <GoogleG size={28} />
                        <span className={styles.ratingScore}>{ratingDisplay}</span>
                        <span className={styles.starsRow}>
                            {[0, 1, 2, 3, 4].map((i) => (
                                <Star key={i} size={20} className={styles.starIcon} />
                            ))}
                        </span>
                    </div>
                    <h2 className={styles.heading}>{texts.heading}</h2>
                    <p className={styles.reviewCount}>{texts.reviewCount.replace('{count}', reviewCount)}</p>
                </div>
            </div>

            <div className={styles.marqueeWrapper}>
                <div className={styles.marqueeTrack}>
                    {track.map((r, i) => (
                        <div key={`${r.id || r.authorName}-${i}`} aria-hidden={i >= reviews.length}>
                            <ReviewCard r={r} text={r.text} />
                        </div>
                    ))}
                </div>
            </div>

            <div className={styles.ctaContainer}>
                <a
                    href={GOOGLE_REVIEWS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.ctaButton}
                >
                    <GoogleG size={20} />
                    {texts.ctaButton}
                </a>
            </div>
        </section>
    );
};

export default GoogleReviews;