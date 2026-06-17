'use client';

import React from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import {
    Star, TrendingUp, Clock, Shield, Users, Phone,
    ArrowRight, CheckCircle, Home
} from 'lucide-react';
import styles from './DiscoverMore.module.css';

const DiscoverMore = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const isNL = currentLang === 'nl';

    // Content translations
    const content = {
        heroBadge: isNL ? '2500+ tevreden verhuurders' : '2500+ satisfied landlords',
        heroTitle: isNL
            ? <>Waarom Slimme Verhuurders Kiezen<br />voor ApartmentHub</>
            : <>Why Smart Landlords Choose<br />ApartmentHub</>,
        heroSubtitle: isNL
            ? 'Wij maximaliseren uw huurinkomsten en minimaliseren uw zorgen. Met bewezen resultaten en 2500+ tevreden verhuurders zijn wij uw partner voor zorgeloos verhuren.'
            : 'We maximize your rental income and minimize your worries. With proven results and 2500+ satisfied landlords, we are your partner for worry-free renting.',
        contactBtn: isNL ? 'Neem Contact Op' : 'Contact Us',
        calculateBtn: isNL ? 'Bereken Uw Huurprijs' : 'Calculate Your Rent',

        // Stats
        stats: [
            { value: '2500+', label: isNL ? 'Tevreden verhuurders' : 'Satisfied landlords' },
            { value: '4.9/5', label: isNL ? 'Gemiddelde beoordeling' : 'Average rating' },
            { value: '5', label: isNL ? 'Dagen gemiddelde verhuur' : 'Days average rental' },
            { value: '€247', label: isNL ? 'Extra per maand' : 'Extra per month' }
        ],

        // Why section
        whyTitle: isNL ? 'Waarom Verhuurders Voor Ons Kiezen' : 'Why Landlords Choose Us',
        whySubtitle: isNL
            ? 'Concrete voordelen die direct impact hebben op uw portemonnee en gemoedsrust'
            : 'Concrete benefits that directly impact your wallet and peace of mind',

        benefits: [
            {
                icon: TrendingUp,
                value: '+15%',
                title: isNL ? 'Hogere Huurprijs' : 'Higher Rental Price',
                desc: isNL
                    ? 'Door professionele marketing en marktkennis realiseren wij gemiddeld 15% hogere huurprijzen.'
                    : 'Through professional marketing and market knowledge, we achieve an average of 15% higher rental prices.'
            },
            {
                icon: Clock,
                value: '5',
                title: isNL ? 'Snelle Verhuur' : 'Fast Rental',
                desc: isNL
                    ? 'Gemiddeld binnen 5 dagen verhuurd dankzij ons uitgebreide netwerk van gekwalificeerde kandidaten.'
                    : 'Average rental within 5 days thanks to our extensive network of qualified candidates.'
            },
            {
                icon: Shield,
                value: '98%',
                title: isNL ? 'Veilige Screening' : 'Safe Screening',
                desc: isNL
                    ? 'Grondige verificatie van alle kandidaten met 98% succesvolle huurrelaties.'
                    : 'Thorough verification of all candidates with 98% successful rental relationships.'
            },
            {
                icon: Users,
                value: '24/7',
                title: isNL ? 'Volledige Ontzorging' : 'Full Service',
                desc: isNL
                    ? 'Van marketing tot contract en beheer  wij regelen alles 24/7 voor u.'
                    : 'From marketing to contract and management we handle everything 24/7 for you.'
            }
        ],

        // How we work
        howTitle: isNL ? 'Hoe Wij Te Werk Gaan' : 'How We Work',
        howSubtitle: isNL ? 'Een bewezen aanpak die resultaat garandeert' : 'A proven approach that guarantees results',

        steps: [
            {
                num: '01',
                title: isNL ? 'Gratis Waardering' : 'Free Valuation',
                desc: isNL
                    ? 'Wij analyseren uw woning en bepalen de optimale huurprijs op basis van actuele marktdata.'
                    : 'We analyze your property and determine the optimal rental price based on current market data.'
            },
            {
                num: '02',
                title: isNL ? 'Professionele Marketing' : 'Professional Marketing',
                desc: isNL
                    ? 'Fotografie, beschrijving en plaatsing op alle relevante platforms voor maximale zichtbaarheid.'
                    : 'Photography, description and placement on all relevant platforms for maximum visibility.'
            },
            {
                num: '03',
                title: isNL ? 'Kandidaat Selectie' : 'Candidate Selection',
                desc: isNL
                    ? 'Grondige screening van kandidaten op inkomen, referenties en betrouwbaarheid.'
                    : 'Thorough screening of candidates on income, references and reliability.'
            },
            {
                num: '04',
                title: isNL ? 'Contract & Overdracht' : 'Contract & Handover',
                desc: isNL
                    ? 'Juridisch waterdicht contract en soepele sleuteloverdracht met volledige documentatie.'
                    : 'Legally watertight contract and smooth key handover with complete documentation.'
            }
        ],

        // Testimonial
        testimonialQuote: isNL
            ? '"ApartmentHub verhuurde mijn appartement binnen 3 dagen voor €300 meer dan ik had verwacht. Vanaf nu laat ik het altijd aan hen over."'
            : '"ApartmentHub rented my apartment within 3 days for €300 more than I expected. From now on I will always leave it to them."',
        testimonialAuthor: '— Marianne K., Amsterdam Zuid',

        // Comparison
        comparisonTitle: isNL ? 'Waarom Niet Zelf Verhuren?' : 'Why Not Rent Out Yourself?',
        comparisonSubtitle: isNL
            ? 'Veel verhuurders denken geld te besparen door zelf te verhuren. De praktijk wijst anders uit.'
            : 'Many landlords think they save money by renting out themselves. Practice shows otherwise.',
        comparisonPoints: [
            isNL ? 'Gemiddeld 15% lagere huurprijs door gebrek aan marktkennis' : 'Average 15% lower rental price due to lack of market knowledge',
            isNL ? 'Weken tot maanden leegstand door beperkt bereik' : 'Weeks to months of vacancy due to limited reach',
            isNL ? 'Risico op slechte huurders zonder professionele screening' : 'Risk of bad tenants without professional screening',
            isNL ? 'Juridische problemen door onvolledige contracten' : 'Legal problems due to incomplete contracts'
        ],
        mathTitle: isNL ? 'Rekenen We Even Mee?' : "Let's Do The Math",
        selfRental: isNL ? 'Zelf verhuren (gem.)' : 'Self-renting (avg.)',
        withUs: isNL ? 'Met ApartmentHub' : 'With ApartmentHub',
        extraIncome: isNL ? 'Uw extra opbrengst' : 'Your extra income',
        extraYear: isNL ? 'Extra per jaar' : 'Extra per year',
        disclaimer: isNL ? '*Na eenmalige service fee van €1.000 excl. BTW' : '*After one-time service fee of €1,000 excl. VAT',

        // CTA
        ctaTitle: isNL ? 'Klaar Om Meer Te Verdienen?' : 'Ready To Earn More?',
        ctaSubtitle: isNL
            ? 'Ontvang binnen 24 uur een gratis en vrijblijvende waardering van uw woning.'
            : 'Receive a free and non-binding valuation of your property within 24 hours.',
        ctaCalculate: isNL ? 'Bereken Huurprijs' : 'Calculate Rental Price'
    };

    return (
        <div className={styles.pageContainer}>
            {/* Hero Section */}
            <section className={styles.heroSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.heroBadge}>
                        <Star className={styles.badgeIcon} />
                        <span>{content.heroBadge}</span>
                    </div>
                    <h1 className={styles.heroTitle}>{content.heroTitle}</h1>
                    <p className={styles.heroSubtitle}>{content.heroSubtitle}</p>
                    <div className={styles.heroButtons}>
                        <Link href={`/${currentLang}/contact`}>
                            <button className={styles.primaryBtn}>
                                <Phone className={styles.btnIcon} />
                                {content.contactBtn}
                            </button>
                        </Link>
                        <Link href={`/${currentLang}/rent-out`}>
                            <button className={styles.secondaryBtn}>
                                {content.calculateBtn}
                                <ArrowRight className={styles.btnIcon} />
                            </button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className={styles.statsSection}>
                <div className={styles.statsContainer}>
                    <div className={styles.statsGrid}>
                        {content.stats.map((stat, index) => (
                            <div key={index} className={styles.statItem}>
                                <div className={styles.statValue}>{stat.value}</div>
                                <div className={styles.statLabel}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Landlords Choose Us */}
            <section className={styles.whySection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{content.whyTitle}</h2>
                        <p className={styles.sectionSubtitle}>{content.whySubtitle}</p>
                    </div>
                    <div className={styles.benefitsGrid}>
                        {content.benefits.map((benefit, index) => {
                            const Icon = benefit.icon;
                            return (
                                <div key={index} className={styles.benefitCard}>
                                    <div className={styles.benefitIconWrapper}>
                                        <Icon className={styles.benefitIcon} />
                                    </div>
                                    <div className={styles.benefitValue}>{benefit.value}</div>
                                    <h3 className={styles.benefitTitle}>{benefit.title}</h3>
                                    <p className={styles.benefitDesc}>{benefit.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How We Work */}
            <section className={styles.howSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{content.howTitle}</h2>
                        <p className={styles.sectionSubtitle}>{content.howSubtitle}</p>
                    </div>
                    <div className={styles.stepsGrid}>
                        {content.steps.map((step, index) => (
                            <div key={index} className={styles.stepItem}>
                                <div className={styles.stepNum}>{step.num}</div>
                                <h3 className={styles.stepTitle}>{step.title}</h3>
                                <p className={styles.stepDesc}>{step.desc}</p>
                                {index < content.steps.length - 1 && (
                                    <div className={styles.stepConnector}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonial */}
            <section className={styles.testimonialSection}>
                <div className={styles.testimonialContainer}>
                    <Star className={styles.testimonialStar} />
                    <blockquote className={styles.testimonialQuote}>
                        {content.testimonialQuote}
                    </blockquote>
                    <cite className={styles.testimonialAuthor}>{content.testimonialAuthor}</cite>
                </div>
            </section>

            {/* Comparison Section */}
            <section className={styles.comparisonSection}>
                <div className={styles.container}>
                    <div className={styles.comparisonGrid}>
                        <div className={styles.comparisonContent}>
                            <h2 className={styles.comparisonTitle}>{content.comparisonTitle}</h2>
                            <p className={styles.comparisonSubtitle}>{content.comparisonSubtitle}</p>
                            <div className={styles.comparisonPoints}>
                                {content.comparisonPoints.map((point, index) => (
                                    <div key={index} className={styles.comparisonPoint}>
                                        <CheckCircle className={styles.checkIcon} />
                                        <span>{point}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={styles.mathCard}>
                            <h3 className={styles.mathTitle}>{content.mathTitle}</h3>
                            <div className={styles.mathItems}>
                                <div className={styles.mathRow}>
                                    <span className={styles.mathLabel}>{content.selfRental}</span>
                                    <span className={styles.mathValue}>€2,500/month</span>
                                </div>
                                <div className={styles.mathRow}>
                                    <span className={styles.mathLabel}>{content.withUs}</span>
                                    <span className={styles.mathValueGreen}>€2,747/month</span>
                                </div>
                                <div className={styles.mathRowHighlight}>
                                    <span className={styles.mathLabelBold}>{content.extraIncome}</span>
                                    <span className={styles.mathValueOrange}>+€247/month</span>
                                </div>
                                <div className={styles.mathRowTotal}>
                                    <span className={styles.mathLabelBold}>{content.extraYear}</span>
                                    <span className={styles.mathValueGreenBig}>+€2,964/year</span>
                                </div>
                            </div>
                            <p className={styles.mathDisclaimer}>{content.disclaimer}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className={styles.ctaSection}>
                <div className={styles.container}>
                    <div className={styles.ctaCard}>
                        <Home className={styles.ctaIcon} />
                        <h2 className={styles.ctaTitle}>{content.ctaTitle}</h2>
                        <p className={styles.ctaSubtitle}>{content.ctaSubtitle}</p>
                        <div className={styles.ctaButtons}>
                            <Link href={`/${currentLang}/contact`}>
                                <button className={styles.ctaPrimaryBtn}>
                                    <Phone className={styles.btnIcon} />
                                    {content.contactBtn}
                                </button>
                            </Link>
                            <Link href={`/${currentLang}/rent-out`}>
                                <button className={styles.ctaSecondaryBtn}>
                                    {content.ctaCalculate}
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DiscoverMore;
