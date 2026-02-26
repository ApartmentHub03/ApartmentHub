'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { CheckCircle, XCircle, AlertCircle, Home, Loader2 } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import styles from './DealResponse.module.css';

const DealResponse = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentLang = useSelector((state) => state.ui.language);
    const { phoneNumber } = useAuth();

    const apartmentId = searchParams.get('apartment_id');
    const phoneParam = searchParams.get('phone');

    const resolvedPhone = phoneNumber || phoneParam || '';

    const [apartment, setApartment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // { type: 'accepted' | 'declined', message }
    const [error, setError] = useState('');
    const [alreadyResponded, setAlreadyResponded] = useState(null);

    // Fetch apartment details
    useEffect(() => {
        const fetchApartment = async () => {
            if (!apartmentId) {
                setError(currentLang === 'en'
                    ? 'No apartment specified. Please use the link from your WhatsApp message.'
                    : 'Geen appartement opgegeven. Gebruik de link uit je WhatsApp-bericht.');
                setLoading(false);
                return;
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('apartments')
                    .select('id, name, full_address, "Full Address", street, area, rental_price, bedrooms, square_meters, offers_sent, real_estate_agent_id')
                    .eq('id', apartmentId)
                    .single();

                if (fetchError || !data) {
                    setError(currentLang === 'en'
                        ? 'Apartment not found.'
                        : 'Appartement niet gevonden.');
                    setLoading(false);
                    return;
                }

                setApartment(data);

                // Check if already responded
                if (resolvedPhone && data.offers_sent) {
                    const normalizeForMatch = (phone) => {
                        const digits = phone.replace(/\D/g, '');
                        return digits.length > 9 ? digits.slice(-9) : digits;
                    };
                    const phoneNorm = normalizeForMatch(resolvedPhone);

                    const matchingOffer = data.offers_sent.find(o => {
                        const offerPhone = o.whatsapp_number || o.phone_number || '';
                        return normalizeForMatch(offerPhone) === phoneNorm;
                    });

                    if (matchingOffer) {
                        const status = (matchingOffer.status || '').toUpperCase().trim();
                        if (status === 'DEAL_ACCEPTED' || status === 'OFFER_DECLINED') {
                            setAlreadyResponded(status);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching apartment:', err);
                setError(currentLang === 'en'
                    ? 'Something went wrong. Please try again.'
                    : 'Er is iets misgegaan. Probeer het opnieuw.');
            }

            setLoading(false);
        };

        fetchApartment();
    }, [apartmentId, resolvedPhone, currentLang]);

    const handleResponse = async (responseType) => {
        if (!resolvedPhone) {
            setError(currentLang === 'en'
                ? 'Phone number is required. Please log in or use the link from WhatsApp.'
                : 'Telefoonnummer is vereist. Log in of gebruik de link uit WhatsApp.');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const { data, error: invokeError } = await supabase.functions.invoke('handle-deal-response', {
                body: {
                    apartment_id: apartmentId,
                    phone_number: resolvedPhone,
                    response: responseType
                }
            });

            if (data && !data.ok) {
                setError(currentLang === 'en' ? data.message : data.message_nl);
                setSubmitting(false);
                return;
            }

            if (invokeError) {
                throw new Error(invokeError.message);
            }

            setResult({
                type: responseType === 'accept' ? 'accepted' : 'declined',
                message: currentLang === 'en' ? data.message : data.message_nl
            });
        } catch (err) {
            console.error('Error submitting response:', err);
            setError(currentLang === 'en'
                ? 'Failed to process your response. Please try again.'
                : 'Kon je reactie niet verwerken. Probeer het opnieuw.');
        } finally {
            setSubmitting(false);
        }
    };

    const address = apartment
        ? (apartment['Full Address'] || apartment.full_address || apartment.street || '')
        : '';

    // Loading
    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.loadingState}>
                        <Loader2 className={styles.spinner} size={32} />
                        <p>{currentLang === 'en' ? 'Loading apartment details...' : 'Appartement details laden...'}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Error (no apartment)
    if (error && !apartment) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.errorState}>
                            <AlertCircle size={48} className={styles.errorIcon} />
                            <p className={styles.errorText}>{error}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Already responded
    if (alreadyResponded) {
        const isAccepted = alreadyResponded === 'DEAL_ACCEPTED';
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={isAccepted ? styles.successState : styles.declinedState}>
                            {isAccepted
                                ? <CheckCircle size={56} className={styles.successIcon} />
                                : <XCircle size={56} className={styles.declinedIcon} />
                            }
                            <h2 className={styles.resultTitle}>
                                {isAccepted
                                    ? (currentLang === 'en' ? 'Deal Already Accepted' : 'Deal Al Geaccepteerd')
                                    : (currentLang === 'en' ? 'Offer Already Declined' : 'Aanbod Al Afgewezen')
                                }
                            </h2>
                            <p className={styles.resultSubtext}>
                                {currentLang === 'en'
                                    ? 'You have already responded to this offer.'
                                    : 'Je hebt al gereageerd op dit aanbod.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Result state
    if (result) {
        const isAccepted = result.type === 'accepted';
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={isAccepted ? styles.successState : styles.declinedState}>
                            {isAccepted
                                ? <CheckCircle size={56} className={styles.successIcon} />
                                : <XCircle size={56} className={styles.declinedIcon} />
                            }
                            <h2 className={styles.resultTitle}>
                                {isAccepted
                                    ? (currentLang === 'en' ? 'Deal Accepted!' : 'Deal Geaccepteerd!')
                                    : (currentLang === 'en' ? 'Offer Declined' : 'Aanbod Afgewezen')
                                }
                            </h2>
                            <p className={styles.resultMessage}>{result.message}</p>

                            {isAccepted && (
                                <div className={styles.apartmentSummarySmall}>
                                    <Home size={16} />
                                    <span>{apartment.name} — {address}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Main deal response view
    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.header}>
                        <h1 className={styles.title}>
                            {currentLang === 'en' ? 'Respond to Offer' : 'Reageer op Aanbod'}
                        </h1>
                        <p className={styles.subtitle}>
                            {currentLang === 'en'
                                ? 'You have received an offer for the following apartment. Please respond below.'
                                : 'Je hebt een aanbod ontvangen voor het volgende appartement. Reageer hieronder.'}
                        </p>
                    </div>

                    <div className={styles.apartmentCard}>
                        <div className={styles.apartmentIcon}>
                            <Home size={24} />
                        </div>
                        <div className={styles.apartmentDetails}>
                            <h2 className={styles.apartmentName}>{apartment.name}</h2>
                            {address && <p className={styles.apartmentAddress}>{address}</p>}
                            <div className={styles.apartmentMeta}>
                                {apartment.rental_price && (
                                    <span className={styles.metaItem}>
                                        💰 €{Number(apartment.rental_price).toLocaleString()}/mo
                                    </span>
                                )}
                                {apartment.bedrooms && (
                                    <span className={styles.metaItem}>
                                        🛏 {apartment.bedrooms} {currentLang === 'en' ? 'bed' : 'slaapkamer'}
                                    </span>
                                )}
                                {apartment.square_meters && (
                                    <span className={styles.metaItem}>
                                        📐 {apartment.square_meters}m²
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className={styles.errorMessage}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className={styles.buttonGroup}>
                        <button
                            className={styles.acceptButton}
                            onClick={() => handleResponse('accept')}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className={styles.spinner} size={20} />
                            ) : (
                                <CheckCircle size={20} />
                            )}
                            {currentLang === 'en' ? 'Deal Accepted' : 'Deal Geaccepteerd'}
                        </button>

                        <button
                            className={styles.declineButton}
                            onClick={() => handleResponse('decline')}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <Loader2 className={styles.spinner} size={20} />
                            ) : (
                                <XCircle size={20} />
                            )}
                            {currentLang === 'en' ? 'Offer Declined' : 'Aanbod Afgewezen'}
                        </button>
                    </div>

                    <p className={styles.disclaimer}>
                        {currentLang === 'en'
                            ? 'This action cannot be undone. Please make sure before responding.'
                            : 'Deze actie kan niet ongedaan worden gemaakt. Controleer goed voordat je reageert.'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DealResponse;
