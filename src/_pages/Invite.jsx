'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Phone, ArrowLeft, CheckCircle, AlertCircle, Users, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import styles from './Login.module.css';

function decodeJWTPayload(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1]));
    } catch {
        return null;
    }
}

const Invite = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentLang = useSelector((state) => state.ui.language);
    const { login } = useAuth();

    const [inviteData, setInviteData] = useState(null);
    const [inviteError, setInviteError] = useState('');
    const [step, setStep] = useState('phone'); // 'phone' or 'code'
    const [phoneNumber, setPhoneNumber] = useState('+');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [testCode, setTestCode] = useState(null);

    // Decode invite token on mount
    useEffect(() => {
        const token = searchParams.get('token');
        if (!token) {
            setInviteError(currentLang === 'en'
                ? 'No invite token provided. Please use the link shared with you.'
                : 'Geen uitnodigingstoken opgegeven. Gebruik de link die met je is gedeeld.');
            return;
        }

        const payload = decodeJWTPayload(token);
        if (!payload || payload.type !== 'invite') {
            setInviteError(currentLang === 'en'
                ? 'Invalid invite link.'
                : 'Ongeldige uitnodigingslink.');
            return;
        }

        if (payload.exp && Date.now() >= payload.exp * 1000) {
            setInviteError(currentLang === 'en'
                ? 'This invite link has expired. Please ask the main tenant for a new link.'
                : 'Deze uitnodigingslink is verlopen. Vraag de hoofdhuurder om een nieuwe link.');
            return;
        }

        setInviteData(payload);
    }, [searchParams, currentLang]);

    const formatPhoneNumber = (value) => {
        let cleaned = value.replace(/[^\d+]/g, '');
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        return cleaned;
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');

        if (!firstName.trim() || !lastName.trim()) {
            setError(currentLang === 'en' ? 'Please enter your full name' : 'Voer je volledige naam in');
            return;
        }

        const digitsOnly = phoneNumber.replace(/\D/g, '');
        if (digitsOnly.length < 10) {
            setError(currentLang === 'en'
                ? 'Please enter a valid phone number (e.g., +31612345678)'
                : 'Voer een geldig telefoonnummer in (bijv. +31612345678)');
            return;
        }

        setIsLoading(true);

        try {
            // Use invite mode — skips both "user must exist" (login) and "user must NOT exist" (signup) checks
            const { data, error: sendError } = await supabase.functions.invoke('auth-send-code', {
                body: { phone_number: phoneNumber, mode: 'invite' }
            });

            if (data && !data.ok) {
                setError(currentLang === 'en' ? (data.message || 'An error occurred') : (data.message_nl || 'Er is een fout opgetreden'));
                return;
            }

            if (sendError && !data) {
                throw new Error(sendError.message);
            }

            if (data?.test_code) {
                setTestCode(data.test_code);
            }

            setStep('code');
        } catch (err) {
            console.error('Error sending code:', err);
            setError(currentLang === 'en'
                ? 'Failed to send code. Please try again.'
                : 'Kon code niet versturen. Probeer het opnieuw.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');

        if (!verificationCode || verificationCode.length < 4) {
            setError(currentLang === 'en' ? 'Please enter the verification code' : 'Voer de verificatiecode in');
            return;
        }

        setIsLoading(true);

        try {
            // Verify the OTP code
            const { data, error: verifyError } = await supabase.functions.invoke('auth-verify-code', {
                body: {
                    phone_number: phoneNumber,
                    code: verificationCode,
                    first_name: firstName,
                    last_name: lastName
                }
            });

            if (verifyError) throw new Error(verifyError.message);
            if (!data.ok) {
                setError(currentLang === 'en' ? data.reason : data.reason_nl);
                return;
            }

            // Add this person to the main tenant's dossier
            const inviteToken = searchParams.get('token');

            // First check if this person already exists in the dossier (e.g. re-opening link)
            const normalizedPhone = data.phone_number.replace(/\s+/g, '');
            let persoonId = null;

            const expectedType = inviteData.role === 'Medehuurder' ? 'co_tenant' : 'guarantor';
            const { data: existingPersonen } = await supabase
                .from('personen')
                .select('id')
                .eq('dossier_id', inviteData.dossier_id)
                .eq('telefoon', normalizedPhone)
                .eq('type', expectedType)
                .limit(1);

            if (existingPersonen && existingPersonen.length > 0) {
                persoonId = existingPersonen[0].id;
            } else {
                // Create new person — try edge function first, fall back to direct insert
                try {
                    const { data: addResult } = await supabase.functions.invoke('add-person', {
                        body: {
                            dossier_id: inviteData.dossier_id,
                            rol: inviteData.role,
                            naam: `${firstName} ${lastName}`,
                            whatsapp: phoneNumber,
                            linked_to_persoon_id: inviteData.linked_to_persoon_id || null,
                            auth_token: data.token
                        }
                    });
                    if (addResult?.persoon?.id) {
                        persoonId = addResult.persoon.id;
                    }
                } catch (addErr) {
                    console.warn('[Invite] add-person edge function failed, using direct insert:', addErr);
                }

                // Fallback: create directly via Supabase client if edge function failed
                if (!persoonId) {
                    const nameParts = `${firstName} ${lastName}`.trim().split(' ');
                    const { data: newPerson } = await supabase
                        .from('personen')
                        .insert({
                            dossier_id: inviteData.dossier_id,
                            rol: inviteData.role,
                            type: inviteData.role === 'Medehuurder' ? 'co_tenant' : 'guarantor',
                            voornaam: nameParts[0] || '',
                            achternaam: nameParts.slice(1).join(' ') || '',
                            telefoon: normalizedPhone,
                            created_at: new Date().toISOString()
                        })
                        .select('id')
                        .single();

                    if (newPerson) {
                        persoonId = newPerson.id;
                    }
                }
            }

            // Store invite context for the form page
            localStorage.setItem('invite_dossier_id', inviteData.dossier_id);
            localStorage.setItem('invite_role', inviteData.role);
            localStorage.setItem('invite_persoon_id', persoonId || '');
            localStorage.setItem('invite_token', data.token);

            // Log them in
            login(data.token, data.phone_number, data.dossier_id, firstName, lastName, null);

            // Redirect to dedicated invite form page
            router.replace('/invite-form');
        } catch (err) {
            console.error('Error verifying code:', err);
            setError(currentLang === 'en' ? 'Verification failed. Please try again.' : 'Verificatie mislukt. Probeer het opnieuw.');
        } finally {
            setIsLoading(false);
        }
    };

    // Error state
    if (inviteError) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.iconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <AlertCircle size={28} />
                        </div>
                        <h1 className={styles.title}>
                            {currentLang === 'en' ? 'Invalid Invite' : 'Ongeldige Uitnodiging'}
                        </h1>
                        <p className={styles.subtitle}>{inviteError}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Loading state
    if (!inviteData) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <p>{currentLang === 'en' ? 'Loading...' : 'Laden...'}</p>
                    </div>
                </div>
            </div>
        );
    }

    const RoleIcon = inviteData.role === 'Medehuurder' ? Users : Shield;
    const roleLabel = inviteData.role === 'Medehuurder'
        ? (currentLang === 'en' ? 'Co-Tenant' : 'Medehuurder')
        : (currentLang === 'en' ? 'Guarantor' : 'Garantsteller');

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.iconWrapper}>
                        <RoleIcon size={28} />
                    </div>

                    <h1 className={styles.title}>
                        {currentLang === 'en'
                            ? `You're invited as ${roleLabel}`
                            : `Je bent uitgenodigd als ${roleLabel}`}
                    </h1>
                    <p className={styles.subtitle}>
                        {currentLang === 'en'
                            ? 'Verify your phone number to join the rental application and upload your documents.'
                            : 'Verifieer je telefoonnummer om deel te nemen aan de huuranvraag en je documenten te uploaden.'}
                    </p>

                    {step === 'phone' ? (
                        <form onSubmit={handleSendCode} className={styles.form}>
                            <div className={styles.nameRow}>
                                <div>
                                    <label className={styles.inputLabel}>
                                        {currentLang === 'en' ? 'First name' : 'Voornaam'}
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        placeholder={currentLang === 'en' ? 'John' : 'Jan'}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={styles.inputLabel}>
                                        {currentLang === 'en' ? 'Last name' : 'Achternaam'}
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        placeholder={currentLang === 'en' ? 'Doe' : 'Jansen'}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={styles.inputLabel}>
                                    {currentLang === 'en' ? 'WhatsApp number' : 'WhatsApp nummer'}
                                </label>
                                <input
                                    type="tel"
                                    className={styles.input}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                                    placeholder="+31612345678"
                                    required
                                />
                                <p className={styles.inputHint}>
                                    {currentLang === 'en'
                                        ? 'You will receive a verification code via WhatsApp'
                                        : 'Je ontvangt een verificatiecode via WhatsApp'}
                                </p>
                            </div>

                            {error && (
                                <div className={styles.errorMessage}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                                {isLoading
                                    ? (currentLang === 'en' ? 'Sending...' : 'Verzenden...')
                                    : (currentLang === 'en' ? 'Send Verification Code' : 'Verificatiecode Versturen')}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerifyCode} className={styles.form}>
                            <button type="button" className={styles.backButton} onClick={() => { setStep('phone'); setError(''); }}>
                                <ArrowLeft size={16} />
                                {currentLang === 'en' ? 'Change number' : 'Nummer wijzigen'}
                            </button>

                            <div className={styles.successMessage}>
                                <CheckCircle size={16} />
                                {currentLang === 'en'
                                    ? `Code sent to ${phoneNumber}`
                                    : `Code verzonden naar ${phoneNumber}`}
                            </div>

                            <div>
                                <label className={styles.inputLabel}>
                                    {currentLang === 'en' ? 'Verification code' : 'Verificatiecode'}
                                </label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="123456"
                                    maxLength={6}
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className={styles.errorMessage}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
                                {isLoading
                                    ? (currentLang === 'en' ? 'Verifying...' : 'Verifiëren...')
                                    : (currentLang === 'en' ? 'Verify & Join' : 'Verifieer & Deelnemen')}
                            </button>

                            {testCode && (
                                <div className={styles.testModeNote}>
                                    Test code: <code className={styles.testModeCode} onClick={() => setVerificationCode(testCode)}>{testCode}</code>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Invite;
