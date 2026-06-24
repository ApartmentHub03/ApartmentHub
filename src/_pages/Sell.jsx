'use client';

import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { translations } from '../data/translations';
import useServiceContacts from '../hooks/useServiceContacts';
import ContactSection from '../components/shared/ContactSection';
import styles from './Sell.module.css';
import NeighborhoodSection from '../features/home/components/NeighborhoodSection';
import {
    Camera, FileSignature, Megaphone, Sparkles,
    BarChart3, Users, Home, ClipboardList, Wrench, Phone,
    Mail, MessageCircle, ChevronDown, Star, CheckCircle2,
} from 'lucide-react';

const steps = [
    { icon: Home, titleEn: '1. Introduction & valuation', titleNl: '1. Kennismaking en waardebepaling', descEn: 'We visit your property, discuss your wishes and determine a realistic asking price based on market data.', descNl: 'We bezoeken je woning, bespreken je wensen en bepalen samen een realistische vraagprijs op basis van marktdata.', detailEn: 'During a no-obligation visit, we view your property and discuss your situation and wishes. We analyze recent sales in your neighborhood, current supply and demand, and the unique features of your home. Based on this, we advise a realistic and strategic asking price.', detailNl: 'Tijdens een vrijblijvend bezoek bekijken we je woning en bespreken we je situatie en wensen. We analyseren recente verkopen in jouw buurt, de huidige vraag en het aanbod, en de unieke kenmerken van je woning. Op basis daarvan adviseren we een realistische en strategische vraagprijs.' },
    { icon: ClipboardList, titleEn: '2. Custom sales strategy', titleNl: '2. Verkoopstrategie op maat', descEn: 'We create a strategic sales plan: target audience, timing, bidding method and positioning.', descNl: 'We stellen een strategisch verkoopplan op: doelgroep, timing, biedmethode en positionering.', detailEn: 'No home is the same, so no sale is either. We determine the target audience, the best timing and the bidding method that suits your property. You receive a clear written sales plan with timeline, approach and expected turnaround.', detailNl: 'Geen woning is hetzelfde, dus geen verkoop ook. We bepalen samen de doelgroep, de beste timing en de biedmethode die bij jouw woning past. Je ontvangt een helder verkoopplan op papier met planning, aanpak en verwachte doorlooptijd.' },
    { icon: Wrench, titleEn: '3. Prepare for sale', titleNl: '3. Woning verkoopklaar maken', descEn: 'Advice on small improvements that yield the most: styling, decluttering, minor repairs.', descNl: 'Advies over kleine ingrepen die het meeste opleveren: styling, opruimen, klein herstel.', detailEn: 'First impressions often determine the price. We give targeted advice on what yields the most: decluttering, small repairs, neutralizing and styling. Where it pays off, we bring in a stylist or handyman.', detailNl: 'De eerste indruk bepaalt vaak de prijs. We geven gericht advies over wat het meeste oplevert: opruimen, kleine reparaties, neutraliseren en styling. Waar het loont schakelen we een stylist of klusservice in.' },
    { icon: Camera, titleEn: '4. Professional photography', titleNl: '4. Professionele fotografie en presentatie', descEn: 'A professional photographer captures your property at its best. Floor plans, video and compelling listing text.', descNl: 'Een vakfotograaf maakt lichte, ruimtelijke foto\'s. We laten een plattegrond tekenen en schrijven een wervende verkooptekst.', detailEn: 'A professional photographer captures your property at its best with light, space and atmosphere. We have a floor plan drawn, create video or drone footage if desired, and write a compelling sales text.', detailNl: 'Een vakfotograaf legt je woning op zijn mooist vast met licht, ruimte en sfeer. We laten een plattegrond tekenen, maken waar gewenst video of drone-opnames, en schrijven een wervende verkooptekst.' },
    { icon: Megaphone, titleEn: '5. Publication & marketing', titleNl: '5. Publicatie en marketing', descEn: 'Your property goes live on Funda, our channels and social media. We actively approach our network of buyers.', descNl: 'Je woning gaat live op Funda, onze eigen kanalen en sociale media. We benaderen actief ons netwerk van kopers.', detailEn: 'Your property goes live on Funda and our own channels and social media. We run targeted ads and actively approach our network of buyers and purchasing agents, including off-market.', detailNl: 'Je woning gaat live op Funda en op onze eigen kanalen en sociale media. We zetten gerichte advertenties in en benaderen actief ons netwerk van kopers en aankoopmakelaars, ook voor stille verkoop.' },
    { icon: Users, titleEn: '6. Viewings & negotiation', titleNl: '6. Bezichtigingen en onderhandeling', descEn: 'We schedule and guide all viewings, collect feedback and negotiate on your behalf for the best result.', descNl: 'Wij plannen en begeleiden alle bezichtigingen, verzamelen feedback en onderhandelen namens jou tot het beste resultaat.', detailEn: 'We schedule and guide all viewings personally and collect concrete feedback. When there is interest, we negotiate on your behalf on price and conditions, with a clear strategy.', detailNl: 'Wij plannen en begeleiden alle bezichtigingen persoonlijk en verzamelen concrete feedback. Bij interesse onderhandelen we namens jou op prijs en voorwaarden, met een heldere strategie.' },
    { icon: FileSignature, titleEn: '7. Purchase agreement & transfer', titleNl: '7. Koopovereenkomst en overdracht', descEn: 'We draw up or review the purchase agreement, guide resolutive conditions and stand by you through key handover at the notary.', descNl: 'We stellen de koopovereenkomst op of controleren deze, begeleiden de ontbindende voorwaarden en staan naast je tot de sleuteloverdracht bij de notaris.', detailEn: 'We draw up or carefully review the purchase agreement, monitor the resolutive conditions and deadlines, and coordinate with the notary through to key handover.', detailNl: 'We stellen de koopovereenkomst op of controleren deze zorgvuldig, bewaken de ontbindende voorwaarden en termijnen, en houden contact met de notaris tot en met de sleuteloverdracht.' },
];

