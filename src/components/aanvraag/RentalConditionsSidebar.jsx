import React from 'react';
import { useSelector } from 'react-redux';
import { Euro, Calendar, FileText } from 'lucide-react';
import { translations } from '../../data/translations';
import RentalFAQ from './RentalFAQ';
import styles from './RentalConditionsSidebar.module.css';

const RentalConditionsSidebar = ({ conditions, address, panden }) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;

    // Support both single pand (conditions prop) and multiple panden
    const apartmentList = panden && panden.length > 0 ? panden : (conditions ? [{ adres: address, voorwaarden: conditions }] : []);
    const isMultiple = apartmentList.length > 1;

    return (
        <aside className={styles.sidebar}>
            {!isMultiple ? (
                // Single apartment — full detail card
                apartmentList.map((pand, idx) => (
                    <div className={styles.card} key={pand.apartmentId || idx}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <FileText className="h-6 w-6" />
                                {pand.adres || (currentLang === 'en' ? 'Rental Conditions' : 'Huurvoorwaarden')}
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
                                    <p className={styles.priceValue}>{'\u20AC'}{pand.voorwaarden?.huurprijs || 0}</p>
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
                                    <span className={styles.costValue}>{'\u20AC'}{pand.voorwaarden?.waarborgsom || 0}</span>
                                </div>
                                <div className={styles.costRow}>
                                    <span className={styles.costLabel}>
                                        {currentLang === 'en' ? 'Service costs' : 'Servicekosten'}
                                    </span>
                                    <span className={styles.costValue}>{'\u20AC'}{pand.voorwaarden?.servicekosten || '-'}</span>
                                </div>
                            </div>

                            <div className={styles.availabilitySection}>
                                <Calendar className={styles.calendarIcon} />
                                <div className={styles.availabilityDetails}>
                                    <p className={styles.availabilityLabel}>
                                        {currentLang === 'en' ? 'Available from' : 'Beschikbaar voor'}
                                    </p>
                                    <p className={styles.availabilityValue}>{pand.voorwaarden?.beschikbaar || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                // Multiple apartments — compact list
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                            <FileText className="h-5 w-5" />
                            {currentLang === 'en'
                                ? `${apartmentList.length} Apartments Selected`
                                : `${apartmentList.length} Appartementen Geselecteerd`}
                        </h3>
                    </div>
                    <div className={styles.compactList}>
                        {apartmentList.map((pand, idx) => (
                            <div
                                className={styles.compactItem}
                                key={pand.apartmentId || idx}
                            >
                                <div className={styles.compactName}>
                                    {pand.adres || '-'}
                                </div>
                                <div className={styles.compactDetails}>
                                    <div className={styles.compactDetail}>
                                        <span className={styles.compactDetailLabel}>
                                            {currentLang === 'en' ? 'Rent' : 'Huur'}
                                        </span>
                                        <span className={styles.compactDetailValue}>
                                            {'\u20AC'}{pand.voorwaarden?.huurprijs || 0}
                                        </span>
                                    </div>
                                    <div className={styles.compactDetail}>
                                        <span className={styles.compactDetailLabel}>
                                            {currentLang === 'en' ? 'Deposit' : 'Borg'}
                                        </span>
                                        <span className={styles.compactDetailValue}>
                                            {'\u20AC'}{pand.voorwaarden?.waarborgsom || 0}
                                        </span>
                                    </div>
                                    {pand.voorwaarden?.beschikbaar && pand.voorwaarden.beschikbaar !== '-' && (
                                        <div className={styles.compactDetail}>
                                            <span className={styles.compactDetailLabel}>
                                                <Calendar style={{ width: '0.7rem', height: '0.7rem', display: 'inline', verticalAlign: 'middle', marginRight: '0.2rem' }} />
                                                {pand.voorwaarden.beschikbaar}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* FAQ Section - Hidden on mobile */}
            <div className={styles.faqWrapper}>
                <RentalFAQ lang={currentLang} />
            </div>
        </aside>
    );
};

export default RentalConditionsSidebar;
