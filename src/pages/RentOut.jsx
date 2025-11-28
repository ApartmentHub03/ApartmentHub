import React from 'react';
import useCounter from '../hooks/useCounter';
import useInView from '../hooks/useInView';
import { useSelector } from 'react-redux';
import { Shield, FileText, MapPin, ChevronDown, Calculator, Search, Heart, UserCheck, Euro, Calendar, TrendingUp, Camera, Clock, CheckCircle } from 'lucide-react';
import styles from './RentOut.module.css';
import { translations } from '../data/translations';

import rentoutImage from '../assets/rentout.jpg';
import logoImage from '../assets/5a9afd14-27a5-40d8-a185-fac727f64fdf.png';

const RentOut = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.rentOut[currentLang] || translations.rentOut.en;

    const [statsRef, statsInView] = useInView({ threshold: 0.2, triggerOnce: true });

    const countMonth = useCounter(847, 2000, statsInView);
    const countDays = useCounter(12, 2000, statsInView);
    const countSat = useCounter(98, 2000, statsInView);
    const countService = useCounter(24, 2000, statsInView);

    const [impactRef, impactInView] = useInView({ threshold: 0.2, triggerOnce: true });

    const countIncome = useCounter(10164, 2500, impactInView);
    const countHours = useCounter(180, 2500, impactInView);
    const countLegal = useCounter(100, 2500, impactInView);

    return (
        <div className={styles.pageContainer}>
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
                    <div className={styles.heroCta}>
                        <button className={styles.brochureBtn}>
                            <FileText className={styles.btnIcon} />
                            {t.heroBtn}
                        </button>
                    </div>
                </div>
            </section>

            <section className={styles.priceCheckSection}>
                <div className={styles.container}>
                    <div className={styles.priceCheckGrid}>
                        <div className={styles.imageCol}>
                            <div className={styles.imageWrapper}>
                                <img
                                    src={rentoutImage}
                                    alt="Amsterdam Street"
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

                                    <form className={styles.calcForm}>
                                        <div className={styles.formGrid}>
                                            <div className={styles.fullWidth}>
                                                <label className={styles.label}>
                                                    <MapPin className={styles.labelIcon} /> {t.labelAddress} *
                                                </label>
                                                <input className={styles.input} placeholder="Damrak 123, Amsterdam" required />
                                            </div>
                                            <div>
                                                <label className={styles.label}>{t.labelPostal} *</label>
                                                <input className={styles.input} placeholder="1012 JS" required />
                                            </div>
                                            <div>
                                                <label className={styles.label}>{t.labelM2} *</label>
                                                <input type="number" className={styles.input} placeholder="85" required />
                                            </div>
                                        </div>

                                        <div className={styles.formGrid}>
                                            <div>
                                                <label className={styles.label}>{t.labelRooms} *</label>
                                                <div className={styles.selectWrapper}>
                                                    <select className={styles.select}>
                                                        <option value="1">1</option>
                                                        <option value="2">2</option>
                                                        <option value="3">3</option>
                                                        <option value="4">4</option>
                                                        <option value="5">5+</option>
                                                    </select>
                                                    <ChevronDown className={styles.selectIcon} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={styles.label}>{t.labelInterior} *</label>
                                                <div className={styles.selectWrapper}>
                                                    <select className={styles.select}>
                                                        <option value="shell">{t.optShell}</option>
                                                        <option value="unfurnished">{t.optUnfurnished}</option>
                                                        <option value="partlyFurnished">{t.optPartlyFurnished}</option>
                                                        <option value="furnished">{t.optFurnished}</option>
                                                    </select>
                                                    <ChevronDown className={styles.selectIcon} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={styles.formGrid}>
                                            <div>
                                                <label className={styles.label}>{t.labelCondition} *</label>
                                                <div className={styles.selectWrapper}>
                                                    <select className={styles.select}>
                                                        <option value="brandNew">{t.optNew}</option>
                                                        <option value="average">{t.optAverage}</option>
                                                        <option value="belowAverage">{t.optBelowAverage}</option>
                                                    </select>
                                                    <ChevronDown className={styles.selectIcon} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className={styles.label}>{t.labelName} *</label>
                                                <input className={styles.input} placeholder="First and last name" required />
                                            </div>
                                        </div>

                                        <div className={styles.formGrid}>
                                            <div>
                                                <label className={styles.label}>{t.labelEmail} *</label>
                                                <input type="email" className={styles.input} placeholder="your.email@example.com" required />
                                            </div>
                                            <div>
                                                <label className={styles.label}>{t.labelPhone} *</label>
                                                <input type="tel" className={styles.input} placeholder="+31 6 12345678" required />
                                            </div>
                                        </div>

                                        <button type="submit" className={styles.submitBtn}>
                                            <Calculator className={styles.btnIcon} />
                                            {t.btnCalculate}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

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
                                <img src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80" alt="Property Analysis" className={styles.stepImage} />
                                <div className={styles.floatBadgeTopRight}>
                                    <div className={styles.floatBadgeText}>+15%</div>
                                    <div className={styles.floatBadgeSub}>more value</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.stepRowReverse}>
                        <div className={styles.stepImageCol}>
                            <div className={styles.stepImageWrapper}>
                                <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80" alt="Marketing Magic" className={styles.stepImage} />
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
                                <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80" alt="Perfect Match" className={styles.stepImage} />
                                <div className={styles.floatBadgeTopRightGreen}>
                                    <div className={styles.floatBadgeText}>98%</div>
                                    <div className={styles.floatBadgeSub}>happy matches</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.numbersSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t.numbersTitle}</h2>
                        <p className={styles.sectionSubtitle}>{t.numbersSubtitle}</p>
                    </div>

                    <div className={styles.statsGrid} ref={statsRef}>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxOrange}>
                                <div className={styles.statValue}>€{countMonth}</div>
                            </div>
                            <h4 className={styles.statLabel}>{t.statMonth}</h4>
                            <p className={styles.statDesc}>{t.statMonthDesc}</p>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxGreen}>
                                <div className={styles.statValue}>{countDays}</div>
                            </div>
                            <h4 className={styles.statLabel}>{t.statDays}</h4>
                            <p className={styles.statDesc}>{t.statDaysDesc}</p>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxLightGreen}>
                                <div className={styles.statValue}>{countSat}%</div>
                            </div>
                            <h4 className={styles.statLabel}>{t.statSat}</h4>
                            <p className={styles.statDesc}>{t.statSatDesc}</p>
                        </div>
                        <div className={styles.statItem}>
                            <div className={styles.statIconBoxPurple}>
                                <div className={styles.statValue}>{countService}/7</div>
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
                                    <div className={styles.impactValueOrange}>€{countIncome.toLocaleString('de-DE')}</div>
                                    <div className={styles.impactLabel}>{t.impactIncome}</div>
                                </div>
                                <p className={styles.impactDesc}>{t.impactIncomeDesc}</p>
                            </div>
                            <div className={styles.impactItem}>
                                <div className={styles.impactBoxGreen}>
                                    <Calendar className={styles.impactIconGreen} />
                                    <div className={styles.impactValueGreen}>{countHours}</div>
                                    <div className={styles.impactLabel}>{t.impactHours}</div>
                                </div>
                                <p className={styles.impactDesc}>{t.impactHoursDesc}</p>
                            </div>
                            <div className={styles.impactItem}>
                                <div className={styles.impactBoxLightGreen}>
                                    <Shield className={styles.impactIconLightGreen} />
                                    <div className={styles.impactValueLightGreen}>{countLegal}%</div>
                                    <div className={styles.impactLabel}>{t.impactLegal}</div>
                                </div>
                                <p className={styles.impactDesc}>{t.impactLegalDesc}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.risksSection}>
                <div className={styles.container}>
                    <div className={styles.sectionHeader}>
                        <h2 className={styles.sectionTitle}>{t.risksTitle}</h2>
                        <p className={styles.sectionSubtitle}>{t.risksSubtitle}</p>
                    </div>

                    <div className={styles.risksGrid}>
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

            <section className={styles.finalSection}>
                <div className={styles.finalBg}></div>
                <div className={styles.container}>
                    <div className={styles.finalGrid}>
                        <div className={styles.finalContent}>
                            <h2 className={styles.finalTitle}>{t.finalTitle1} <span className={styles.textOrange}>{t.finalTitle2}</span></h2>
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
                                <form className={styles.finalForm}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>{t.formAddress}</label>
                                        <input className={styles.formInput} placeholder="e.g. Keizersgracht 123, Amsterdam" required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>{t.formPostal}</label>
                                        <input className={styles.formInput} placeholder="e.g. 1012 AB" required />
                                    </div>
                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>{t.formEmail}</label>
                                            <input type="email" className={styles.formInput} placeholder="your.email@example.com" required />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>{t.formPhone}</label>
                                            <input type="tel" className={styles.formInput} placeholder="+31 6 12345678" required />
                                        </div>
                                    </div>
                                    <button type="submit" className={styles.finalSubmitBtn}>
                                        <span>{t.formBtn}</span>
                                        <TrendingUp className={styles.btnIcon} />
                                    </button>
                                    <p className={styles.formDisclaimer}>{t.formDisclaimer}</p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default RentOut;
