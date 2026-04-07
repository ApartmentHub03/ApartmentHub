'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { translations } from '../data/translations';
import Button from '../components/ui/Button';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import styles from './AppartementenSelectie.module.css';

const AppartementenSelectie = () => {
    const router = useRouter();
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.apartments[currentLang] || translations.apartments.nl;
    const { isMainTenant, accountId } = useAuth();

    const [selectedApartments, setSelectedApartments] = useState([]);
    const [apartments, setApartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    useEffect(() => {
        const fetchApartments = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                if (isMainTenant) {
                    // Main tenant: fetch all active apartments
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
                } else {
                    // Co-tenant: fetch main tenant's selected apartments
                    if (!accountId) {
                        setFetchError('No account linked');
                        setLoading(false);
                        return;
                    }

                    // Get the linked main tenant account
                    const { data: accData, error: accError } = await supabase
                        .from('accounts')
                        .select('linked_account_id')
                        .eq('id', accountId)
                        .single();

                    if (accError || !accData?.linked_account_id) {
                        setFetchError('Could not find main tenant');
                        setLoading(false);
                        return;
                    }

                    // Get the main tenant's apartment_selected
                    const { data: mainAccData, error: mainAccError } = await supabase
                        .from('accounts')
                        .select('apartment_selected')
                        .eq('id', accData.linked_account_id)
                        .single();

                    if (mainAccError) {
                        setFetchError('Could not load main tenant apartments');
                        setLoading(false);
                        return;
                    }

                    const selectedByMain = mainAccData?.apartment_selected || [];
                    if (selectedByMain.length === 0) {
                        setApartments([]);
                        setLoading(false);
                        return;
                    }

                    // Fetch full apartment data for those IDs
                    const aptIds = selectedByMain.map(a => a.apartment_id);
                    const { data: aptData, error: aptError } = await supabase
                        .from('apartments')
                        .select('id, "Full Address", street, area, zip_code, rental_price, bedrooms, square_meters, status')
                        .in('id', aptIds);

                    if (aptError) {
                        setFetchError(aptError.message);
                    } else {
                        setApartments(aptData || []);
                    }
                }
            } catch (err) {
                console.error('[AppartementenSelectie] Unexpected error:', err);
                setFetchError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchApartments();
    }, [isMainTenant, accountId]);

    const toggleApartment = (aptId) => {
        setSelectedApartments(prev =>
            prev.includes(aptId)
                ? prev.filter(id => id !== aptId)
                : [...prev, aptId]
        );
    };

    const [saving, setSaving] = useState(false);

    const handleContinue = async () => {
        if (selectedApartments.length === 0) return;
        setSaving(true);

        try {
            const selectedApts = apartments.filter(apt => selectedApartments.includes(apt.id));
            const aptEntries = selectedApts.map(apt => ({
                apartment_id: apt.id,
                address: apt["Full Address"] || [apt.street, apt.area].filter(Boolean).join(', ') || '',
                rental_price: apt.rental_price || null,
                selected_at: new Date().toISOString()
            }));

            if (accountId) {
                // Save to Supabase if account exists
                await supabase.from('accounts').update({
                    apartment_selected: aptEntries
                }).eq('id', accountId);
            } else {
                // No account yet — store temporarily in localStorage for Aanvraag to pick up
                localStorage.setItem('pending_apartment_selected', JSON.stringify(aptEntries));
            }

            router.push('/aanvraag');
        } catch (err) {
            console.error('[AppartementenSelectie] Error saving apartments:', err);
            setSaving(false);
        }
    };

    const displayAddress = (apt) => {
        const parts = [apt["Full Address"] || apt.street || apt.name];
        if (apt.area && !apt["Full Address"]) parts.push(apt.area);
        return parts.filter(Boolean).join(', ');
    };

    const subtitle = isMainTenant ? t.subtitle : t.coTenantSubtitle;
    const noAptMessage = isMainTenant ? t.noApartments : t.noMainTenantApartments;

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>{t.title}</h1>
                        <p className={styles.subtitle}>{subtitle}</p>
                    </div>

                    <div className={styles.content}>
                        <div className={styles.form}>
                            {!isMainTenant && (
                                <div className={styles.coTenantBanner}>
                                    {t.coTenantSubtitle}
                                </div>
                            )}

                            <div className={styles.selectWrapper}>
                                <div className={styles.selectLabelRow}>
                                    <label className={styles.selectLabel}>{t.selectLabel}</label>
                                    {selectedApartments.length > 0 && (
                                        <span className={styles.selectedCount}>
                                            {selectedApartments.length} {t.selected}
                                        </span>
                                    )}
                                </div>

                                {loading ? (
                                    <div className={styles.loadingState}>
                                        {currentLang === 'en' ? 'Loading apartments...' : 'Appartementen laden...'}
                                    </div>
                                ) : fetchError ? (
                                    <div style={{ color: 'red', fontSize: '0.875rem', padding: '0.5rem 0' }}>
                                        {currentLang === 'en' ? 'Failed to load apartments.' : 'Kon appartementen niet laden.'} ({fetchError})
                                    </div>
                                ) : apartments.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        {noAptMessage}
                                    </div>
                                ) : (
                                    <div className={styles.apartmentGrid}>
                                        {apartments.map((apt) => {
                                            const isSelected = selectedApartments.includes(apt.id);
                                            return (
                                                <div
                                                    key={apt.id}
                                                    className={`${styles.apartmentCard} ${isSelected ? styles.apartmentCardSelected : ''}`}
                                                    onClick={() => toggleApartment(apt.id)}
                                                >
                                                    <div className={styles.apartmentCardHeader}>
                                                        <div className={styles.checkbox}>
                                                            {isSelected && (
                                                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                    <path d="M2 7L5.5 10.5L12 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <h3 className={styles.apartmentAddress}>
                                                            {displayAddress(apt)}
                                                        </h3>
                                                    </div>
                                                    <div className={styles.apartmentDetails}>
                                                        {apt.rental_price && (
                                                            <span className={styles.apartmentDetail}>
                                                                <strong>{'\u20AC'}{apt.rental_price}</strong> {t.price}
                                                            </span>
                                                        )}
                                                        {apt.bedrooms && (
                                                            <span className={styles.apartmentDetail}>
                                                                {apt.bedrooms} {t.rooms}
                                                            </span>
                                                        )}
                                                        {apt.square_meters && (
                                                            <span className={styles.apartmentDetail}>
                                                                {apt.square_meters}m{'\u00B2'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <Button
                                onClick={handleContinue}
                                disabled={selectedApartments.length === 0 || loading || saving}
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
