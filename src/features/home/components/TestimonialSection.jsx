import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Users, Star, Clock, CircleCheck, MapPin, CheckCheck, MessageCircle, X } from 'lucide-react';
import styles from './TestimonialSection.module.css';
import { translations } from '../../../data/translations';
import chatLogoImage from '../../../assets/chatlogo.png';
import ChatModal from './ChatModal';

const TestimonialSection = () => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.home[currentLang] || translations.home.en;
    const [selectedChat, setSelectedChat] = useState(null);

    const handleCardClick = (chatData) => {
        setSelectedChat(chatData);
    };

    const closeChat = () => {
        setSelectedChat(null);
    };

    // Preview messages for cards
    const robertPreview = {
        en: {
            received: "🎉 Good news about your property!",
            sent: "Wow that's fast! 🎉",
            time: "Now",
            messageCount: "10 messages"
        },
        nl: {
            received: "🎉 Goed nieuws over je woning!",
            sent: "Wauw dat is snel! 🎉",
            time: "Nu",
            messageCount: "10 berichten"
        }
    };

    const robertData = {
        name: "Robert van Dijk",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face",
        location: "Jordaan",
        date: "December 2024",
        rating: 5,
        messages: [
            { type: 'received', text: "Robert, good news! Your apartment is rented 🎉", time: "09:15" },
            { type: 'sent', text: "What?? Really??", time: "09:16" },
            { type: 'sent', text: "That's fast... didn't expect it to go so smoothly", time: "09:17" },
            { type: 'received', text: "Yes within 3 days! They even offered €50 above asking price. Contract will be signed tomorrow 👍", time: "09:18" },
            { type: 'sent', text: "above asking price??? Wow!!", time: "09:18" },
            { type: 'received', text: "Screening is also good - permanent job, good references", time: "09:19" },
            { type: 'sent', text: "That's really great! I was so stressed after that previous agent who did nothing for 2 months 😒", time: "09:21" },
            { type: 'received', text: "We hear that a lot... glad we could help!", time: "09:23" },
            { type: 'sent', text: "Definitely! I'm going to tell everyone about you", time: "09:25" },
            { type: 'sent', text: "This is how renting should be - no stress, just results", time: "09:26" }
        ]
    };

    const mariaPreview = {
        en: {
            received: "🎉 Good news about your property!",
            sent: "All 4?? Fantastic! 💪",
            time: "Now",
            messageCount: "13 messages"
        },
        nl: {
            received: "🎉 Goed nieuws over je woning!",
            sent: "Alle 4?? Fantastisch! 💪",
            time: "Nu",
            messageCount: "13 berichten"
        }
    };

    const mariaMessages = {
        en: [
            { type: 'received', text: "Maria, update on your portfolio: all 4 properties are now rented! 🏠🏠🏠🏠", time: "14:30" },
            { type: 'sent', text: "All 4?? Seriously??", time: "14:31" },
            { type: 'received', text: "The last apartment in De Pijp was rented today", time: "14:31", sender: "ApartmentHub" },
            { type: 'sent', text: "That's fantastic! I'm really impressed by your professionalism...", time: "14:33" },
            { type: 'sent', text: "Other agents had been stringing me along for months", time: "14:34" },
            { type: 'received', text: "All at top price: €1850, €2100, €1950 and €2300", time: "14:35", sender: "ApartmentHub" },
            { type: 'received', text: "Total €8200 per month! All tenants are screened and have permanent contracts", time: "14:36", sender: "ApartmentHub" },
            { type: 'sent', text: "8200??? Wow that's more than I hoped for", time: "14:37" },
            { type: 'sent', text: "This is exactly what I needed! Finally an agent who understands how to work with investors", time: "14:39" },
            { type: 'sent', text: "The monthly reports are also super useful btw", time: "14:40" },
            { type: 'received', text: "Great! We'll keep you informed of everything. How do you like the portfolio management service?", time: "14:42", sender: "ApartmentHub" },
            { type: 'sent', text: "Excellent! Transparent communication, low vacancy, quality tenants...", time: "14:44" },
            { type: 'sent', text: "this is really how it should be. I'll definitely recommend you", time: "14:45" }
        ],
        nl: [
            { type: 'received', text: "Maria, update over je portfolio: alle 4 panden zijn nu verhuurd! 🏠🏠🏠🏠", time: "14:30" },
            { type: 'sent', text: "Alle 4?? Serieus??", time: "14:31" },
            { type: 'received', text: "Het laatste appartement in De Pijp is vandaag gegaan", time: "14:31", sender: "ApartmentHub" },
            { type: 'sent', text: "Dat is fantastisch! Ik ben echt onder de indruk van jullie professionaliteit...", time: "14:33" },
            { type: 'sent', text: "Andere makelaars hadden me maanden aan het lijntje gehouden", time: "14:34" },
            { type: 'received', text: "Fijn dat we konden helpen. Kun je het laatste contract nog ondertekenen? Dan zal de check in van dat appartement plaats vinden en zijn we klaar.", time: "14:35", sender: "ApartmentHub" }
        ]
    };

    const mariaData = {
        name: "Maria Santos",
        avatarPlaceholder: "MS",
        location: "De Pijp",
        date: "November 2024",
        rating: 5,
        messages: mariaMessages[currentLang] || mariaMessages.en
    };

    const janPreview = {
        en: {
            received: "🎉 Good news about your property!",
            sent: "Really?! Omg 😊",
            time: "Now",
            messageCount: "13 messages"
        },
        nl: {
            received: "🎉 Goed nieuws over je woning!",
            sent: "Echt waar?! Omg 😊",
            time: "Nu",
            messageCount: "13 berichten"
        }
    };

    const janMessages = {
        en: [
            { type: 'received', text: "Jan Willem, your apartment in Noord is rented! 🎉", time: "16:45" },
            { type: 'sent', text: "Really?! Omg I can't believe it", time: "16:46" },
            { type: 'received', text: "The young couple will sign the contract on Tuesday for €1650 per month", time: "16:47", sender: "ApartmentHub" },
            { type: 'sent', text: "I'm so relieved... I was really afraid I would make mistakes as a beginner", time: "16:49" },
            { type: 'sent', text: "You guys have been so helpful!", time: "16:50" },
            { type: 'received', text: "You did it perfectly! All documents are in order, rent price is market conform", time: "16:52", sender: "ApartmentHub" },
            { type: 'received', text: "And the tenants are well screened. Your uncle would have been proud ❤️", time: "16:53", sender: "ApartmentHub" },
            { type: 'sent', text: "Thank you, that means a lot to me...", time: "16:55" },
            { type: 'sent', text: "Without your guidance I never would have dared to do this", time: "16:56" },
            { type: 'sent', text: "You've really made renting accessible", time: "16:57" },
            { type: 'received', text: "That's what we're here for! Do you feel more confident about the whole rental process now?", time: "16:59", sender: "ApartmentHub" },
            { type: 'sent', text: "Absolutely! From complete beginner to confident landlord in just a few weeks", time: "17:01" },
            { type: 'sent', text: "I wouldn't know how I would have managed without you", time: "17:02" }
        ],
        nl: [
            { type: 'received', text: "🎉 Goed nieuws over je woning!", time: "Nu" },
            { type: 'sent', text: "Echt waar?! Omg 😊", time: "Nu" }
        ]
    };

    const janData = {
        name: "Jan Willem Bakker",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face",
        location: "Noord",
        date: "Oktober 2024",
        rating: 5,
        messages: janMessages[currentLang] || janMessages.en
    };

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                {/* Stats Row */}
                <div className={styles.statsRow}>
                    <div className={styles.statItem}>
                        <Users className={styles.statIconMyrtle} />
                        <span className={styles.statText}>{t.testimonialsStatsLandlords}</span>
                    </div>
                    <div className={styles.statItem}>
                        <Star className={styles.statIconOrange} />
                        <span className={styles.statText}>{t.testimonialsStatsRating}</span>
                    </div>
                    <div className={styles.statItem}>
                        <Clock className={styles.statIconGreen} />
                        <span className={styles.statText}>{t.testimonialsStatsTime}</span>
                    </div>
                </div>

                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>{t.testimonialsTitle}</h2>
                    <p className={styles.subtitle}>{t.testimonialsSubtitle}</p>
                    <p className={styles.helperText}>{t.testimonialsHelper}</p>
                </div>

                {/* Grid */}
                <div className={styles.grid}>
                    {/* Card 1: Robert van Dijk */}
                    <div className={styles.card} onClick={() => handleCardClick(robertData)}>
                        <div className={styles.cardHeader}>
                            <div className={styles.userInfo}>
                                <span className={styles.avatar}>
                                    <img className={styles.avatarImg} alt="Robert van Dijk" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face" />
                                </span>
                                <div className={styles.userDetails}>
                                    <div className={styles.userNameWrapper}>
                                        <h3 className={styles.userName}>Robert van Dijk</h3>
                                        <CircleCheck className={styles.verifiedIcon} />
                                    </div>
                                    <div className={styles.statusWrapper}>
                                        <div className={styles.statusDot}></div>
                                        <span className={styles.statusText}>Online</span>
                                    </div>
                                    <div className={styles.locationWrapper}>
                                        <MapPin className={styles.locationIcon} />
                                        <span className={styles.locationText}>Jordaan</span>
                                    </div>
                                </div>
                                <div className={styles.ratingWrapper}>
                                    <Star className={styles.ratingIcon} />
                                    <span className={styles.ratingText}>5</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.messageReceived}>
                                <div className={styles.messageAvatar}>
                                    <img src={chatLogoImage} alt="ApartmentHub" className={styles.messageAvatarImg} />
                                </div>
                                <div className={styles.messageBubbleReceived}>
                                    <p className={styles.messageText}>{robertPreview[currentLang]?.received}</p>
                                    <div className={styles.messageMeta}>
                                        <span className={styles.messageTime}>{robertPreview[currentLang]?.time}</span>
                                        <CheckCheck className={styles.readIcon} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.messageSent}>
                                <div className={styles.messageBubbleSent}>
                                    <p className={styles.messageTextWhite}>{robertPreview[currentLang]?.sent}</p>
                                    <div className={styles.messageMetaEnd}>
                                        <span className={styles.messageTimeWhite}>{robertPreview[currentLang]?.time}</span>
                                        <CheckCheck className={styles.readIconWhite} />
                                    </div>
                                </div>
                                <span className={styles.avatarSmall}>
                                    <img className={styles.avatarImg} alt="Robert van Dijk" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face" />
                                </span>
                            </div>
                            <div className={styles.cardFooter}>
                                <div className={styles.footerItem}>
                                    <MessageCircle className={styles.footerIcon} />
                                    <span className={styles.footerText}>{robertPreview[currentLang]?.messageCount}</span>
                                </div>
                                <div className={styles.footerItem}>
                                    <Clock className={styles.footerIcon} />
                                    <span className={styles.footerText}>December 2024</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.hoverOverlay}></div>
                    </div>

                    {/* Card 2: Maria Santos */}
                    <div className={styles.card} onClick={() => handleCardClick(mariaData)}>
                        <div className={styles.cardHeader}>
                            <div className={styles.userInfo}>
                                <span className={styles.avatar}>
                                    <span className={styles.avatarPlaceholder}>MS</span>
                                </span>
                                <div className={styles.userDetails}>
                                    <div className={styles.userNameWrapper}>
                                        <h3 className={styles.userName}>Maria Santos</h3>
                                        <CircleCheck className={styles.verifiedIcon} />
                                    </div>
                                    <div className={styles.statusWrapper}>
                                        <div className={styles.statusDot}></div>
                                        <span className={styles.statusText}>Online</span>
                                    </div>
                                    <div className={styles.locationWrapper}>
                                        <MapPin className={styles.locationIcon} />
                                        <span className={styles.locationText}>De Pijp</span>
                                    </div>
                                </div>
                                <div className={styles.ratingWrapper}>
                                    <Star className={styles.ratingIcon} />
                                    <span className={styles.ratingText}>5</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.messageReceived}>
                                <div className={styles.messageAvatar}>
                                    <img src={chatLogoImage} alt="ApartmentHub" className={styles.messageAvatarImg} />
                                </div>
                                <div className={styles.messageBubbleReceived}>
                                    <p className={styles.messageText}>{mariaPreview[currentLang]?.received}</p>
                                    <div className={styles.messageMeta}>
                                        <span className={styles.messageTime}>{mariaPreview[currentLang]?.time}</span>
                                        <CheckCheck className={styles.readIcon} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.messageSent}>
                                <div className={styles.messageBubbleSent}>
                                    <p className={styles.messageTextWhite}>{mariaPreview[currentLang]?.sent}</p>
                                    <div className={styles.messageMetaEnd}>
                                        <span className={styles.messageTimeWhite}>{mariaPreview[currentLang]?.time}</span>
                                        <CheckCheck className={styles.readIconWhite} />
                                    </div>
                                </div>
                                <span className={styles.avatarSmall}>
                                    <span className={styles.avatarPlaceholderSmall}>MS</span>
                                </span>
                            </div>
                            <div className={styles.cardFooter}>
                                <div className={styles.footerItem}>
                                    <MessageCircle className={styles.footerIcon} />
                                    <span className={styles.footerText}>{mariaPreview[currentLang]?.messageCount}</span>
                                </div>
                                <div className={styles.footerItem}>
                                    <Clock className={styles.footerIcon} />
                                    <span className={styles.footerText}>November 2024</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.hoverOverlay}></div>
                    </div>

                    {/* Card 3: Jan Willem Bakker */}
                    <div className={styles.card} onClick={() => handleCardClick(janData)}>
                        <div className={styles.cardHeader}>
                            <div className={styles.userInfo}>
                                <span className={styles.avatar}>
                                    <img className={styles.avatarImg} alt="Jan Willem Bakker" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face" />
                                </span>
                                <div className={styles.userDetails}>
                                    <div className={styles.userNameWrapper}>
                                        <h3 className={styles.userName}>Jan Willem Bakker</h3>
                                        <CircleCheck className={styles.verifiedIcon} />
                                    </div>
                                    <div className={styles.statusWrapper}>
                                        <div className={styles.statusDot}></div>
                                        <span className={styles.statusText}>Online</span>
                                    </div>
                                    <div className={styles.locationWrapper}>
                                        <MapPin className={styles.locationIcon} />
                                        <span className={styles.locationText}>Noord</span>
                                    </div>
                                </div>
                                <div className={styles.ratingWrapper}>
                                    <Star className={styles.ratingIcon} />
                                    <span className={styles.ratingText}>5</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.cardBody}>
                            <div className={styles.messageReceived}>
                                <div className={styles.messageAvatar}>
                                    <img src={chatLogoImage} alt="ApartmentHub" className={styles.messageAvatarImg} />
                                </div>
                                <div className={styles.messageBubbleReceived}>
                                    <p className={styles.messageText}>{janPreview[currentLang]?.received}</p>
                                    <div className={styles.messageMeta}>
                                        <span className={styles.messageTime}>{janPreview[currentLang]?.time}</span>
                                        <CheckCheck className={styles.readIcon} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.messageSent}>
                                <div className={styles.messageBubbleSent}>
                                    <p className={styles.messageTextWhite}>{janPreview[currentLang]?.sent}</p>
                                    <div className={styles.messageMetaEnd}>
                                        <span className={styles.messageTimeWhite}>{janPreview[currentLang]?.time}</span>
                                        <CheckCheck className={styles.readIconWhite} />
                                    </div>
                                </div>
                                <span className={styles.avatarSmall}>
                                    <img className={styles.avatarImg} alt="Jan Willem Bakker" src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face" />
                                </span>
                            </div>
                            <div className={styles.cardFooter}>
                                <div className={styles.footerItem}>
                                    <MessageCircle className={styles.footerIcon} />
                                    <span className={styles.footerText}>{janPreview[currentLang]?.messageCount}</span>
                                </div>
                                <div className={styles.footerItem}>
                                    <Clock className={styles.footerIcon} />
                                    <span className={styles.footerText}>Oktober 2024</span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.hoverOverlay}></div>
                    </div>
                </div>

                {/* CTA */}
                <div className={styles.ctaContainer}>
                    <p className={styles.ctaText}>{t.testimonialsCtaText}</p>
                    <div className={styles.ctaButtons}>
                        <Link to={currentLang === 'nl' ? "/nl/rent-out" : "/en/rent-out"} className={styles.ctaBtn}>{t.testimonialsCtaLandlord}</Link>
                        <Link to={currentLang === 'nl' ? "/nl/rent-in" : "/en/rent-in"} className={styles.ctaBtn}>{t.testimonialsCtaTenant}</Link>
                    </div>
                </div>
            </div>
            {selectedChat && (
                <ChatModal
                    isOpen={!!selectedChat}
                    onClose={closeChat}
                    data={selectedChat}
                />
            )}
        </section>
    );
};

export default TestimonialSection;
