import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Mail, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useForm } from '../hooks/useForm';
import styles from './Contact.module.css';
import { translations } from '../data/translations';

const WhatsAppIcon = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.109"></path>
    </svg>
);

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
                                        <p>info@apartmenthub.nl</p>
                                        <p className={styles.subtext}>{t.infoEmailText}</p>
                                    </div>
                                </div>
                                <div className={styles.infoItem}>
                                    <div className={`${styles.iconWrapper} ${styles.whatsapp}`}>
                                        <WhatsAppIcon className={styles.icon} />
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
