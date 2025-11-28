import React from 'react';
import { useSelector } from 'react-redux';
import { FileText, House, Shield, Users, CheckCircle, Download, QrCode } from 'lucide-react';
import styles from './RentIn.module.css';
import { translations } from '../data/translations';

import rentalGuide from '../assets/amsterdam-rental-guide-2024.pdf';

const WhatsAppIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"></path>
    </svg>
);

const RentIn = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.rentIn[currentLang] || translations.rentIn.en;

    return (
        <div className={styles.pageContainer}>
            <section className={styles.heroSection}>
                <div className={styles.heroContainer}>
                    <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
                    <p className={styles.heroSubtitle}>
                        {t.heroSubtitle}
                    </p>
                </div>
            </section>

            <section className={styles.guideSection}>
                <div className={styles.container}>
                    <div className={styles.guideGrid}>
                        <div className={styles.guideContent}>
                            <div className={styles.freeDownloadBadge}>
                                <FileText className={styles.badgeIcon} />
                                <span className={styles.badgeText}>{t.guideBadge}</span>
                            </div>
                            <h2 className={styles.guideTitle}>{t.guideTitle}</h2>
                            <p className={styles.guideDesc}>
                                {t.guideDesc}
                            </p>

                            <div className={styles.featuresGrid}>
                                <div className={styles.featureItem}>
                                    <div className={styles.featureIconBox}>
                                        <House className={styles.featureIcon} />
                                    </div>
                                    <div>
                                        <h3 className={styles.featureTitle}>{t.feature1Title}</h3>
                                        <p className={styles.featureDesc}>{t.feature1Desc}</p>
                                    </div>
                                </div>
                                <div className={styles.featureItem}>
                                    <div className={styles.featureIconBox}>
                                        <Shield className={styles.featureIcon} />
                                    </div>
                                    <div>
                                        <h3 className={styles.featureTitle}>{t.feature2Title}</h3>
                                        <p className={styles.featureDesc}>{t.feature2Desc}</p>
                                    </div>
                                </div>
                                <div className={styles.featureItem}>
                                    <div className={styles.featureIconBox}>
                                        <Users className={styles.featureIcon} />
                                    </div>
                                    <div>
                                        <h3 className={styles.featureTitle}>{t.feature3Title}</h3>
                                        <p className={styles.featureDesc}>{t.feature3Desc}</p>
                                    </div>
                                </div>
                                <div className={styles.featureItem}>
                                    <div className={styles.featureIconBox}>
                                        <FileText className={styles.featureIcon} />
                                    </div>
                                    <div>
                                        <h3 className={styles.featureTitle}>{t.feature4Title}</h3>
                                        <p className={styles.featureDesc}>{t.feature4Desc}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.statsRow}>
                                <div className={styles.statBadge}>
                                    <CheckCircle className={styles.checkIcon} />
                                    <span>{t.statDownloads}</span>
                                </div>
                                <div className={styles.statBadge}>
                                    <CheckCircle className={styles.checkIcon} />
                                    <span>{t.statUpdated}</span>
                                </div>
                                <div className={styles.statBadge}>
                                    <CheckCircle className={styles.checkIcon} />
                                    <span>{t.statFree}</span>
                                </div>
                            </div>

                            <a
                                href={rentalGuide}
                                download="Amsterdam_Rental_Guide_2024.pdf"
                                className={styles.downloadBtn}
                            >
                                <div className={styles.btnContent}>
                                    <Download className={styles.btnIcon} />
                                    <span>{t.btnDownload}</span>
                                </div>
                            </a>
                        </div>

                        <div className={styles.guideVisual}>
                            <div className={styles.guideCard}>
                                <div className={styles.cardContent}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.headerBar}></div>
                                        <div className={styles.headerLine1}></div>
                                        <div className={styles.headerLine2}></div>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardRow}>
                                            <div className={styles.rowIconMyrtle}></div>
                                            <div className={styles.rowLine}></div>
                                        </div>
                                        <div className={styles.cardLines}>
                                            <div className={styles.lineFull}></div>
                                            <div className={styles.lineShort}></div>
                                            <div className={styles.lineMedium}></div>
                                        </div>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardRow}>
                                            <div className={styles.rowIconOrange}></div>
                                            <div className={styles.rowLine}></div>
                                        </div>
                                        <div className={styles.cardLines}>
                                            <div className={styles.lineFull}></div>
                                            <div className={styles.lineMedium}></div>
                                        </div>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className={styles.cardRow}>
                                            <div className={styles.rowIconMyrtle}></div>
                                            <div className={styles.rowLine}></div>
                                        </div>
                                        <div className={styles.cardLines}>
                                            <div className={styles.lineShort}></div>
                                            <div className={styles.lineFull}></div>
                                            <div className={styles.lineMedium}></div>
                                        </div>
                                    </div>
                                </div>
                                <div className={styles.pageCountBadge}>32 Pages</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.trustedSection}>
                <div className={styles.container}>
                    <h2 className={styles.trustedTitle}>{t.trustedTitle}</h2>
                    <p className={styles.trustedSubtitle}>{t.trustedSubtitle}</p>
                    <div className={styles.trustedGrid}>
                        <div className={styles.trustedCard}>
                            <div className={styles.trustedValue}>2884</div>
                            <div className={styles.trustedLabel}>{t.trustedStat1Label}</div>
                        </div>
                        <div className={styles.trustedCard}>
                            <div className={styles.trustedValue}>98%</div>
                            <div className={styles.trustedLabel}>{t.trustedStat2Label}</div>
                        </div>
                        <div className={styles.trustedCard}>
                            <div className={styles.trustedValue}>5/5</div>
                            <div className={styles.trustedLabel}>{t.trustedStat3Label}</div>
                        </div>
                        <div className={styles.trustedCard}>
                            <div className={styles.trustedValue}>24/7</div>
                            <div className={styles.trustedLabel}>{t.trustedStat4Label}</div>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.howItWorksSection}>
                <div className={styles.container}>
                    <h2 className={styles.howItWorksTitle}>{t.howItWorksTitle}</h2>
                    <div className={styles.howItWorksGrid}>
                        <div className={styles.howItWorksItem}>
                            <div className={styles.howItWorksIconBox}>
                                <WhatsAppIcon className={styles.howItWorksIcon} />
                            </div>
                            <h3 className={styles.howItWorksItemTitle}>{t.howItWorks1Title}</h3>
                            <p className={styles.howItWorksItemDesc}>{t.howItWorks1Desc}</p>
                        </div>
                        <div className={styles.howItWorksItem}>
                            <div className={styles.howItWorksIconBox}>
                                <svg className={styles.howItWorksIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                            </div>
                            <h3 className={styles.howItWorksItemTitle}>{t.howItWorks2Title}</h3>
                            <p className={styles.howItWorksItemDesc}>{t.howItWorks2Desc}</p>
                        </div>
                        <div className={styles.howItWorksItem}>
                            <div className={styles.howItWorksIconBox}>
                                <House className={styles.howItWorksIcon} />
                            </div>
                            <h3 className={styles.howItWorksItemTitle}>{t.howItWorks3Title}</h3>
                            <p className={styles.howItWorksItemDesc}>{t.howItWorks3Desc}</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className={styles.phoneSection}>
                <div className={styles.container}>
                    <h2 className={styles.phoneSectionTitle}>{t.phoneTitle}</h2>
                    <div className={styles.phoneGrid}>
                        <div className={styles.phoneWrapper}>
                            <div className={styles.phoneFrame}>
                                <div className={styles.phoneScreen}>
                                    <div className={styles.phoneHeader}>
                                        <div className={styles.phoneTime}>17:59</div>
                                        <div className={styles.phoneStatusIcons}>
                                            <div className={styles.signalDots}>
                                                <div className={styles.dotFull}></div>
                                                <div className={styles.dotFull}></div>
                                                <div className={styles.dotEmpty}></div>
                                                <div className={styles.dotEmpty}></div>
                                            </div>
                                            <div className={styles.batteryIcon}>
                                                <div className={styles.batteryLevel}></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.appHeader}>
                                        <div className={styles.appHeaderContent}>
                                            <div className={styles.backButton}>
                                                <svg className={styles.backIcon} fill="white" viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg>
                                            </div>
                                            <div className={styles.avatar}>AH</div>
                                            <div className={styles.chatInfo}>
                                                <p className={styles.chatName}>ApartmentHub New</p>
                                                <p className={styles.chatSub}>Apartment hub</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.chatArea}>
                                        <div className={styles.messageReceived}>
                                            <div className={styles.messageBubble}>
                                                <p className={styles.msgTextBold}>{t.phoneMockup.price}</p>
                                                <p className={styles.msgText}>{t.phoneMockup.bedrooms}</p>
                                                <p className={styles.msgText}>{t.phoneMockup.squareMeters}</p>
                                                <p className={styles.msgText}>{t.phoneMockup.additionalNote}</p>
                                                <p className={styles.msgText}>{t.phoneMockup.inPersonViewing}</p>
                                                <span className={styles.msgLink}>https://link.zoko.io/SzspHlj</span>
                                                <p className={styles.msgText}>{t.phoneMockup.facetimeViewing}</p>
                                                <span className={styles.msgLink}>https://link.zoko.io/SaWxZfH</span>
                                                <p className={styles.msgSub}>{t.phoneMockup.scheduleInstruction}</p>
                                                <p className={styles.msgTime}>17:28</p>
                                            </div>
                                        </div>

                                        <div className={styles.quickReplies}>
                                            <button className={styles.replyBtn}>{t.phoneMockup.quickReplyQuestions}</button>
                                            <button className={styles.replyBtn}>{t.phoneMockup.quickReplyUnsubscribe}</button>
                                        </div>

                                        <div className={styles.messageSent}>
                                            <div className={styles.sentBubble}>
                                                <p className={styles.msgTextWhite}>{t.phoneMockup.userReply}</p>
                                                <p className={styles.msgTimeWhite}>17:58 ✓✓</p>
                                            </div>
                                        </div>

                                        <div className={styles.messageReceived}>
                                            <div className={styles.messageBubble}>
                                                <p className={styles.msgText}>{t.phoneMockup.agentReply1}</p>
                                                <p className={styles.msgTime}>17:58</p>
                                            </div>
                                        </div>

                                        <div className={styles.messageSent}>
                                            <div className={styles.sentBubble}>
                                                <p className={styles.msgTextWhite}>{t.phoneMockup.userReply2}</p>
                                                <p className={styles.msgTimeWhite}>17:59 ✓✓</p>
                                            </div>
                                        </div>

                                        <div className={styles.messageReceived}>
                                            <div className={styles.messageBubble}>
                                                <p className={styles.msgText}>{t.phoneMockup.agentReply2}</p>
                                                <p className={styles.msgTime}>17:59</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.inputArea}>
                                        <div className={styles.inputPlus}>+</div>
                                        <div className={styles.inputField}>Message</div>
                                        <div className={styles.inputIcon}></div>
                                        <div className={styles.inputIcon}></div>
                                    </div>

                                    <div className={styles.homeIndicator}></div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.phoneContent}>
                            <h3 className={styles.contentTitle}>{t.phoneContentTitle}</h3>
                            <p className={styles.contentDesc}>{t.phoneContentDesc}</p>

                            <ul className={styles.benefitsList}>
                                <li className={styles.benefitItem}>
                                    <CheckCircle className={styles.benefitIcon} />
                                    <span>{t.phoneBenefit1}</span>
                                </li>
                                <li className={styles.benefitItem}>
                                    <CheckCircle className={styles.benefitIcon} />
                                    <span>{t.phoneBenefit2}</span>
                                </li>
                                <li className={styles.benefitItem}>
                                    <CheckCircle className={styles.benefitIcon} />
                                    <span>{t.phoneBenefit3}</span>
                                </li>
                            </ul>

                            <div className={styles.qrCard}>
                                <div className={styles.qrRow}>
                                    <div className={styles.qrBox}>
                                        <QrCode className={styles.qrIcon} />
                                    </div>
                                    <div>
                                        <h4 className={styles.qrTitle}>{t.qrTitle}</h4>
                                        <p className={styles.qrDesc}>{t.qrDesc}</p>
                                    </div>
                                </div>
                            </div>

                            <a
                                href="https://api.whatsapp.com/send/?phone=31658975449&text&type=phone_number&app_absent=0"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.whatsappBtn}
                            >
                                <WhatsAppIcon className={styles.whatsappIcon} />
                                <span>{t.btnWhatsapp}</span>
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            <a
                href="https://api.whatsapp.com/send/?phone=31658975449&text&type=phone_number&app_absent=0"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.floatingWhatsapp}
            >
                <WhatsAppIcon className={styles.floatingIcon} />
            </a>
        </div>
    );
};

export default RentIn;
