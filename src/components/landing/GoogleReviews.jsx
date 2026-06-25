'use client';

import { useSelector } from 'react-redux';
import { Star } from 'lucide-react';
import GoogleG from './GoogleG';
import styles from './GoogleReviews.module.css';

const GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/search/ApartmentHub+Amsterdam';

const REVIEWS = [
    { id: 'eva', name: 'Eva Hofman', location: 'Amsterdam', rating: 5, photo: 'https://randomuser.me/api/portraits/women/65.jpg' },
    { id: 'thijs', name: 'Thijs Mulder', location: 'Amsterdam', rating: 5, photo: 'https://randomuser.me/api/portraits/men/34.jpg' },
    { id: 'noor', name: 'Noor Hendriks', location: 'Utrecht', rating: 5, photo: 'https://randomuser.me/api/portraits/women/79.jpg' },
    { id: 'sander', name: 'Sander de Vries', location: 'Amsterdam', rating: 5, photo: 'https://randomuser.me/api/portraits/men/41.jpg' },
    { id: 'lisa', name: 'Lisa Jansen', location: 'Amersfoort', rating: 5, photo: 'https://randomuser.me/api/portraits/women/33.jpg' },
    { id: 'mark', name: 'Mark Bakker', location: 'Amsterdam', rating: 5, photo: 'https://randomuser.me/api/portraits/men/52.jpg' },
    { id: 'famke', name: 'Famke Visser', location: 'Utrecht', rating: 5, photo: 'https://randomuser.me/api/portraits/women/12.jpg' },
    { id: 'tom', name: 'Tom Willemsen', location: 'Amsterdam', rating: 5, photo: 'https://randomuser.me/api/portraits/men/67.jpg' },
    { id: 'anouk', name: 'Anouk Smit', location: 'Amsterdam', rating: 5, photo: 'https://randomuser.me/api/portraits/women/22.jpg' },
    { id: 'daan', name: 'Daan Koster', location: 'Midden Nederland', rating: 5, photo: 'https://randomuser.me/api/portraits/men/75.jpg' },
];

