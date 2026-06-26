'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { translations } from '../data/translations';
import ContactSection from '../components/shared/ContactSection';
import styles from './Buy.module.css';
import PricingCallout from '../components/landing/PricingCallout';
import GoogleReviews from '../components/landing/GoogleReviews';
import GoogleG from '../components/landing/GoogleG';
import NeighborhoodSection from '../features/home/components/NeighborhoodSection';
import useGoogleReviews from '../hooks/useGoogleReviews';
import {
    UserCheck, Search, Handshake, FileSignature, Eye, Sparkles,
    Building2, ClipboardList, Star, ChevronDown, Calculator, Wallet, TrendingUp,
} from 'lucide-react';

const steps = [
    { icon: UserCheck, titleEn: '1. Intake conversation', titleNl: '1. Intake gesprek', descEn: 'We discuss your wishes, budget and search area in a personal conversation.', descNl: 'We bespreken je wensen, budget en zoekgebied in een persoonlijk gesprek.', detailEn: 'In a personal conversation, we map out your housing wishes, budget, financing options and search area. We discuss the current market situation and jointly create a realistic and strategic search profile.', detailNl: 'In een persoonlijk gesprek brengen we je woonwensen, budget, financieringsmogelijkheden en zoekgebied helder in kaart. We bespreken de actuele marktsituatie en stellen samen een realistisch en strategisch zoekprofiel op.' },
    { icon: Search, titleEn: '2. Selection & viewings', titleNl: '2. Selectie & bezichtigingen', descEn: 'We select suitable properties, including off-market, and schedule viewings.', descNl: 'Wij selecteren passende woningen, ook off-market, en plannen bezichtigingen.', detailEn: 'We actively select suitable properties via Funda, our own network and off-market channels. You only receive relevant listings and we schedule and guide viewings with an objective checklist.', detailNl: 'We selecteren actief passende woningen via Funda, ons eigen netwerk en off-market kanalen. Je krijgt alleen relevante objecten doorgestuurd en wij plannen en begeleiden de bezichtigingen met een objectieve checklist.' },
    { icon: Handshake, titleEn: '3. Negotiation & offer', titleNl: '3. Onderhandeling & bod', descEn: 'Strategic negotiation to get you the best price and conditions.', descNl: 'Strategische onderhandeling om de beste prijs en voorwaarden voor jou te krijgen.', detailEn: "We jointly determine the bidding strategy based on market data, comparable sales and the seller's situation. We then negotiate on your behalf on price and conditions such as resolutive conditions, delivery date and movable property.", detailNl: 'We bepalen samen de biedstrategie op basis van marktdata, vergelijkbare verkopen en de situatie van de verkoper. Vervolgens onderhandelen wij namens jou op prijs én voorwaarden zoals ontbindende voorwaarden, opleverdatum en roerende zaken.' },
    { icon: FileSignature, titleEn: '4. Transfer at notary', titleNl: '4. Overdracht bij notaris', descEn: 'Guidance through to key handover at the notary.', descNl: 'Begeleiding tot en met de sleuteloverdracht bij de notaris.', detailEn: 'We check the purchase agreement, monitor the resolutive conditions and deadlines, and coordinate with the mortgage advisor and notary. At the key handover, we stand by your side for a smooth completion.', detailNl: 'We controleren de koopovereenkomst, bewaken de ontbindende voorwaarden en termijnen, en coördineren met hypotheekadviseur en notaris. Bij de sleuteloverdracht staan we naast je voor een soepele afronding.' },
];

const usps = [
    { icon: Eye, titleEn: 'Off-market listings', titleNl: 'Off-market aanbod', descEn: 'Access to properties not yet on Funda through our network.', descNl: 'Toegang tot woningen die nog niet op Funda staan via ons netwerk.' },
    { icon: Sparkles, titleEn: 'Personal guidance', titleNl: 'Persoonlijke begeleiding', descEn: 'One fixed point of contact from search to key handover.', descNl: 'Eén vast aanspreekpunt van zoektocht tot sleuteloverdracht.' },
    { icon: Building2, titleEn: 'Free notary choice', titleNl: 'Notariskeuze', descEn: 'Free choice of notary and independent advice.', descNl: 'Vrije keuze van notaris en onafhankelijke advisering.' },
];

