import React from 'react';
import { useSelector } from 'react-redux';
import { Euro, Calendar, FileText } from 'lucide-react';
import { translations } from '../../data/translations';
import RentalFAQ from './RentalFAQ';
import styles from './RentalConditionsSidebar.module.css';

const RentalConditionsSidebar = ({ conditions, address }) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;

    return (
        <aside className={styles.sidebar}>
            {/* Rental Conditions Card */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>
                        <FileText className="h-6 w-6" />
                        {currentLang === 'en' ? 'Rental Conditions' : 'Huurvoorwaarden'}
                    </h3>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.priceSection}>
                        <div className={styles.iconWrapper}>
                            <Euro className={styles.icon} />
                        </div>
                        <div className={styles.priceDetails}>
                            <p className={styles.priceLabel}>
                                {currentLang === 'en' ? 'Minimum rent price' : 'Minimale huurprijs'}
                            </p>
                            <p className={styles.priceValue}>€{conditions.huurprijs}</p>
                            <p className={styles.priceUnit}>
                                {currentLang === 'en' ? 'per month' : 'per maand'}
                            </p>
                        </div>
                    </div>

                    <div className={styles.costSection}>
                        <div className={styles.costRow}>
                            <span className={styles.costLabel}>
                                {currentLang === 'en' ? 'Deposit' : 'Waarborgsom'}
                            </span>
                            <span className={styles.costValue}>€{conditions.waarborgsom}</span>
                        </div>
                        <div className={styles.costRow}>
                            <span className={styles.costLabel}>
                                {currentLang === 'en' ? 'Service costs' : 'Servicekosten'}
                            </span>
                            <span className={styles.costValue}>€{conditions.servicekosten}</span>
                        </div>
                    </div>

                    <div className={styles.availabilitySection}>
                        <Calendar className={styles.calendarIcon} />
                        <div className={styles.availabilityDetails}>
                            <p className={styles.availabilityLabel}>
                                {currentLang === 'en' ? 'Available from' : 'Beschikbaar voor'}
                            </p>
                            <p className={styles.availabilityValue}>{conditions.beschikbaar}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FAQ Section - Hidden on mobile */}
            <div className={styles.faqWrapper}>
                <RentalFAQ lang={currentLang} />
            </div>
        </aside>
    );
};

export default RentalConditionsSidebar;
