import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { translations } from '../data/translations';
import AnimatedCounter from '../components/common/AnimatedCounter';
import RentalCalculator from '../components/common/RentalCalculator';
import YouTubeEmbed from '../components/common/YouTubeEmbed';
import useInView from '../hooks/useInView';
import {
    Shield, Search, Heart, UserCheck, Euro, Calendar,
    Camera, CheckCircle, TrendingUp, MessageSquare,
    MapPin, FileText, Clock, ArrowRight
} from 'lucide-react';
import styles from './RentOut.module.css';

// Import images
import rentoutHeroImage from '../assets/rentout.jpg';
import logoImage from '../assets/5a9afd14-27a5-40d8-a185-fac727f64fdf.png';

// TODO: Replace with actual YouTube video ID
const VERHUREN_VIDEO_ID = '';

// Placeholder images for verhuren sections - using Unsplash
const verhurenDetectiveImage = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';
const verhurenMarketingImage = 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80';
const verhurenMatchImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80';

const RentOut = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.rentOut[currentLang] || translations.rentOut.en;

    // Contact form state for the bottom section
    const [contactFormData, setContactFormData] = useState({
        address: '',
        postalCode: '',
        email: '',
        phone: ''
    });
    const [contactSubmitted, setContactSubmitted] = useState(false);

    // Property details form state for the rental advice section
    const [propertyDetailsSubmitted, setPropertyDetailsSubmitted] = useState(false);

    // For animated stats
    const [statsRef, statsInView] = useInView({ threshold: 0.2, triggerOnce: true });
    const [impactRef, impactInView] = useInView({ threshold: 0.2, triggerOnce: true });

    const handleContactFormInputChange = (field, value) => {
        setContactFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleContactFormSubmit = (e) => {
        e.preventDefault();
        console.log('Contact form data:', contactFormData);
        setContactSubmitted(true);
    };

    const handlePropertyDetailsSubmit = (formData) => {
        console.log('Property details form data:', formData);
        setPropertyDetailsSubmitted(true);
    };

    const resetPropertyDetailsForm = () => {
        setPropertyDetailsSubmitted(false);
    };

    return (
        <div className={styles.pageContainer}>
            {/* Hero Section */}
            <section className={styles.heroSection}>
                <div className={styles.heroContainer}>
                    <div className={styles.heroBadge}>
                        <Shield className={styles.badgeIcon} />
                        {t.heroBadge}
                    </div>

                    <h1 className={styles.heroTitle}>
                        <span className={styles.textOrange}>{t.heroTitle1}</span><br />
                        <span className={styles.textBlack}>{t.heroTitle2}</span>
                    </h1>

                    <p className={styles.heroSubtitle}>
                        {t.heroSubtitle}
                    </p>

                    {/* YouTube Video */}
                    <div style={{ maxWidth: '56rem', margin: '2rem auto 0' }}>
                        <YouTubeEmbed
                            videoId={VERHUREN_VIDEO_ID}
                            title="Zorgeloos Verhuren met ApartmentHub"
                            className="shadow-2xl"
                        />
                    </div>
                </div>
            </section>

            {/* Price Check / Rental Advice Section */}
            <section className={styles.priceCheckSection}>
                <div className={styles.container}>
                    <div className={styles.priceCheckGrid}>
                        <div className={styles.imageCol}>
                            <div className={styles.imageWrapper}>
                                <img
                                    src={rentoutHeroImage}
                                    alt="Verhuren met ApartmentHub"
                                    className={styles.sectionImage}
                                    loading="lazy"
                                />
                            </div>
                        </div>

                        <div className={styles.formCol}>
                            <div className={styles.formContent}>
                                <h2 className={styles.sectionTitle}>{t.priceCheckTitle}</h2>
                                <p className={styles.sectionDesc}>{t.priceCheckDesc}</p>

                                <div className={styles.calculatorCard}>
                                    <div className={styles.calcVisual}>
                                        <div className={styles.calcVisualInner}>
                                            <div className={styles.calcText}>((√...-...) × ...) ÷ ... + ... ^...</div>
                                        </div>
                                    </div>

                                    <RentalCalculator
                                        onSubmit={handlePropertyDetailsSubmit}
                                        onReset={resetPropertyDetailsForm}
                                        submitted={propertyDetailsSubmitted}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Behind the Scenes / Story Section */}
            <section className={styles.storySection}>
                <div className={styles.storyBgLeft}></div>
                <div className={styles.storyBgRight}></div>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <div className={styles.badge}>
                            <Camera className={styles.badgeIcon} />
                            {t.storyBadge}
                        </div>
                        <h2 className={styles.sectionTitle}>{t.storyTitle}</h2>
                        <p className={styles.sectionSubtitle}>
                            {t.storySubtitle}
                        </p>
                    </div>

                    {/* Step 1 */}
                    <div className={styles.stepRow}>
                        <div className={styles.stepContent}>
                            <div className={styles.stepCard}>
                                <div className={styles.stepHeader}>
                                    <div className={styles.stepIconWrapperOrange}>
                                        <Search className={styles.stepIconOrange} />
                                    </div>
                                    <h3 className={styles.stepTitle}>{t.step1Title}</h3>
                                </div>
                                <p className={styles.stepDesc}>
                                    {t.step1Desc}
                                </p>
                                <div className={styles.stepListOrange}>
                                    <div className={styles.listTitleOrange}>{t.step1ListTitle}</div>
                                    <ul>
                                        <li>• {t.step1List1}</li>
                                        <li>• {t.step1List2}</li>
                                        <li>• {t.step1List3}</li>
                                        <li>• {t.step1List4}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className={styles.stepImageCol}>
                            <div className={styles.stepImageWrapper}>
                                <img src={verhurenDetectiveImage} alt="Property Analysis" className={styles.stepImage} />
                                <div className={styles.floatBadgeTopRight}>
                                    <div className={styles.floatBadgeText}>+15%</div>
                                    <div className={styles.floatBadgeSub}>more value</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className={styles.stepRowReverse}>
                        <div className={styles.stepImageCol}>
                            <div className={styles.stepImageWrapper}>
                                <img src={verhurenMarketingImage} alt="Marketing Magic" className={styles.stepImage} />
                                <div className={styles.floatBadgeBottomLeft}>
                                    <div className={styles.floatBadgeText}>72h</div>
                                    <div className={styles.floatBadgeSub}>to 1st viewing</div>
                                </div>
                            </div>
                        </div>
                        <div className={styles.stepContent}>
                            <div className={styles.stepCard}>
                                <div className={styles.stepHeader}>
                                    <div className={styles.stepIconWrapperGreen}>
                                        <Heart className={styles.stepIconGreen} />
                                    </div>
                                    <h3 className={styles.stepTitle}>{t.step2Title}</h3>
                                </div>
                                <p className={styles.stepDesc}>
                                    {t.step2Desc}
                                </p>
                                <div className={styles.stepListGreen}>
                                    <div className={styles.listTitleGreen}>{t.step2ListTitle}</div>
                                    <ul>
                                        <li>• {t.step2List1}</li>
                                        <li>• {t.step2List2}</li>
                                        <li>• {t.step2List3}</li>
                                        <li>• {t.step2List4}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className={styles.stepRow}>
                        <div className={styles.stepContent}>
                            <div className={styles.stepCard}>
                                <div className={styles.stepHeader}>
                                    <div className={styles.stepIconWrapperOrange}>
                                        <UserCheck className={styles.stepIconOrange} />
                                    </div>
                                    <h3 className={styles.stepTitle}>{t.step3Title}</h3>
                                </div>
                                <p className={styles.stepDesc}>
                                    {t.step3Desc}
                                </p>
                                <div className={styles.stepListOrange}>
                                    <div className={styles.listTitleOrange}>{t.step3ListTitle}</div>
                                    <ul>
                                        <li>• {t.step3List1}</li>
                                        <li>• {t.step3List2}</li>
                                        <li>• {t.step3List3}</li>
                                        <li>• {t.step3List4}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                        <div className={styles.stepImageCol}>
                            <div className={styles.stepImageWrapper}>
                                <img src={verhurenMatchImage} alt="Perfect Match" className={styles.stepImage} />
                                <div className={styles.floatBadgeTopRightGreen}>
                                    <div className={styles.floatBadgeText}>98%</div>
                                    <div className={styles.floatBadgeSub}>happy matches</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Services & Pricing Section */}
            <section style={{
                padding: '5rem 0',
                background: 'linear-gradient(to bottom right, var(--color-primary-green), rgba(0, 155, 138, 0.9))'
            }}>
                <div className={styles.container}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: '2.25rem', fontWeight: '700', color: 'white', marginBottom: '1rem' }}>
                            {currentLang === 'nl' ? 'Wat bieden wij aan?' : 'What do we offer?'}
                        </h2>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: 'rgba(255, 107, 53, 0.2)',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '9999px'
                        }}>
                            <Euro style={{ width: '1.25rem', height: '1.25rem', color: '#ff6b35' }} />
                            <span style={{ color: 'white', fontWeight: '700', fontSize: '1.25rem' }}>
                                €1.000,- <span style={{ fontWeight: '400', color: 'rgba(255, 255, 255, 0.8)' }}>
                                    {currentLang === 'nl' ? 'excl. BTW' : 'excl. VAT'}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* 2-column grid layout */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '1rem',
                        maxWidth: '800px',
                        margin: '0 auto'
                    }}>
                        {[
                            { icon: MessageSquare, text: currentLang === 'nl' ? 'Gratis advies' : 'Free advice' },
                            { icon: Camera, text: currentLang === 'nl' ? "Gratis foto's & video" : 'Free photos & video' },
                            { icon: UserCheck, text: currentLang === 'nl' ? 'Huurder screenings' : 'Tenant screenings' },
                            { icon: TrendingUp, text: currentLang === 'nl' ? 'Adverteren op Funda & Pararius' : 'Advertising on Funda & Pararius' },
                            { icon: UserCheck, text: currentLang === 'nl' ? 'Hulp bij onderhandelingen' : 'Assistance with negotiations' },
                            { icon: MapPin, text: currentLang === 'nl' ? 'Distributie naar internationale relocators' : 'Distribution to international relocators' },
                            { icon: FileText, text: currentLang === 'nl' ? 'Huurcontract' : 'Rental contract' },
                            { icon: Calendar, text: currentLang === 'nl' ? 'Bezichtigingen 7 dagen per week' : 'Property showings 7 days a week' },
                        ].map((service, index) => {
                            const IconComponent = service.icon;
                            return (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        padding: '1rem 1.5rem',
                                        borderRadius: '0.75rem',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        transition: 'all 0.3s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                        e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                >
                                    <div style={{
                                        width: '2.5rem',
                                        height: '2.5rem',
                                        background: 'rgba(255, 107, 53, 0.25)',
                                        borderRadius: '9999px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: '0'
                                    }}>
                                        <IconComponent style={{ width: '1.25rem', height: '1.25rem', color: '#ff6b35', strokeWidth: 2.5 }} />
                                    </div>
                                    <span style={{ color: 'white', fontWeight: '500', fontSize: '0.95rem' }}>{service.text}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: '3rem' }}>
                        <button
                            onClick={() => window.open('https://wa.me/31641439378?text=Ik%20wil%20graag%20mijn%20woning%20verhuren', '_blank')}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                background: '#ff6b35',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                fontSize: '1rem',
                                fontWeight: '700',
                                borderRadius: '9999px',
                                transition: 'all 0.5s ease-out',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                                border: '2px solid rgba(255, 255, 255, 0.2)',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#ff8c00';
                                e.currentTarget.style.transform = 'scale(1.1)';
                                e.currentTarget.style.boxShadow = '0 25px 50px -12px rgba(255, 107, 53, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#ff6b35';
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                            }}
                        >
                            {currentLang === 'nl' ? 'Start Nu' : 'Get Started'}
                            <ArrowRight style={{ width: '1.25rem', height: '1.25rem' }} />
                        </button>
                    </div>
                </div>
            </section>

            {/* Numbers Section */}
            <section className={styles.numbersSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t.numbersTitle}</h2>
                        <p className={styles.sectionSubtitle}>{t.numbersSubtitle}</p>
                    </div>

                    <div className={styles.statsGrid} ref={statsRef}>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxOrange}>
                                <div className={styles.statValue}>
                                    <AnimatedCounter end={847} duration={2000} shouldStart={statsInView} prefix="€" />
                                </div>
                            </div>
                            <h4 className={styles.statLabel}>{t.statMonth}</h4>
                            <p className={styles.statDesc}>{t.statMonthDesc}</p>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxGreen}>
                                <div className={styles.statValue}>
                                    <AnimatedCounter end={12} duration={2000} shouldStart={statsInView} />
                                </div>
                            </div>
                            <h4 className={styles.statLabel}>{t.statDays}</h4>
                            <p className={styles.statDesc}>{t.statDaysDesc}</p>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxLightGreen}>
                                <div className={styles.statValue}>
                                    <AnimatedCounter end={98} duration={2000} shouldStart={statsInView} suffix="%" />
                                </div>
                            </div>
                            <h4 className={styles.statLabel}>{t.statSat}</h4>
                            <p className={styles.statDesc}>{t.statSatDesc}</p>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxPurple}>
                                <div className={styles.statValue}>
                                    <AnimatedCounter end={24} duration={2000} shouldStart={statsInView} suffix="/7" />
                                </div>
                            </div>
                            <h4 className={styles.statLabel}>{t.statService}</h4>
                            <p className={styles.statDesc}>{t.statServiceDesc}</p>
                        </div>
                    </div>

                    <div className={styles.impactCard}>
                        <h3 className={styles.impactTitle}>{t.impactTitle}</h3>
                        <div className={styles.impactGrid} ref={impactRef}>
                            <div className={styles.impactItem}>
                                <div className={styles.impactBoxOrange}>
                                    <Euro className={styles.impactIconOrange} />
                                    <div className={styles.impactValueOrange}>
                                        <AnimatedCounter end={10164} duration={2500} shouldStart={impactInView} prefix="€" />
                                    </div>
                                    <div className={styles.impactLabel}>{t.impactIncome}</div>
                                </div>
                                <p className={styles.impactDesc}>{t.impactIncomeDesc}</p>
                            </div>
                            <div className={styles.impactItem}>
                                <div className={styles.impactBoxGreen}>
                                    <Calendar className={styles.impactIconGreen} />
                                    <div className={styles.impactValueGreen}>
                                        <AnimatedCounter end={180} duration={2500} shouldStart={impactInView} />
                                    </div>
                                    <div className={styles.impactLabel}>{t.impactHours}</div>
                                </div>
                                <p className={styles.impactDesc}>{t.impactHoursDesc}</p>
                            </div>
                            <div className={styles.impactItem}>
                                <div className={styles.impactBoxLightGreen}>
                                    <Shield className={styles.impactIconLightGreen} />
                                    <div className={styles.impactValueLightGreen}>
                                        <AnimatedCounter end={100} duration={2500} shouldStart={impactInView} suffix="%" />
                                    </div>
                                    <div className={styles.impactLabel}>{t.impactLegal}</div>
                                </div>
                                <p className={styles.impactDesc}>{t.impactLegalDesc}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Risks Section */}
            <section className={styles.risksSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t.risksTitle}</h2>
                        <p className={styles.sectionSubtitle}>{t.risksSubtitle}</p>
                    </div>

                    <div className={styles.risksGrid}>
                        {/* Risk 1 */}
                        <div className={styles.riskCard}>
                            <div className={styles.riskRow}>
                                <div className={styles.riskProblem}>
                                    <div className={styles.riskHeader}>
                                        <div className={styles.riskIconRed}>
                                            <div className={styles.emoji}>😱</div>
                                        </div>
                                        <h3 className={styles.riskTitle}>{t.risk1Title}</h3>
                                    </div>
                                    <p className={styles.riskDesc}>{t.risk1Desc}</p>
                                </div>
                                <div className={styles.riskSolution}>
                                    <div className={styles.solutionBoxGreen}>
                                        <div className={styles.solutionHeader}>
                                            <CheckCircle className={styles.solutionIconGreen} />
                                            <h4 className={styles.solutionTitleGreen}>{t.sol1Title}</h4>
                                        </div>
                                        <ul className={styles.solutionListGreen}>
                                            <li>• {t.sol1List1}</li>
                                            <li>• {t.sol1List2}</li>
                                            <li>• {t.sol1List3}</li>
                                            <li>• {t.sol1List4}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Risk 2 */}
                        <div className={styles.riskCard}>
                            <div className={styles.riskRowReverse}>
                                <div className={styles.riskSolution}>
                                    <div className={styles.solutionBoxOrange}>
                                        <div className={styles.solutionHeader}>
                                            <CheckCircle className={styles.solutionIconOrange} />
                                            <h4 className={styles.solutionTitleOrange}>{t.sol2Title}</h4>
                                        </div>
                                        <ul className={styles.solutionListOrange}>
                                            <li>• {t.sol2List1}</li>
                                            <li>• {t.sol2List2}</li>
                                            <li>• {t.sol2List3}</li>
                                            <li>• {t.sol2List4}</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className={styles.riskProblem}>
                                    <div className={styles.riskHeader}>
                                        <div className={styles.riskIconRed}>
                                            <div className={styles.emoji}>💸</div>
                                        </div>
                                        <h3 className={styles.riskTitle}>{t.risk2Title}</h3>
                                    </div>
                                    <p className={styles.riskDesc}>{t.risk2Desc}</p>
                                </div>
                            </div>
                        </div>

                        {/* Risk 3 */}
                        <div className={styles.riskCard}>
                            <div className={styles.riskRow}>
                                <div className={styles.riskProblem}>
                                    <div className={styles.riskHeader}>
                                        <div className={styles.riskIconRed}>
                                            <div className={styles.emoji}>📉</div>
                                        </div>
                                        <h3 className={styles.riskTitle}>{t.risk3Title}</h3>
                                    </div>
                                    <p className={styles.riskDesc}>{t.risk3Desc}</p>
                                </div>
                                <div className={styles.riskSolution}>
                                    <div className={styles.solutionBoxGreen}>
                                        <div className={styles.solutionHeader}>
                                            <CheckCircle className={styles.solutionIconGreen} />
                                            <h4 className={styles.solutionTitleGreen}>{t.sol3Title}</h4>
                                        </div>
                                        <ul className={styles.solutionListGreen}>
                                            <li>• {t.sol3List1}</li>
                                            <li>• {t.sol3List2}</li>
                                            <li>• {t.sol3List3}</li>
                                            <li>• {t.sol3List4}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.riskSummary}>
                        <div className={styles.summaryCard}>
                            <h3 className={styles.summaryTitle}>{t.riskSummaryTitle}</h3>
                            <p className={styles.summaryDesc}>{t.riskSummaryDesc}</p>
                            <div className={styles.summaryStats}>
                                <div>
                                    <div className={styles.summaryValue}>€2,800</div>
                                    <div className={styles.summaryLabel}>{t.riskLoss}</div>
                                </div>
                                <div>
                                    <div className={styles.summaryValue}>vs</div>
                                </div>
                                <div>
                                    <div className={styles.summaryValue}>0.3%</div>
                                    <div className={styles.summaryLabel}>{t.riskChance}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final Section / Contact Form */}
            <section className={styles.finalSection}>
                <div className={styles.finalBg}></div>
                <div className={styles.container}>
                    <div className={styles.finalGrid}>
                        <div className={styles.finalContent}>
                            <h2 className={styles.finalTitle}>
                                {t.finalTitle1} <span className={styles.textOrange}>{t.finalTitle2}</span>
                            </h2>
                            <p className={styles.finalSubtitle}>{t.finalSubtitle}</p>

                            <div className={styles.benefitsList}>
                                <div className={styles.benefitItem}>
                                    <div className={styles.benefitIconBoxGreen}>
                                        <CheckCircle className={styles.benefitIconGreen} />
                                    </div>
                                    <div>
                                        <h4 className={styles.benefitTitle}>{t.benefit1Title}</h4>
                                        <p className={styles.benefitDesc}>{t.benefit1Desc}</p>
                                    </div>
                                </div>
                                <div className={styles.benefitItem}>
                                    <div className={styles.benefitIconBoxOrange}>
                                        <Shield className={styles.benefitIconOrange} />
                                    </div>
                                    <div>
                                        <h4 className={styles.benefitTitle}>{t.benefit2Title}</h4>
                                        <p className={styles.benefitDesc}>{t.benefit2Desc}</p>
                                    </div>
                                </div>
                                <div className={styles.benefitItem}>
                                    <div className={styles.benefitIconBoxGreen}>
                                        <Clock className={styles.benefitIconGreen} />
                                    </div>
                                    <div>
                                        <h4 className={styles.benefitTitle}>{t.benefit3Title}</h4>
                                        <p className={styles.benefitDesc}>{t.benefit3Desc}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.finalStats}>
                                <div className={styles.finalStatsRow}>
                                    <div>
                                        <div className={styles.finalStatsValue}>1,200+</div>
                                        <div className={styles.finalStatsLabel}>{t.finalStatsLandlords}</div>
                                    </div>
                                    <div>
                                        <div className={styles.finalStatsValue}>€2.8M+</div>
                                        <div className={styles.finalStatsLabel}>{t.finalStatsRevenue}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.finalFormCol}>
                            <div className={styles.finalFormCard}>
                                <div className={styles.formBlurCircle}></div>
                                <div className={styles.formHeader}>
                                    <div className={styles.formLogoWrapper}>
                                        <img src={logoImage} alt="ApartmentHub Logo" className={styles.formLogoImage} />
                                    </div>
                                    <h3 className={styles.formTitle}>{t.formTitle}</h3>
                                    <p className={styles.formSubtitle}>{t.formSubtitle}</p>
                                </div>
                                {!contactSubmitted ? (
                                    <form onSubmit={handleContactFormSubmit} className={styles.finalForm}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>{t.formAddress}</label>
                                            <input
                                                className={styles.formInput}
                                                placeholder="e.g. Keizersgracht 123, Amsterdam"
                                                value={contactFormData.address}
                                                onChange={(e) => handleContactFormInputChange('address', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>{t.formPostal}</label>
                                            <input
                                                className={styles.formInput}
                                                placeholder="e.g. 1012 AB"
                                                value={contactFormData.postalCode}
                                                onChange={(e) => handleContactFormInputChange('postalCode', e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>{t.formEmail}</label>
                                                <input
                                                    type="email"
                                                    className={styles.formInput}
                                                    placeholder="your.email@example.com"
                                                    value={contactFormData.email}
                                                    onChange={(e) => handleContactFormInputChange('email', e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className={styles.formGroup}>
                                                <label className={styles.formLabel}>{t.formPhone}</label>
                                                <input
                                                    type="tel"
                                                    className={styles.formInput}
                                                    placeholder="+31 6 12345678"
                                                    value={contactFormData.phone}
                                                    onChange={(e) => handleContactFormInputChange('phone', e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <button type="submit" className={styles.finalSubmitBtn}>
                                            <span>{t.formBtn}</span>
                                            <TrendingUp className={styles.btnIcon} />
                                        </button>
                                        <p className={styles.formDisclaimer}>{t.formDisclaimer}</p>
                                    </form>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                        <div style={{
                                            width: '5rem',
                                            height: '5rem',
                                            background: 'linear-gradient(to bottom right, rgba(0, 155, 138, 0.1), rgba(255, 165, 0, 0.1))',
                                            borderRadius: '9999px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            margin: '0 auto 1.5rem'
                                        }}>
                                            <CheckCircle style={{ width: '2.5rem', height: '2.5rem', color: 'var(--color-primary-green)' }} />
                                        </div>
                                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#111827', marginBottom: '1rem' }}>
                                            Thank you!
                                        </h3>
                                        <p style={{ color: '#4b5563', marginBottom: '1.5rem', lineHeight: '1.625' }}>
                                            We've received your information and will contact you within 24 hours.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setContactSubmitted(false);
                                                setContactFormData({ address: '', postalCode: '', email: '', phone: '' });
                                            }}
                                            style={{
                                                background: 'linear-gradient(to right, var(--color-primary-orange), var(--color-primary-green))',
                                                color: 'white',
                                                padding: '0.75rem 2rem',
                                                borderRadius: '0.75rem',
                                                fontWeight: '500',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s'
                                            }}
                                        >
                                            Submit Another Property
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default RentOut;
