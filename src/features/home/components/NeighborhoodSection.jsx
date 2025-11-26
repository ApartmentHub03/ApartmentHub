import React, { useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ArrowRight } from 'lucide-react';
import styles from './NeighborhoodSection.module.css';
import { translations } from '../../../data/translations';

// Import images
import centrumImg from '../../../assets/centrum-neighborhood-8xGBhlo4.jpg';
import jordaanImg from '../../../assets/jordaan-neighborhood-D10TAM1c.jpg';
import dePijpImg from '../../../assets/de-pijp-neighborhood-CerLEEUD.jpg';
import oostImg from '../../../assets/oost-neighborhood-D0P6YpX3.jpg';
import noordImg from '../../../assets/noord-neighborhood-C3afdJ-w.jpg';
import oudZuidImg from '../../../assets/oud-zuid-neighborhood-B-g-rFNe.jpg';
import zuidasImg from '../../../assets/zuidas-neighborhood-BS6cve9Y.jpg';
import zeeburgImg from '../../../assets/zeeburg-neighborhood-BtRlc8ql.jpg';
import nieuwWestImg from '../../../assets/nieuw-west-neighborhood-DhzrAv7H.jpg';

const NeighborhoodSection = () => {
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
            img: centrumImg
        },
        {
            id: '02',
            name: 'Jordaan',
            desc: t.descJordaan,
            link: `/${currentLang}/neighborhood/jordaan`,
            img: jordaanImg
        },
        {
            id: '03',
            name: 'De Pijp',
            desc: t.descDePijp,
            link: `/${currentLang}/neighborhood/de-pijp`,
            img: dePijpImg
        },
        {
            id: '04',
            name: 'Oost',
            desc: t.descOost,
            link: `/${currentLang}/neighborhood/oost`,
            img: oostImg
        },
        {
            id: '05',
            name: 'Noord',
            desc: t.descNoord,
            link: `/${currentLang}/neighborhood/noord`,
            img: noordImg
        },
        {
            id: '06',
            name: 'Oud-Zuid',
            desc: t.descOudZuid,
            link: `/${currentLang}/neighborhood/oud-zuid`,
            img: oudZuidImg
        },
        {
            id: '07',
            name: 'Zuidas',
            desc: t.descZuidas,
            link: `/${currentLang}/neighborhood/zuidas`,
            img: zuidasImg
        },
        {
            id: '08',
            name: 'Zeeburg',
            desc: t.descZeeburg,
            link: `/${currentLang}/neighborhood/zeeburg`,
            img: zeeburgImg
        },
        {
            id: '09',
            name: 'Nieuw-West',
            desc: t.descNieuwWest,
            link: `/${currentLang}/neighborhood/nieuw-west`,
            img: nieuwWestImg
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
                    <h2 className={styles.title}>{t.neighborhoodsTitle}</h2>
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
                                <Link to={item.link} className={styles.card}>
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
                                <Link to={item.link} className={styles.card}>
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
