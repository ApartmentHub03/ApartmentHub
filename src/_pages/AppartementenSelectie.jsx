'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { translations } from '../data/translations';
import Button from '../components/ui/Button';
import { supabase } from '../integrations/supabase/client';
import styles from './AppartementenSelectie.module.css';

const AppartementenSelectie = () => {
    const router = useRouter();
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.apartments[currentLang] || translations.apartments.nl;

    const [selectedApartment, setSelectedApartment] = useState('');
    const [apartments, setApartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        const fetchApartments = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                const { data, error } = await supabase
                    .from('apartments')
                    .select('id, "Full Address", street, area, zip_code, rental_price, bedrooms, square_meters, status')
                    .in('status', ['Active', 'CreateLink'])
                    .order('Full Address', { ascending: true });

                if (error) {
                    console.error('[AppartementenSelectie] Error fetching apartments:', error);
                    setFetchError(error.message);
                } else {
                    setApartments(data || []);
                }
            } catch (err) {
                console.error('[AppartementenSelectie] Unexpected error:', err);
                setFetchError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchApartments();
    }, []);

    const selectedApt = apartments.find(apt => apt.id === selectedApartment);

    const handleContinue = () => {
        if (selectedApartment && selectedApt) {
            // Store selected apartment ID and full data for Aanvraag page
            localStorage.setItem('selected_apartment', selectedApartment);
            localStorage.setItem('selected_apartment_data', JSON.stringify(selectedApt));
            router.push('/aanvraag');
        }
    };

    const displayAddress = (apt) => {
        const parts = [apt["Full Address"] || apt.street || apt.name];
        if (apt.area && !apt["Full Address"]) parts.push(apt.area);
        return parts.filter(Boolean).join(', ');
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>{t.title}</h1>
                        <p className={styles.subtitle}>{t.subtitle}</p>
                    </div>

                    <div className={styles.content}>
                        <div className={styles.form}>
                            <div className={styles.selectWrapper}>
                                <label className={styles.selectLabel}>{t.selectLabel}</label>
                                {loading ? (
                                    <div className={styles.select} style={{ display: 'flex', alignItems: 'center', color: '#888' }}>
                                        {currentLang === 'en' ? 'Loading apartments...' : 'Appartementen laden...'}
                                    </div>
                                ) : fetchError ? (
                                    <div style={{ color: 'red', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                                        {currentLang === 'en' ? 'Failed to load apartments.' : 'Kon appartementen niet laden.'} ({fetchError})
                                    </div>
                                ) : (
                                    <select
                                        className={styles.select}
                                        value={selectedApartment}
                                        onChange={(e) => setSelectedApartment(e.target.value)}
                                    >
                                        <option value="">{t.selectPlaceholder}</option>
                                        {apartments.map((apt) => (
                                            <option key={apt.id} value={apt.id}>
                                                {displayAddress(apt)}
                                                {apt.rental_price ? ` - €${apt.rental_price}` : ''}
                                                {t.price ? ` ${t.price}` : ''}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {selectedApt && (
                                <div className={styles.previewCard}>
                                    <h3 className={styles.previewTitle}>
                                        {displayAddress(selectedApt)}
                                    </h3>
                                    <div className={styles.previewDetails}>
                                        {selectedApt.rental_price && (
                                            <div className={styles.previewItem}>
                                                <span className={styles.previewValue}>€{selectedApt.rental_price}</span>
                                                <span className={styles.previewLabel}>{t.price}</span>
                                            </div>
                                        )}
                                        {selectedApt.bedrooms && (
                                            <div className={styles.previewItem}>
                                                <span className={styles.previewValue}>{selectedApt.bedrooms}</span>
                                                <span className={styles.previewLabel}>{t.rooms}</span>
                                            </div>
                                        )}
                                        {selectedApt.square_meters && (
                                            <div className={styles.previewItem}>
                                                <span className={styles.previewValue}>{selectedApt.square_meters}m²</span>
                                                <span className={styles.previewLabel}>{t.surface}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <Button
                                onClick={handleContinue}
                                disabled={!selectedApartment || loading}
                                fullWidth
                                size="lg"
                            >
                                {t.continueBtn}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppartementenSelectie;
