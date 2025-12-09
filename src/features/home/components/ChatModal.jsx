import React, { useState, useEffect } from 'react';
import { CircleCheck, X, CheckCheck, Star, MapPin, Clock } from 'lucide-react';
import styles from './ChatModal.module.css';
import chatLogoImage from '../../../assets/chatlogo.png';

const ChatModal = ({ isOpen, onClose, data }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [visibleMessages, setVisibleMessages] = useState([]);

    useEffect(() => {
        if (isOpen && data) {
            // Reset state when modal opens
            setIsLoading(true);
            setVisibleMessages([]);

            // Show typing indicator for 1.5 seconds
            const loadingTimer = setTimeout(() => {
                setIsLoading(false);
                // Start showing messages one by one
                data.messages.forEach((msg, index) => {
                    setTimeout(() => {
                        setVisibleMessages(prev => [...prev, msg]);
                    }, index * 300); // 300ms delay between each message
                });
            }, 1500);

            return () => {
                clearTimeout(loadingTimer);
                setVisibleMessages([]);
            };
        }
    }, [isOpen, data]);

    if (!isOpen || !data) return null;

    return (
        <div className={styles.modalWrapper}>
            <div className={styles.modalOverlay} onClick={onClose}></div>
            <div className={styles.modalContainer}>
                <div className={styles.modalHeader}>
                    <div className={styles.modalAvatar}>
                        {data.avatar ? (
                            <img src={data.avatar} alt={data.name} />
                        ) : (
                            <div className={styles.modalAvatarPlaceholder}>
                                {data.avatarPlaceholder}
                            </div>
                        )}
                    </div>
                    <div className={styles.modalInfo}>
                        <div className={styles.modalNameRow}>
                            <h3 className={styles.modalName}>{data.name}</h3>
                            <CircleCheck className={styles.verifiedIcon} size={16} />
                        </div>
                        <div className={styles.modalStatusRow}>
                            <div className={styles.statusDot}></div>
                            <span className={styles.statusText}>Online</span>
                        </div>
                    </div>
                    <button className={styles.modalCloseBtn} onClick={onClose}>
                        <X size={24} className="text-gray-600" />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {isLoading && (
                        <div className={styles.messageRow}>
                            <div className={styles.messageAvatar}>
                                <img src={chatLogoImage} alt="ApartmentHub" />
                            </div>
                            <div className={`${styles.messageBubble} ${styles.left}`}>
                                <div className={styles.typingIndicator}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    )}
                    {visibleMessages.map((msg, index) => (
                        <div
                            key={index}
                            className={`${styles.messageRow} ${msg.type === 'received' ? styles.left : styles.right} ${styles.fadeIn}`}
                        >
                            {msg.type === 'received' && (
                                <div className={styles.messageAvatar}>
                                    <img src={chatLogoImage} alt="ApartmentHub" />
                                </div>
                            )}
                            <div className={`${styles.messageBubble} ${msg.type === 'received' ? styles.left : styles.right}`}>
                                <p className={styles.messageText}>{msg.text}</p>
                                <div className={styles.messageMeta}>
                                    <span className={styles.messageTime}>{msg.time}</span>
                                    {msg.type === 'sent' && <CheckCheck className={styles.checkIcon} />}
                                </div>
                            </div>
                            {msg.type === 'sent' && (
                                <div className={styles.modalAvatar} style={{ width: '2rem', height: '2rem', border: 'none' }}>
                                    {data.avatar ? (
                                        <img src={data.avatar} alt={data.name} style={{ borderRadius: '9999px' }} />
                                    ) : (
                                        <div className={styles.modalAvatarPlaceholder} style={{ fontSize: '0.75rem' }}>
                                            {data.avatarPlaceholder}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className={styles.modalFooter}>
                    <div className={styles.reviewStats}>
                        <div className={styles.statGroup}>
                            <Star className={styles.starIcon} size={16} />
                            <span className={styles.fontMedium}>{data.rating}/5</span>
                        </div>
                        <div className={styles.statGroup}>
                            <MapPin size={16} />
                            <span>{data.location}</span>
                        </div>
                        <div className={styles.statGroup}>
                            <Clock size={16} />
                            <span>{data.date}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatModal;
