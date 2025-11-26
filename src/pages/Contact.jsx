import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Mail, Phone, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useForm } from '../hooks/useForm';
import styles from './Contact.module.css';
import { translations } from '../data/translations';

const Contact = () => {
    const { register, handleSubmit, status, error, reset } = useForm();
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.contact[currentLang] || translations.contact.en;

    useEffect(() => {
        return () => {
            reset();
        };
    }, []);

    return (
        <div className={styles.page}>
            <section className={styles.heroSection}>
                <div className={styles.heroContainer}>
                    <h1 className={styles.heroTitle}>{t.heroTitle}</h1>
                    <p className={styles.heroSubtitle}>
                        {t.heroSubtitle}
                    </p>
                </div>
            </section>

            <section className={styles.contentSection}>
                <div className={styles.contentContainer}>
                    <div className={styles.grid}>
                        <div>
                            <h2 className={styles.formTitle}>{t.formTitle}</h2>
                            {status === 'success' ? (
                                <div className={styles.successMessage}>
                                    <CheckCircle size={48} className={styles.successIcon} />
                                    <h3>{t.successTitle}</h3>
                                    <p>{t.successText}</p>
                                    <button onClick={reset} className={styles.resetBtn}>
                                        {t.btnReset}
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className={styles.form}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">{t.labelName}</label>
                                        <input
                                            id="name"
                                            type="text"
                                            {...register('name')}
                                            placeholder={t.placeholderName}
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="email">{t.labelEmail}</label>
                                        <input
                                            id="email"
                                            type="email"
                                            {...register('email')}
                                            placeholder={t.placeholderEmail}
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="message">{t.labelMessage}</label>
                                        <textarea
                                            id="message"
                                            {...register('message')}
                                            placeholder={t.placeholderMessage}
                                            rows={6}
                                            required
                                        />
                                    </div>

                                    {status === 'error' && (
                                        <div className={styles.errorMessage}>
                                            <AlertCircle size={16} />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        className={styles.submitBtn}
                                        disabled={status === 'loading'}
                                    >
                                        {status === 'loading' ? t.btnSending : t.btnSubmit}
                                    </button>
                                </form>
                            )}
                        </div>

                        <div className={styles.infoCard}>
                            <h3 className={styles.infoTitle}>{t.infoTitle}</h3>
                            <div className={styles.infoList}>
                                <div className={styles.infoItem}>
                                    <div className={`${styles.iconWrapper} ${styles.email}`}>
                                        <Mail className={styles.icon} />
                                    </div>
                                    <div className={styles.infoContent}>
                                        <h4>{t.infoEmailTitle}</h4>
                                        <p>hello@apartmenthub.com</p>
                                        <p className={styles.subtext}>{t.infoEmailText}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={`${styles.iconWrapper} ${styles.whatsapp}`}>
                                        <Phone className={styles.icon} />
                                    </div>
                                    <div className={styles.infoContent}>
                                        <h4>{t.infoWhatsappTitle}</h4>
                                        <p>+31 6 58 97 54 49</p>
                                        <p className={styles.subtext}>{t.infoWhatsappText}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={`${styles.iconWrapper} ${styles.office}`}>
                                        <MapPin className={styles.icon} />
                                    </div>
                                    <div className={styles.infoContent}>
                                        <h4>{t.infoOfficeTitle}</h4>
                                        <p>Amsterdam, Netherlands</p>
                                        <p className={styles.subtext}>{t.infoOfficeText}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.socials}>
                                <h4 className={styles.socialsTitle}>{t.socialsTitle}</h4>
                                <div className={styles.socialLinks}>
                                    <a
                                        href="https://instagram.com/apartmenthub"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.socialLink}
                                    >
                                        Instagram
                                    </a>
                                    <a
                                        href="https://linkedin.com/company/apartmenthub"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.socialLink}
                                    >
                                        LinkedIn
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Contact;
