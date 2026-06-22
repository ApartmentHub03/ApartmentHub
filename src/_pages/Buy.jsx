'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { translations } from '../data/translations';
import useServiceContacts from '../hooks/useServiceContacts';
import ContactSection from '../components/shared/ContactSection';
import styles from './Buy.module.css';
import NeighborhoodSection from '../features/home/components/NeighborhoodSection';
import {
    UserCheck, Search, Handshake, FileSignature, Eye, Sparkles,
    Building2, CheckCircle2, ClipboardList, MessageCircle, Phone, Mail,
    Star, ChevronDown,
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

const Buy = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.buy[currentLang] || translations.buy.en;
    const contacts = useServiceContacts('koop');
    const isNl = currentLang === 'nl';
    const telHref = `tel:${contacts.phone.replace(/\s/g, '')}`;
    const leadLink = isNl ? '/nl/koop/lead' : '/en/buy/lead';
    const powerLink = isNl ? '/nl/koopkracht' : '/en/buying-power';
    const [expandedSteps, setExpandedSteps] = useState({});

    return (
        <div className={styles.page}>
            <section className={styles.heroSection}>
                <div className={styles.heroContainer}>
                    <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
                    <p className={styles.heroSubtitle}>{t.heroSubtitle}</p>

                    <div className={styles.heroBadgeRow}>
                        <div className={styles.reviewsBadge}>
                            <span className={styles.reviewsG}>G</span>
                            <span className={styles.reviewsStars}>
                                {[...Array(5)].map((_, i) => (
                                    <Star key={i} size={14} fill="currentColor" />
                                ))}
                            </span>
                            <span className={styles.reviewsScore}>4.9</span>
                            <span className={styles.reviewsSource}>
                                {isNl
                                    ? 'op basis van Google-reviews · 60+ tevreden klanten'
                                    : 'based on Google reviews · 60+ happy clients'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.heroActions}>
                        <Link href={leadLink} className={styles.ctaPrimary}>{t.heroCta}</Link>
                        <Link href={powerLink} className={styles.ctaOutline}>{t.heroCta2}</Link>
                    </div>

                    <div className={styles.heroContactRow}>
                        <a href={telHref} className={styles.contactPill}>
                            <Phone size={16} /> {contacts.phone}
                        </a>
                        <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer" className={styles.contactPill}>
                            <MessageCircle size={16} /> {isNl ? 'Chat directly' : 'Chat directly'}
                        </a>
                        <a href={`mailto:${contacts.email}`} className={styles.contactPill}>
                            <Mail size={16} /> {contacts.email}
                        </a>
                    </div>
                </div>
            </section>

            <section className={styles.pricingSection}>
                <div className={styles.pricingCard}>
                    <div className={styles.pricingAccent}></div>
                    <div className={styles.pricingBody}>
                        <div className={styles.pricingIconBadge}>
                            <CheckCircle2 size={24} />
                        </div>
                        <div className={styles.pricingTextBlock}>
                            <p className={styles.pricingHeadline}>
                                1% {isNl ? 'courtage excl. BTW, geen cure geen pay' : 'commission excl. VAT, no cure no pay'}
                            </p>
                            <p className={styles.pricingSupport}>
                                {isNl
                                    ? 'Geen vooraf-kosten. Geen verrassingen. Alleen courtage bij succesvolle transactie, te voldoen bij notariële overdracht.'
                                    : 'No upfront costs. No surprises. Commission only on successful transaction, payable at notarial transfer.'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.section}>
                <div className={styles.sectionContainer}>
                    <h2 className={styles.sectionTitle}>{t.howTitle}</h2>
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
                </div>
            </section>

            <NeighborhoodSection title="Discover Neighborhoods" />

            <section className={styles.sectionAlt}>
                <div className={styles.sectionContainer}>
                    <h2 className={styles.sectionTitle}>{t.whyTitle}</h2>
                    <div className={styles.uspGrid}>
                        {usps.map((usp, i) => {
                            const Icon = usp.icon;
                            const title = isNl ? usp.titleNl : usp.titleEn;
                            const desc = isNl ? usp.descNl : usp.descEn;
                            return (
                                <div key={i} className={styles.uspCard}>
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

            <section className={styles.section}>
                <div className={styles.sectionContainerNarrow}>
                    <h2 className={styles.sectionTitle}>{t.whatTitle}</h2>
                    <div className={styles.servicesGrid}>
                        {services.map((s, i) => (
                            <div key={i} className={styles.serviceItem}>
                                <CheckCircle2 size={20} className={styles.serviceCheck} />
                                <span className={styles.serviceText}>{isNl ? s.nl : s.en}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className={styles.sectionAlt}>
                <div className={styles.sectionContainerNarrow}>
                    <div className={styles.ctaCard}>
                        <div className={styles.ctaInner}>
                            <div className={styles.ctaIconCircle}>
                                <ClipboardList size={24} />
                            </div>
                            <div className={styles.ctaContent}>
                                <h3 className={styles.ctaTitle}>{t.ctaTitle}</h3>
                                <p className={styles.ctaDesc}>{t.ctaDesc}</p>
                            </div>
                            <Link href={leadLink} className={`${styles.ctaPrimary} ${styles.ctaButtonFull}`}>{t.heroCta}</Link>
                        </div>
                    </div>
                </div>
            </section>

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