const benefits = [
    { icon: Megaphone, titleEn: 'Funda + our channels', titleNl: 'Funda + eigen kanalen', descEn: 'Broad visibility on Funda and through our own tenant/buyer network.', descNl: 'Brede zichtbaarheid op Funda én via ons eigen huurder/koper netwerk.' },
    { icon: Sparkles, titleEn: 'Personal guidance', titleNl: 'Persoonlijke begeleiding', descEn: 'One fixed point of contact through the entire sales process.', descNl: 'Eén vast aanspreekpunt door het hele verkoopproces.' },
    { icon: BarChart3, titleEn: 'Market data & valuation', titleNl: 'Marktdata & taxatie', descEn: 'Substantiated asking price based on current market data.', descNl: 'Onderbouwde vraagprijs op basis van actuele marktdata.' },
];

function ExpandableStepCard({ icon: Icon, title, desc, detail }) {
    const [open, setOpen] = useState(false);
    return (
        <div className={styles.stepCard}>
            <button className={styles.stepHeader} onClick={() => setOpen(!open)} type="button">
                <span className={styles.stepIconWrap}><Icon size={20} /></span>
                <span className={styles.stepHeaderText}>
                    <p className={styles.stepTitle}>{title}</p>
                    <p className={styles.stepDesc}>{desc}</p>
                </span>
                <ChevronDown size={16} className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} />
            </button>
            {open && detail && <div className={styles.stepDetail}>{detail}</div>}
        </div>
    );
}

function ReviewsBadge() {
    const currentLang = useSelector((state) => state.ui.language);
    const isNl = currentLang === 'nl';
    return (
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
    );
}

