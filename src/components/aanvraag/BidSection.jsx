import React from 'react';
import { useSelector } from 'react-redux';
import { Calendar, AlertCircle } from 'lucide-react';
import { translations } from '../../data/translations';
import styles from './BidSection.module.css';

const BidSection = ({
    conditions,
    bidAmount,
    startDate,
    motivation,
    monthsAdvance,
    onBidAmountChange,
    onStartDateChange,
    onMotivationChange,
    onMonthsAdvanceChange,
    readOnly = false
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;

    return (
        <div className={styles.card}>
            <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>
                    <span style={{ fontSize: '1.875rem' }}>💰</span>
                    <span>{currentLang === 'en' ? 'Place your bid' : 'Plaats jouw bod'}</span>
                </h3>
            </div>
            <div className={styles.cardContent}>
                {readOnly && (
                    <div className={styles.readOnlyBanner}>
                        <AlertCircle size={16} />
                        <span>
                            {currentLang === 'en'
                                ? 'These details are filled by the main tenant. You cannot edit them.'
                                : 'Deze gegevens zijn ingevuld door de hoofdhuurder. U kunt deze niet bewerken.'}
                        </span>
                    </div>
                )}
                <div className={styles.grid}>
                    {/* Bid */}
                    <div className={styles.formItem}>
                        <label className={styles.label}>
                            💶 {currentLang === 'en' ? 'Bid per month' : 'Bod per maand'} *
                        </label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.currencyPrefix}>€</span>
                            <input
                                type="number"
                                className={styles.bidInput}
                                placeholder={String(conditions.huurprijs)}
                                value={bidAmount}
                                onChange={(e) => onBidAmountChange?.(Number(e.target.value))}
                                disabled={readOnly}
                            />
                        </div>
                        <p className={styles.description}>
                            {currentLang === 'en'
                                ? 'The higher, the more attractive to the owner.'
                                : 'Hoe hoger, hoe aantrekkelijker voor de eigenaar.'}
                        </p>
                    </div>

                    {/* Start Date */}
                    <div className={styles.formItem}>
                        <label className={styles.smallLabel}>
                            {currentLang === 'en' ? 'Desired start date' : 'Gewenste startdatum'} *
                        </label>
                        <div className={styles.inputWrapper}>
                            <Calendar className={styles.calendarIcon} />
                            <input
                                type="date"
                                className={styles.dateInput}
                                min={new Date().toISOString().split('T')[0]}
                                value={startDate}
                                onChange={(e) => onStartDateChange?.(e.target.value)}
                                disabled={readOnly}
                            />
                        </div>
                        <p className={styles.description}>
                            {currentLang === 'en'
                                ? `Earliest possible: ${conditions.beschikbaar}. Later = more attractive.`
                                : `Vroegst mogelijk: ${conditions.beschikbaar}. Later = minder aantrekkelijk.`}
                        </p>
                    </div>
                </div>

                {/* Months Advance */}
                <div className={styles.formItem}>
                    <label className={styles.smallLabel}>
                        {currentLang === 'en' ? 'Months rent in advance' : 'Maanden huur vooruit betalen'}
                    </label>
                    <select
                        className={styles.select}
                        value={monthsAdvance}
                        onChange={(e) => onMonthsAdvanceChange?.(Number(e.target.value))}
                        disabled={readOnly}
                    >
                        <option value="0">0 {currentLang === 'en' ? 'months' : 'maanden'}</option>
                        <option value="1">1 {currentLang === 'en' ? 'month' : 'maand'}</option>
                        <option value="2">2 {currentLang === 'en' ? 'months' : 'maanden'}</option>
                        <option value="3">3 {currentLang === 'en' ? 'months' : 'maanden'}</option>
                        <option value="6">6 {currentLang === 'en' ? 'months' : 'maanden'}</option>
                        <option value="12">12 {currentLang === 'en' ? 'months' : 'maanden'}</option>
                    </select>
                    <p className={styles.description}>
                        {currentLang === 'en'
                            ? 'The more in advance, the more attractive.'
                            : 'Hoe meer vooruit, hoe aantrekkelijker.'}
                    </p>
                </div>

                {/* Motivation */}
                <div className={styles.formItem}>
                    <label className={styles.smallLabel}>
                        {currentLang === 'en' ? 'Motivation (optional)' : 'Motivatie (optioneel)'}
                    </label>
                    <textarea
                        className={styles.textarea}
                        placeholder={currentLang === 'en'
                            ? 'Why do you want to live here? What makes you a suitable tenant?'
                            : 'Waarom wil je hier wonen? Wat maakt jou een geschikte huurder?'}
                        maxLength={500}
                        value={motivation}
                        onChange={(e) => onMotivationChange?.(e.target.value)}
                        disabled={readOnly}
                    />
                    <p className={styles.charCount}>
                        {motivation.length}/500 {currentLang === 'en' ? 'characters' : 'karakters'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BidSection;
