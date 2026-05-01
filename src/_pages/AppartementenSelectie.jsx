'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { translations } from '../data/translations';
import Button from '../components/ui/Button';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import ApartmentsIntroSection from '../features/apartments/components/ApartmentsIntroSection';
import ApartmentsSEOContent from '../features/apartments/components/ApartmentsSEOContent';
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
                // Both main tenant and co-tenant see all active apartments
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
    }, [isMainTenant, accountId]);

    const toggleApartment = (aptId) => {
        setSelectedApartments(prev =>
            prev.includes(aptId)
                ? prev.filter(id => id !== aptId)
                : [aptId]
        );
    };

    const [saving, setSaving] = useState(false);

    const handleContinue = async () => {
        if (selectedApartments.length === 0) return;
        setSaving(true);

        // Read the flag at click-time (not render-time) to avoid SSR issues
        const isFromSubmit = typeof window !== 'undefined' && sessionStorage.getItem('fromSubmitFlow') === 'true';

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

            // If coming from the submit flow, link offers to selected apartments then go to LOI
            if (isFromSubmit) {
                sessionStorage.removeItem('fromSubmitFlow');

                // Link offers to apartments if we have an account
                if (accountId) {
                    const loiRaw = sessionStorage.getItem('loiData');
                    const loiData = loiRaw ? JSON.parse(loiRaw) : {};
                    const bidAmounts = loiData.bidAmounts || {};
                    const startDate = loiData.startDate || '';
                    const motivation = loiData.motivation || '';
                    const mainTenantName = loiData.tenantData?.personen?.find(p => p.rol === 'Hoofdhuurder')?.naam || '';

                    const { data: accData } = await supabase.from('accounts').select('offered_apartments').eq('id', accountId).single();
                    let updatedOffered = accData?.offered_apartments || [];

                    for (const apt of selectedApts) {
                        if (!updatedOffered.includes(apt.id)) {
                            updatedOffered.push(apt.id);
                        }

                        const { data: aptData } = await supabase.from('apartments').select('offers_in').eq('id', apt.id).single();
                        const offersIn = aptData?.offers_in || [];
                        const bidAmount = bidAmounts[apt.id] || bidAmounts['__default'] || apt.rental_price || 0;

                        const existingIdx = offersIn.findIndex(o => o.account_id === accountId);
                        const offerObj = {
                            account_id: accountId,
                            tenant_name: mainTenantName,
                            bid_amount: bidAmount,
                            start_date: startDate,
                            motivation: motivation,
                            status: 'Pending',
                            submitted_at: new Date().toISOString()
                        };

                        if (existingIdx >= 0) {
                            offersIn[existingIdx] = offerObj;
                        } else {
                            offersIn.push(offerObj);
                        }

                        await supabase.from('apartments').update({ offers_in: offersIn }).eq('id', apt.id);
                    }

                    await supabase.from('accounts').update({ offered_apartments: updatedOffered }).eq('id', accountId);

                    // Update LOI data with the selected apartments
                    const loiRaw2 = sessionStorage.getItem('loiData');
                    if (loiRaw2) {
                        const updatedLoi = JSON.parse(loiRaw2);
                        updatedLoi.properties = selectedApts.map(a => ({
                            adres: a["Full Address"] || [a.street, a.area].filter(Boolean).join(', ') || '',
                            apartmentId: a.id,
                            voorwaarden: { huurprijs: a.rental_price || 0 }
                        }));
                        updatedLoi.property = updatedLoi.properties[0] || updatedLoi.property;
                        sessionStorage.setItem('loiData', JSON.stringify(updatedLoi));
                    }
                }

                // Always redirect to letter-of-intent when coming from submit
                router.push(currentLang === 'en' ? '/en/letter-of-intent' : '/letter-of-intent');
            } else {
                // Normal flow — go back to aanvraag
                router.push('/aanvraag');
            }
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
            <ApartmentsIntroSection />
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h2 className={styles.title}>{t.title}</h2>
                        <p className={styles.subtitle}>{subtitle}</p>
                    </div>

                    <div className={styles.content}>
                        <div className={styles.form}>
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
            <ApartmentsSEOContent />
        </div>
    );
};

export default AppartementenSelectie;
