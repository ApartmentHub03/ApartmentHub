import React from 'react';
import { CheckCircle, QrCode } from 'lucide-react';
import styles from '../../pages/RentIn.module.css';
import { trackWhatsAppClick } from '../../utils/analytics';

const WhatsAppIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"></path>
    </svg>
);

const WhatsAppMockupSection = ({ translations, onWhatsAppClick }) => {
    const t = translations;

    return (
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
                                            <svg className={styles.backIcon} fill="white" viewBox="0 0 24 24">
                                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
                                            </svg>
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
                                        <button className={styles.replyBtn}>{"< "}{t.phoneMockup.quickReplyQuestions}</button>
                                        <button className={styles.replyBtn}>{"< "}{t.phoneMockup.quickReplyUnsubscribe}</button>
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
                            onClick={() => { trackWhatsAppClick('mockup_section'); onWhatsAppClick?.(); }}
                        >
                            <WhatsAppIcon className={styles.whatsappIcon} />
                            <span>{t.btnWhatsapp}</span>
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WhatsAppMockupSection;
