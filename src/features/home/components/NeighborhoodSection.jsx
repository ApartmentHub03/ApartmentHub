'use client';

import React, { useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import styles from './NeighborhoodSection.module.css';
import { translations } from '../../../data/translations';

const NeighborhoodSection = ({ title }) => {
    const scrollWrapperRef = useRef(null);
    const scrollContentRef = useRef(null);
    const animationFrameId = useRef(null);
    const scrollSpeed = useRef(0);

    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;

    const neighborhoods = [
        {
            id: '01',
            name: 'Centrum',
            desc: t.descCentrum,
            link: `/${currentLang}/neighborhood/centrum`,
            img: '/images/centrum-neighborhood-8xGBhlo4.jpg'
        },
        {
            id: '02',
            name: 'Jordaan',
            desc: t.descJordaan,
            link: `/${currentLang}/neighborhood/jordaan`,
            img: '/images/jordaan-neighborhood-D10TAM1c.jpg'
        },
        {
            id: '03',
            name: 'De Pijp',
            desc: t.descDePijp,
            link: `/${currentLang}/neighborhood/de-pijp`,
            img: '/images/de-pijp-neighborhood-CerLEEUD.jpg'
        },
        {
            id: '04',
            name: 'Oost',
            desc: t.descOost,
            link: `/${currentLang}/neighborhood/oost`,
            img: '/images/oost-neighborhood-D0P6YpX3.jpg'
        },
        {
            id: '05',
            name: 'Noord',
            desc: t.descNoord,
            link: `/${currentLang}/neighborhood/noord`,
            img: '/images/noord-neighborhood-C3afdJ-w.jpg'
        },
        {
            id: '06',
            name: 'Oud-Zuid',
            desc: t.descOudZuid,
            link: `/${currentLang}/neighborhood/oud-zuid`,
            img: '/images/oud-zuid-neighborhood-B-g-rFNe.jpg'
        },
        {
            id: '07',
            name: 'Zuidas',
            desc: t.descZuidas,
            link: `/${currentLang}/neighborhood/zuidas`,
            img: '/images/zuidas-neighborhood-BS6cve9Y.jpg'
        },
        {
            id: '08',
            name: 'Zeeburg',
            desc: t.descZeeburg,
            link: `/${currentLang}/neighborhood/zeeburg`,
            img: '/images/zeeburg-neighborhood-BtRlc8ql.jpg'
        },
        {
            id: '09',
            name: 'Nieuw-West',
            desc: t.descNieuwWest,
            link: `/${currentLang}/neighborhood/nieuw-west`,
            img: '/images/nieuw-west-neighborhood-DhzrAv7H.jpg'
        }
    ];

    const handleMouseMove = (e) => {
        if (!scrollWrapperRef.current) return;

        const rect = scrollWrapperRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;

        // Hover zones: Left 20% and Right 20%
        const zoneWidth = width * 0.2;

        if (x < zoneWidth) {
            // Scroll Left - Speed increases closer to edge
            const intensity = 1 - (x / zoneWidth);
            scrollSpeed.current = -5 * intensity; // Max speed 5
        } else if (x > width - zoneWidth) {
            // Scroll Right
            const intensity = (x - (width - zoneWidth)) / zoneWidth;
            scrollSpeed.current = 5 * intensity;
        } else {
            scrollSpeed.current = 0;
        }
    };

    const handleMouseLeave = () => {
        scrollSpeed.current = 0;
    };

    useEffect(() => {
        const scrollLoop = () => {
            if (scrollWrapperRef.current && scrollContentRef.current && scrollSpeed.current !== 0) {
                scrollWrapperRef.current.scrollLeft += scrollSpeed.current;

                // Infinite Scroll Logic
                const maxScroll = scrollContentRef.current.scrollWidth / 2; // Half because duplicated

                if (scrollWrapperRef.current.scrollLeft >= maxScroll) {
                    scrollWrapperRef.current.scrollLeft -= maxScroll;
                } else if (scrollWrapperRef.current.scrollLeft <= 0) {
                    scrollWrapperRef.current.scrollLeft += maxScroll;
                }
            }
            animationFrameId.current = requestAnimationFrame(scrollLoop);
        };

        animationFrameId.current = requestAnimationFrame(scrollLoop);

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, []);

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>{title || t.neighborhoodsTitle}</h2>
                </div>
                <div
                    className={styles.scrollWrapper}
                    ref={scrollWrapperRef}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className={styles.scrollContainer} ref={scrollContentRef}>
                        {/* First set of items */}
                        {neighborhoods.map((item) => (
                            <div key={`set1-${item.id}`} className={styles.cardWrapper}>
                                <Link href={item.link} className={styles.card}>
                                    <div className={styles.cardInner}>
                                        <div className={styles.imageContainer}>
                                            <div className={styles.imageWrapper}>
                                                <img
                                                    src={item.img}
                                                    alt={`${item.name} Amsterdam neighborhood`}
                                                    className={styles.image}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.content}>
                                            <div>
                                                <div className={styles.number}>{item.id}.</div>
                                                <h3 className={styles.cardTitle}>{item.name}</h3>
                                                <p className={styles.cardDesc}>{item.desc}</p>
                                            </div>
                                            <div className={styles.action}>
                                                <span className={styles.actionText}>
                                                    {t.neighborhoodsAction}
                                                    <ArrowRight className={styles.actionIcon} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                        {/* Duplicate set for infinite scroll */}
                        {neighborhoods.map((item) => (
                            <div key={`set2-${item.id}`} className={styles.cardWrapper}>
                                <Link href={item.link} className={styles.card}>
                                    <div className={styles.cardInner}>
                                        <div className={styles.imageContainer}>
                                            <div className={styles.imageWrapper}>
                                                <img
                                                    src={item.img}
                                                    alt={`${item.name} Amsterdam neighborhood`}
                                                    className={styles.image}
                                                />
                                            </div>
                                        </div>
                                        <div className={styles.content}>
                                            <div>
                                                <div className={styles.number}>{item.id}.</div>
                                                <h3 className={styles.cardTitle}>{item.name}</h3>
                                                <p className={styles.cardDesc}>{item.desc}</p>
                                            </div>
                                            <div className={styles.action}>
                                                <span className={styles.actionText}>
                                                    {t.neighborhoodsAction}
                                                    <ArrowRight className={styles.actionIcon} />
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                    <div className={styles.gradientLeft}></div>
                    <div className={styles.gradientRight}></div>
                </div>

            </div>
        </section>
    );
};

export default NeighborhoodSection;