const services = [
    { en: 'Inventory of wishes, budget and search area', nl: 'Inventarisatie van wensen, budget en zoekgebied' },
    { en: "Access to our off-market network (NVM colleagues, developers, previous clients)", nl: "Toegang tot ons off-market netwerk (NVM collega's, ontwikkelaars, eerdere klanten)" },
    { en: 'Independent market research per property (land registry, VvE, leasehold)', nl: 'Onafhankelijk marktonderzoek per pand (kadaster, VvE, erfpacht)' },
    { en: 'Viewing guidance with objective checklist', nl: 'Bezichtigingsbegeleiding met objectieve checklist' },
    { en: 'Coordination with mortgage advisor (we have fixed partners)', nl: 'Coördinatie met hypotheekadviseur (wij hebben vaste partners)' },
    { en: 'Structural inspection where sensible', nl: 'Bouwkundige keuring laten uitvoeren waar zinvol' },
    { en: 'Negotiation on your behalf with the selling broker', nl: 'Onderhandeling namens jou met de verkopende makelaar' },
    { en: 'Guidance through to key handover at notary', nl: 'Begeleiding tot en met sleuteloverdracht bij notaris' },
];

const StepCard = ({ step, isNl, expanded, onToggle }) => {
    const Icon = step.icon;
    const title = isNl ? step.titleNl : step.titleEn;
    const desc = isNl ? step.descNl : step.descEn;
    const detail = isNl ? step.detailNl : step.detailEn;

    return (
        <div
            className={`${styles.stepCard} ${expanded ? styles.stepCardExpanded : ''}`}
            onClick={onToggle}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        >
            <div className={styles.stepIconRow}>
                <div className={styles.stepIconCircle}>
                    <Icon size={20} />
                </div>
                <span className={styles.stepTitle}>{title}</span>
            </div>
            <p className={styles.stepDesc}>{desc}</p>
            {expanded && <div className={styles.stepDetail}>{detail}</div>}
            <div className={styles.stepExpandHint}>
                <ChevronDown
                    size={14}
                    style={{
                        display: 'inline-block',
                        verticalAlign: 'middle',
                        transition: 'transform 0.2s',
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                />
                {' '}{expanded ? (isNl ? 'Minder' : 'Less') : (isNl ? 'Lees meer' : 'Read more')}
            </div>
        </div>
    );
};

function ReviewsBadge() {
    const currentLang = useSelector((state) => state.ui.language);
    const isNl = currentLang === 'nl';
    const { rating, reviewCount } = useGoogleReviews(currentLang);
    return (
        <div className={styles.reviewsBadge}>
            <GoogleG size={14} className={styles.reviewsG} />
            <span className={styles.reviewsStars}>
                {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                ))}
            </span>
            <span className={styles.reviewsScore}>{rating}</span>
            <span className={styles.reviewsSource}>
                {isNl
                    ? `op basis van Google-reviews · ${reviewCount} tevreden klanten`
                    : `based on Google reviews · ${reviewCount} happy clients`}
            </span>
        </div>
    );
}