const REVIEW_TEXTS = {
    en: {
        heading: 'What clients say about us',
        reviewCount: '73 reviews · rated on Google',
        ctaButton: 'Read all our reviews on Google',
        eva: 'We had been searching for months with no luck, until we found Kaj. Within two weeks we were viewing a place in Oud Zuid that was not even online yet. Honestly cannot recommend him enough.',
        thijs: 'David sold our home and I would recommend him to anyone. Honest, clear, and he often replied in the evening too. Above asking price and zero hassle.',
        noor: 'As a first time buyer I had no idea where to start. The team took all the time to explain everything and put me at ease. I now live in my first little place in Lombok, so happy.',
        sander: 'During the negotiation Kaj stayed calm while I was already panicking. He knew exactly when to push. Hats off.',
        lisa: 'ApartmentHub knows the Utrecht region inside out. In Amersfoort we felt personally looked after from start to finish. No sales talk, just honest advice.',
        mark: 'The photography and presentation ApartmentHub arranged were excellent. Lots of viewings and ultimately sold above the asking price.',
        famke: 'The team kept us posted on everything via WhatsApp, even the small things. You never feel like just a number. We always got to see new listings first.',
        tom: 'What stuck with me most: at one viewing Lucas actually advised us not to bid, because it was not good enough. That builds trust. The next place was the one.',
        anouk: 'Kaj and Lander together are a real dream team. Fast, honest and always reachable. We did not have to worry for a single moment during the whole process.',
        daan: 'Started out sceptical, but Lucas\'s valuation was accurate to the euro. In the end we sold our apartment with complete peace of mind. Thank you!',
    },
    nl: {
        heading: 'Wat klanten over ons zeggen',
        reviewCount: '73 reviews · beoordeeld op Google',
        ctaButton: 'Lees al onze reviews op Google',
        eva: 'We waren al maanden aan het zoeken zonder succes, tot we bij Kaj terechtkwamen. Binnen twee weken zaten we bij een woning in Oud Zuid die nog niet eens online stond. Echt een aanrader.',
        thijs: 'David heeft onze woning verkocht en ik raad hem iedereen aan. Eerlijk, duidelijk, en hij appte vaak \'s avonds nog even terug. Boven de vraagprijs en zonder gedoe.',
        noor: 'Als starter wist ik niet waar ik moest beginnen. Het team nam echt de tijd om alles uit te leggen en stelde me op mijn gemak. Inmiddels woon ik in mijn eerste huisje in Lombok, superblij.',
        sander: 'Tijdens de onderhandeling bleef Kaj rustig terwijl ik allang in paniek zat. Hij wist precies wanneer hij moest doorzetten. Petje af.',
        lisa: 'ApartmentHub kent Midden Nederland echt door en door. In Amersfoort voelden we ons van begin tot eind persoonlijk geholpen. Geen verkooppraatjes, gewoon eerlijk advies.',
        mark: 'De fotografie en presentatie die ApartmentHub regelde waren top. Veel bezichtigingen en uiteindelijk boven de vraagprijs verkocht.',
        famke: 'Het team hield ons overal van op de hoogte via WhatsApp, ook bij de kleine dingen. Je voelt je nooit een nummer. Nieuw aanbod kregen we steeds als eerste te zien.',
        tom: 'Wat me het meest bijbleef: bij een bezichtiging raadde Lucas ons juist af om te bieden, omdat het niet goed genoeg was. Dat schept vertrouwen. De woning daarna was wel raak.',
        anouk: 'Kaj en Lander samen zijn echt een droomteam. Snel, eerlijk en altijd bereikbaar. We hebben ons het hele traject geen moment zorgen hoeven maken.',
        daan: 'Sceptisch begonnen, maar de waardebepaling van Lucas klopte tot op de euro. Uiteindelijk ons appartement met een gerust hart verkocht. Dank!',
    },
};

const ReviewCard = ({ r, text }) => (
    <div className={styles.card}>
        <div className={styles.cardInner}>
            <div className={styles.cardHeader}>
                <div className={styles.stars} aria-hidden>
                    {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={16} className={styles.starIcon} />
                    ))}
                </div>
                <GoogleG size={20} />
            </div>
            <p className={styles.cardText}>&ldquo;{text}&rdquo;</p>
            <div className={styles.cardAuthor}>
                <img src={r.photo} alt={r.name} loading="lazy" className={styles.cardPhoto} />
                <div>
                    <p className={styles.cardName}>{r.name}</p>
                    <p className={styles.cardLocation}>{r.location}</p>
                </div>
            </div>
        </div>
    </div>
);

const GoogleReviews = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const isNl = currentLang === 'nl';
    const texts = isNl ? REVIEW_TEXTS.nl : REVIEW_TEXTS.en;
    const track = [...REVIEWS, ...REVIEWS];

    return (
        <section className={styles.section}>
            <div className={styles.headerContainer}>
                <div className={styles.headerContent}>
                    <div className={styles.badgeRow}>
                        <GoogleG size={28} />
                        <span className={styles.ratingScore}>4,9</span>
                        <span className={styles.starsRow}>
                            {[0, 1, 2, 3, 4].map((i) => (
                                <Star key={i} size={20} className={styles.starIcon} />
                            ))}
                        </span>
                    </div>
                    <h2 className={styles.heading}>{texts.heading}</h2>
                    <p className={styles.reviewCount}>{texts.reviewCount}</p>
                </div>
            </div>

            <div className={styles.marqueeWrapper}>
                <div className={styles.marqueeTrack}>
                    {track.map((r, i) => (
                        <div key={`${r.id}-${i}`} aria-hidden={i >= REVIEWS.length}>
                            <ReviewCard r={r} text={texts[r.id]} />
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