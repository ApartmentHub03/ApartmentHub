import React, { useState } from 'react';
import { CircleCheck, X, CheckCheck, Star, MapPin, Clock } from 'lucide-react';
import styles from './ChatWidget.module.css';
import logoImage from '../../../assets/5a9afd14-27a5-40d8-a185-fac727f64fdf.png';
import chatLogoImage from '../../../assets/chatlogo.png';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    const robertImage = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face";

    if (!isOpen) {
        return (
            <div className={styles.widgetContainer}>
                <div className={styles.triggerCard} onClick={toggleChat}>
                    <div className={styles.triggerAvatar}>
                        <img src={robertImage} alt="Robert van Dijk" />
                        <div className={styles.logoBadge}>
                            <img src={chatLogoImage} alt="ApartmentHub" />
                        </div>
                    </div>
                    <div className={styles.triggerContent}>
                        <div className={styles.triggerHeader}>
                            <h3 className={styles.triggerName}>Robert van Dijk</h3>
                            <CircleCheck className={styles.triggerVerified} size={16} />
                        </div>
                        <div className={styles.triggerStatus}>
                            <div className={styles.statusDot}></div>
                            <span className={styles.statusText}>Online</span>
                        </div>
                    </div>
                    <button className={styles.closeButton} onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}>
                        <X size={20} />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalWrapper}>
            <div className={styles.modalOverlay} onClick={toggleChat}></div>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalAvatar}>
                        <img src={robertImage} alt="Robert van Dijk" />
                    </div>
                    <div className={styles.modalInfo}>
                        <div className={styles.modalNameRow}>
                            <h3 className={styles.modalName}>Robert van Dijk</h3>
                            <CircleCheck className={styles.triggerVerified} size={16} />
                        </div>
                        <div className={styles.modalStatusRow}>
                            <div className={styles.statusDot}></div>
                            <span className={styles.statusText}>Online</span>
                        </div>
                    </div>
                    <button className={styles.modalCloseBtn} onClick={toggleChat}>
                        <X size={24} className="text-gray-600" />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {/* Message 1: Agent */}
                    <div className={`${styles.messageRow} ${styles.left}`} style={{ animationDelay: '0s' }}>
                        <div className={styles.messageAvatar}>
                            <img src={logoImage} alt="ApartmentHub" />
                        </div>
                        <div className={`${styles.messageBubble} ${styles.left}`}>
                            <p className={styles.messageText}>Robert, good news! Your apartment is rented 🎉</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:15</span>
                            </div>
                        </div>
                    </div>

                    {/* Message 2: User */}
                    <div className={`${styles.messageRow} ${styles.right}`} style={{ animationDelay: '0.1s' }}>
                        <div className={`${styles.messageBubble} ${styles.right}`}>
                            <p className={styles.messageText}>What?? Really??</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:16</span>
                                <CheckCheck className={styles.checkIcon} />
                            </div>
                        </div>
                        <div className={styles.modalAvatar} style={{ width: '2rem', height: '2rem', border: 'none' }}>
                            <img src={robertImage} alt="Robert" style={{ borderRadius: '9999px' }} />
                        </div>
                    </div>

                    {/* Message 3: User */}
                    <div className={`${styles.messageRow} ${styles.right}`} style={{ animationDelay: '0.2s' }}>
                        <div className={`${styles.messageBubble} ${styles.right}`}>
                            <p className={styles.messageText}>That's fast... didn't expect it to go so smoothly</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:17</span>
                                <CheckCheck className={styles.checkIcon} />
                            </div>
                        </div>
                        <div className={styles.modalAvatar} style={{ width: '2rem', height: '2rem', border: 'none' }}>
                            <img src={robertImage} alt="Robert" style={{ borderRadius: '9999px' }} />
                        </div>
                    </div>

                    {/* Message 4: Agent */}
                    <div className={`${styles.messageRow} ${styles.left}`} style={{ animationDelay: '0.3s' }}>
                        <div className={styles.messageAvatar}>
                            <img src={logoImage} alt="ApartmentHub" />
                        </div>
                        <div className={`${styles.messageBubble} ${styles.left}`}>
                            <p className={styles.messageText}>Yes within 3 days! They even offered €50 above asking price. Contract will be signed tomorrow 👍</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:18</span>
                            </div>
                        </div>
                    </div>

                    {/* Message 5: User */}
                    <div className={`${styles.messageRow} ${styles.right}`} style={{ animationDelay: '0.4s' }}>
                        <div className={`${styles.messageBubble} ${styles.right}`}>
                            <p className={styles.messageText}>above asking price??? Wow!!</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:18</span>
                                <CheckCheck className={styles.checkIcon} />
                            </div>
                        </div>
                        <div className={styles.modalAvatar} style={{ width: '2rem', height: '2rem', border: 'none' }}>
                            <img src={robertImage} alt="Robert" style={{ borderRadius: '9999px' }} />
                        </div>
                    </div>

                    {/* Message 6: Agent */}
                    <div className={`${styles.messageRow} ${styles.left}`} style={{ animationDelay: '0.5s' }}>
                        <div className={styles.messageAvatar}>
                            <img src={logoImage} alt="ApartmentHub" />
                        </div>
                        <div className={`${styles.messageBubble} ${styles.left}`}>
                            <p className={styles.messageText}>Screening is also good - permanent job, good references</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:19</span>
                            </div>
                        </div>
                    </div>

                    {/* Message 7: User */}
                    <div className={`${styles.messageRow} ${styles.right}`} style={{ animationDelay: '0.6s' }}>
                        <div className={`${styles.messageBubble} ${styles.right}`}>
                            <p className={styles.messageText}>That's really great! I was so stressed after that previous agent who did nothing for 2 months 😒</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:21</span>
                                <CheckCheck className={styles.checkIcon} />
                            </div>
                        </div>
                        <div className={styles.modalAvatar} style={{ width: '2rem', height: '2rem', border: 'none' }}>
                            <img src={robertImage} alt="Robert" style={{ borderRadius: '9999px' }} />
                        </div>
                    </div>

                    {/* Message 8: Agent */}
                    <div className={`${styles.messageRow} ${styles.left}`} style={{ animationDelay: '0.7s' }}>
                        <div className={styles.messageAvatar}>
                            <img src={logoImage} alt="ApartmentHub" />
                        </div>
                        <div className={`${styles.messageBubble} ${styles.left}`}>
                            <p className={styles.messageText}>We hear that a lot... glad we could help!</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:23</span>
                            </div>
                        </div>
                    </div>

                    {/* Message 9: User */}
                    <div className={`${styles.messageRow} ${styles.right}`} style={{ animationDelay: '0.8s' }}>
                        <div className={`${styles.messageBubble} ${styles.right}`}>
                            <p className={styles.messageText}>Definitely! I'm going to tell everyone about you</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:25</span>
                                <CheckCheck className={styles.checkIcon} />
                            </div>
                        </div>
                        <div className={styles.modalAvatar} style={{ width: '2rem', height: '2rem', border: 'none' }}>
                            <img src={robertImage} alt="Robert" style={{ borderRadius: '9999px' }} />
                        </div>
                    </div>

                    {/* Message 10: User */}
                    <div className={`${styles.messageRow} ${styles.right}`} style={{ animationDelay: '0.9s' }}>
                        <div className={`${styles.messageBubble} ${styles.right}`}>
                            <p className={styles.messageText}>This is how renting should be - no stress, just results</p>
                            <div className={styles.messageMeta}>
                                <span className={styles.messageTime}>09:26</span>
                                <CheckCheck className={styles.checkIcon} />
                            </div>
                        </div>
                        <div className={styles.modalAvatar} style={{ width: '2rem', height: '2rem', border: 'none' }}>
                            <img src={robertImage} alt="Robert" style={{ borderRadius: '9999px' }} />
                        </div>
                    </div>
                </div>

                <div className={styles.modalFooter}>
                    <div className={styles.reviewStats}>
                        <div className={styles.statGroup}>
                            <Star className={styles.starIcon} size={16} />
                            <span className={styles.fontMedium}>5/5</span>
                        </div>
                        <div className={styles.statGroup}>
                            <MapPin size={16} />
                            <span>Jordaan</span>
                        </div>
                        <div className={styles.statGroup}>
                            <Clock size={16} />
                            <span>December 2024</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatWidget;