const Buy = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.buy[currentLang] || translations.buy.en;

    const isNl = currentLang === 'nl';
    const leadLink = isNl ? '/nl/koop/lead' : '/en/buy/lead';
    const powerLink = isNl ? '/nl/koop/koopkracht' : '/en/buy/buying-power';
    const [expandedSteps, setExpandedSteps] = useState({});
    const [showAllSteps, setShowAllSteps] = useState(false);

    return (
        <div className={styles.page}>
            {/* Hero */}
            <section className={styles.heroSection}>
                <div className={styles.blob1} aria-hidden="true"></div>
                <div className={styles.blob2} aria-hidden="true"></div>
                <div className={styles.blob3} aria-hidden="true"></div>

                <div className={styles.heroContainer}>
                    <div style={{ textAlign: 'center', maxWidth: '50rem', margin: '0 auto', marginBottom: '2.5rem' }}>
                        <div className={styles.badge}>
                             <GoogleG size={14} className={styles.badgeIcon} />
                            {t.heroBadge || (isNl ? 'Aankoopbegeleiding van A tot Z' : 'Buyer guidance from A to Z')}
                        </div>
                        <h1 className={styles.heroTitle}>
                            {t.heroTitlePrefix || t.heroTitle}{' '}
                            <span className={styles.heroCityGradient}>Amsterdam</span>
                        </h1>
                        <p className={styles.heroIntro}>
                            {t.heroSubtitleNew || t.heroSubtitle}{' '}
                            <span className={styles.heroIntroExtra}>{t.heroSubtitleExtra || ''}</span>
                        </p>
                        <div className={styles.heroBadgeRow}>
                            <ReviewsBadge />
                        </div>
                        <p className={styles.heroTerms}>{t.heroTerms}</p>
                    </div>

                    <div className={styles.heroCards}>
                        {/* Calculator card */}
                        <div className={`${styles.heroCard} ${styles.heroCardFirst}`}>
                            <div className={styles.heroCardGlow} aria-hidden="true"></div>
                            <div className={styles.heroCardInner}>
                                <div className={styles.heroCardHeader}>
                                    <div className={`${styles.heroCardIcon} ${styles.heroCardIconOrange}`}>
                                        <Calculator size={24} />
                                    </div>
                                    <div>
                                        <div className={styles.heroCardTitle}>{t.calculatorCardTitle}</div>
                                        <div className={styles.heroCardMeta}>{t.calculatorCardMeta}</div>
                                    </div>
                                </div>
                                <p className={styles.heroCardDesc}>{t.calculatorCardDesc}</p>
                                <div className={styles.heroCardBullets}>
                                    <div className={styles.heroCardBullet}>
                                        <Wallet size={16} className={styles.heroCardBulletIcon} />
                                        {t.calculatorCardBullet1}
                                    </div>
                                    <div className={styles.heroCardBullet}>
                                        <Building2 size={16} className={styles.heroCardBulletIcon} />
                                        {t.calculatorCardBullet2}
                                    </div>
                                    <div className={styles.heroCardBullet}>
                                        <TrendingUp size={16} className={styles.heroCardBulletIcon} />
                                        {t.calculatorCardBullet3}
                                    </div>
                                </div>
                                <Link href={powerLink} className={`${styles.heroCardCta} ${styles.heroCardCtaOrange}`}>
                                    {t.calculatorCardCta}
                                </Link>
                            </div>
                        </div>

                        {/* Intake card */}
                        <div className={styles.heroCard}>
                            <div className={styles.heroCardInner}>
                                <div className={styles.heroCardHeader}>
                                    <div className={`${styles.heroCardIcon} ${styles.heroCardIconMyrtle}`}>
                                        <ClipboardList size={24} />
                                    </div>
                                    <div>
                                        <div className={styles.heroCardTitle}>{t.intakeCardTitle}</div>
                                        <div className={styles.heroCardMeta}>{t.intakeCardMeta}</div>
                                    </div>
                                </div>
                                <p className={styles.heroCardDesc}>{t.intakeCardDesc}</p>
                                <div className={styles.heroCardBullets}>
                                    <div className={styles.heroCardBullet}>
                                        <Search size={16} className={styles.heroCardBulletIcon} />
                                        {t.intakeCardBullet1}
                                    </div>
                                    <div className={styles.heroCardBullet}>
                                        <Eye size={16} className={styles.heroCardBulletIcon} />
                                        {t.intakeCardBullet2}
                                    </div>
                                    <div className={styles.heroCardBullet}>
                                        <Handshake size={16} className={styles.heroCardBulletIcon} />
                                        {t.intakeCardBullet3}
                                    </div>
                                </div>
                                <Link href={leadLink} className={`${styles.heroCardCta} ${styles.heroCardCtaOutline}`}>
                                    {t.intakeCardCta}
                                </Link>
                            </div>
                        </div>
                    </div>

                    <p className={styles.orientation}>
                        <span>{t.orientationPrefix || (isNl ? 'Liever eerst oriënteren?' : 'Prefer to explore first?')}</span>{' '}
                        <Link href={powerLink} className={styles.orientationLink}>
                            {t.orientationLink || (isNl ? 'Bekijk wat je kunt kopen per wijk' : 'See what you can buy per neighbourhood')}
                        </Link>
                    </p>
                </div>


            </section>

            {/* Pricing callout */}
            <PricingCallout
                headline={isNl
                    ? '1% courtage excl. BTW, geen cure geen pay'
                    : '1% commission excl. VAT, no cure no pay'}
                supportText={isNl
                    ? 'Geen vooraf-kosten. Geen verrassingen. Alleen courtage bij succesvolle transactie, te voldoen bij notariële overdracht.'
                    : 'No upfront costs. No surprises. Commission only on successful transaction, payable at notarial transfer.'}
            />

            {/* How it works */}
            <section className={styles.section}>
                <div className={styles.sectionContainer}>
                    <h2 className={styles.sectionTitleSmall}>{t.howTitle}</h2>
                    <div className={styles.stepsGrid}>
                        {steps.map((step) => (
                            <StepCard
                                key={isNl ? step.titleNl : step.titleEn}
                                step={step}
                                isNl={isNl}
                                expanded={!!expandedSteps[step.titleEn]}
                                onToggle={() =>
                                    setExpandedSteps((prev) => ({
                                        ...prev,
                                        [step.titleEn]: !prev[step.titleEn],
                                    }))
                                }
                            />
                        ))}
                    </div>
                    {steps.length > 3 && (
                        <div className={styles.showStepsWrap}>
                            <button
                                type="button"
                                onClick={() => setShowAllSteps((v) => !v)}
                                className={styles.showStepsBtn}
                            >
                                {showAllSteps
                                    ? (t.showLessSteps || (isNl ? 'Toon minder' : 'Show less'))
                                    : (t.showAllSteps || (isNl ? 'Bekijk alle stappen' : 'View all steps'))}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* USPs */}
            <section className={styles.sectionAlt}>
                <div className={styles.sectionContainer}>
                    <h2 className={styles.sectionTitle}>{t.whyUsTitle || t.whyTitle}</h2>
                    <div className={styles.uspGrid}>
                        {usps.map((usp, i) => {
                            const Icon = usp.icon;
                            const title = isNl ? usp.titleNl : usp.titleEn;
                            const desc = isNl ? usp.descNl : usp.descEn;
                            return (
                                <div key={i} className={`${styles.uspCard} ${i >= 3 ? styles.uspCardHidden : ''}`}>
                                    <div className={styles.uspIconCircle}>
                                        <Icon size={24} />
                                    </div>
                                    <h3 className={styles.uspTitle}>{title}</h3>
                                    <p className={styles.uspDesc}>{desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <NeighborhoodSection title={isNl ? 'Ontdek wijken' : 'Discover Neighborhoods'} variant="koop" />

            {/* What we do for you */}
            <section className={styles.section}>
                <div className={styles.sectionContainerNarrow}>
                    <h2 className={styles.sectionTitleSmall}>{t.servicesTitle || t.whatTitle}</h2>
                    <div className={styles.servicesGrid}>
                        {services.map((s, i) => (
                            <div key={i} className={styles.serviceItem}>
                                <span className={styles.serviceNumber}>{i + 1}</span>
                                <span className={styles.serviceText}>{isNl ? s.nl : s.en}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA teaser card */}
            <section className={styles.sectionAlt}>
                <div className={styles.sectionContainerNarrow}>
                    <div className={styles.ctaCard}>
                        <div className={styles.ctaInner}>
                            <div className={styles.ctaIconCircle}>
                                <ClipboardList size={24} />
                            </div>
                            <div className={styles.ctaContent}>
                                <h3 className={styles.ctaTitle}>{t.teaserTitle || t.ctaTitle}</h3>
                                <p className={styles.ctaDesc}>{t.teaserSubtitle || t.ctaDesc}</p>
                            </div>
                            <Link href={leadLink} className={`${styles.ctaPrimary} ${styles.ctaButtonFull}`}>
                                {t.teaserCta || t.heroCta}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            <GoogleReviews />

            <ContactSection
                service="koop"
                ctaLink={leadLink}
                ctaLabel={t.heroCta}
                title={t.contactTitle}
                description={t.contactDesc}
                isNl={isNl}
            />
        </div>
    );
};

export default Buy;