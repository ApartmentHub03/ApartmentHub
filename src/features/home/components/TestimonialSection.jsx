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

    const mariaData = {
        name: "Maria Santos",
        avatarPlaceholder: "MS",
        location: "De Pijp",
        date: "November 2024",
        rating: 5,
        messages: [
            { type: 'received', text: "🎉 Goed nieuws over je woning!", time: "Nu" },
            { type: 'sent', text: "Alle 4?? Fantastisch! 💪", time: "Nu" }
        ]
    };

    const janData = {
        name: "Jan Willem Bakker",
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=600&fit=crop&crop=face",
        location: "Noord",
        date: "Oktober 2024",
        rating: 5,
        messages: [
            { type: 'received', text: "🎉 Goed nieuws over je woning!", time: "Nu" },
            { type: 'sent', text: "Echt waar?! Omg 😊", time: "Nu" }
        ]
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
                                    <p className={styles.messageText}>🎉 Goed nieuws over je woning!</p>
                                    <div className={styles.messageMeta}>
                                        <span className={styles.messageTime}>Nu</span>
                                        <CheckCheck className={styles.readIcon} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.messageSent}>
                                <div className={styles.messageBubbleSent}>
                                    <p className={styles.messageTextWhite}>Wauw dat is snel! 🎉</p>
                                    <div className={styles.messageMetaEnd}>
                                        <span className={styles.messageTimeWhite}>Nu</span>
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
                                    <span className={styles.footerText}>10 berichten</span>
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
                                    <p className={styles.messageText}>🎉 Goed nieuws over je woning!</p>
                                    <div className={styles.messageMeta}>
                                        <span className={styles.messageTime}>Nu</span>
                                        <CheckCheck className={styles.readIcon} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.messageSent}>
                                <div className={styles.messageBubbleSent}>
                                    <p className={styles.messageTextWhite}>Alle 4?? Fantastisch! 💪</p>
                                    <div className={styles.messageMetaEnd}>
                                        <span className={styles.messageTimeWhite}>Nu</span>
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
                                    <span className={styles.footerText}>13 berichten</span>
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
                                    <p className={styles.messageText}>🎉 Goed nieuws over je woning!</p>
                                    <div className={styles.messageMeta}>
                                        <span className={styles.messageTime}>Nu</span>
                                        <CheckCheck className={styles.readIcon} />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.messageSent}>
                                <div className={styles.messageBubbleSent}>
                                    <p className={styles.messageTextWhite}>Echt waar?! Omg 😊</p>
                                    <div className={styles.messageMetaEnd}>
                                        <span className={styles.messageTimeWhite}>Nu</span>
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
                                    <span className={styles.footerText}>13 berichten</span>
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