function PricingCallout() {
    const currentLang = useSelector((state) => state.ui.language);
    const isNl = currentLang === 'nl';
    return (
        <div className={styles.pricingCard}>
            <div className={styles.pricingAccent}></div>
            <div className={styles.pricingBody}>
                <div className={styles.pricingIconBadge}>
                    <CheckCircle2 size={24} />
                </div>
                <div className={styles.pricingTextBlock}>
                    <p className={styles.pricingHeadline}>
                        1% courtage {isNl ? 'excl. BTW, geen cure geen pay' : 'excl. VAT, no cure no pay'}
                    </p>
                    <p className={styles.pricingSupport}>
                        {isNl
                            ? 'Geen vooraf-kosten. Geen verrassingen. Alleen courtage bij succesvolle transactie, te voldoen bij notariële overdracht.'
                            : 'No upfront costs. No surprises. Commission only on successful transaction, payable at notarial transfer.'}
                    </p>
                </div>
            </div>
        </div>
    );
}

const Sell = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.sell[currentLang] || translations.sell.en;
    const contacts = useServiceContacts('verkoop');
    const isNl = currentLang === 'nl';
    const telHref = `tel:${contacts.phone.replace(/\s/g, '')}`;
    const valuationLink = isNl ? '/waardebepaling' : '/en/valuation';

    return (
        <div className={styles.page}>
            <section className={styles.hero}>
                <div className={styles.heroInner}>
                    <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
                    <p className={styles.heroSubtitle}>{t.heroSubtitle}</p>
                    <div className={styles.reviewsRow}>
                        <ReviewsBadge />
                    </div>
                    <div className={styles.heroCta}>
                        <Link href={valuationLink} className={styles.ctaPrimary}>{t.valuationCta}</Link>
                    </div>

                    <div className={styles.heroContactRow}>
                        <a href={telHref} className={styles.contactPill}>
                            <Phone size={16} /> {contacts.phone}
                        </a>
                        <a href={contacts.whatsappLink} target="_blank" rel="noopener noreferrer" className={styles.contactPill}>
                            <MessageCircle size={16} /> {isNl ? 'Direct chatten' : 'Chat directly'}
                        </a>
                        <a href={`mailto:${contacts.email}`} className={styles.contactPill}>
                            <Mail size={16} /> {contacts.email}
                        </a>
                    </div>
                </div>
            </section>

            <PricingCallout />

            <section className={styles.valuation}>
                <h2 className={styles.valuationTitle}>{t.valuationTitle}</h2>
                <p className={styles.valuationDesc}>{t.valuationDesc}</p>
                <Link href={valuationLink} className={styles.ctaPrimary}>{t.valuationCta}</Link>
            </section>

            <section className={styles.stepsSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>{t.howTitle}</h2>
                    <p className={styles.sectionSubtitle}>{t.howSubtitle}</p>
                    <div className={styles.stepsGrid}>
                        {steps.map((step) => {
                            const Icon = step.icon;
                            const title = isNl ? step.titleNl : step.titleEn;
                            const desc = isNl ? step.descNl : step.descEn;
                            const detail = isNl ? step.detailNl : step.detailEn;
                            return (
                                <ExpandableStepCard
                                    key={title}
                                    icon={Icon}
                                    title={title}
                                    desc={desc}
                                    detail={detail}
                                />
                            );
                        })}
                    </div>
                </div>
            </section>

            <NeighborhoodSection title="Discover Neighborhoods" />

            <section className={styles.benefitsSection}>
                <div className={styles.container}>
                    <h2 className={styles.sectionTitle}>{t.whyTitle}</h2>
                    <div className={styles.benefitsGrid}>
                        {benefits.map((b, i) => {
                            const Icon = b.icon;
                            const title = isNl ? b.titleNl : b.titleEn;
                            const desc = isNl ? b.descNl : b.descEn;
                            return (
                                <div key={i} className={styles.benefitCard}>
                                    <div className={styles.benefitIconWrap}>
                                        <Icon size={24} />
                                    </div>
                                    <h3 className={styles.benefitTitle}>{title}</h3>
                                    <p className={styles.benefitDesc}>{desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            <ContactSection
                service="verkoop"
                ctaLink={valuationLink}
                ctaLabel={t.valuationCta}
                title={t.contactTitle}
                description={t.contactDesc}
                isNl={isNl}
            />
        </div>
    );
};

export default Sell;