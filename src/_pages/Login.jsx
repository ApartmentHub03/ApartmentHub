'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { Phone, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../data/translations';
import { supabase } from '../integrations/supabase/client';
import styles from './Login.module.css';

const Login = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentLang = useSelector((state) => state.ui.language);
    const { isAuthenticated, login } = useAuth();
    const t = translations.login?.[currentLang] || translations.login?.nl || {};

    const [step, setStep] = useState('phone'); // 'phone' or 'code'
    const [phoneNumber, setPhoneNumber] = useState('+');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    // Redirect if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            const from = searchParams.get('from') || '/aanvraag';
            router.replace(from);
        }
    }, [isAuthenticated, router, searchParams]);

    const formatPhoneNumber = (value) => {
        // Keep only digits and +
        let cleaned = value.replace(/[^\d+]/g, '');
        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        return cleaned;
    };

    const handleSendCode = async (e) => {
        e.preventDefault();
        setError('');

        // Validate phone number (should be at least 10 digits after country code)
        const digitsOnly = phoneNumber.replace(/\D/g, '');
        if (digitsOnly.length < 10) {
            setError(currentLang === 'en'
                ? 'Please enter a valid phone number (e.g., +31612345678)'
                : 'Voer een geldig telefoonnummer in (bijv. +31612345678)');
            return;
        }

        setIsLoading(true);

        try {
            const { data, error: sendError } = await supabase.functions.invoke('auth-send-code', {
                body: { phone_number: phoneNumber }
            });

            // Supabase functions.invoke returns data even on non-2xx if function returns JSON
            // Check if we got an error response with user-facing message
            if (data && !data.ok) {
                // Handle "user not found" error — redirect to signup
                if (data.message?.includes('No account') || data.message_nl?.includes('Geen account')) {
                    router.replace(`/signup?phone=${encodeURIComponent(phoneNumber)}`);
                    return;
                }
                setError(currentLang === 'en' ? (data.message || 'An error occurred') : (data.message_nl || 'Er is een fout opgetreden'));
                return;
            }

            if (sendError) {
                // Check if it's a "user not found" error (404) — redirect to signup
                if (sendError.message?.includes('non-2xx') || sendError.message?.includes('404')) {
                    router.replace(`/signup?phone=${encodeURIComponent(phoneNumber)}`);
                    return;
                }
                throw new Error(sendError.message);
            }

            setCodeSent(true);
            setStep('code');
        } catch (err) {
            console.error('Error sending code:', err);
            // Check if error message indicates account not found — redirect to signup
            if (err.message?.includes('non-2xx') || err.message?.includes('404')) {
                router.replace(`/signup?phone=${encodeURIComponent(phoneNumber)}`);
                return;
            } else {
                setError(currentLang === 'en'
                    ? 'Failed to send code. Please try again.'
                    : 'Kon code niet versturen. Probeer het opnieuw.');
            }
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
            const { data, error: verifyError } = await supabase.functions.invoke('auth-verify-code', {
                body: {
                    phone_number: phoneNumber,
                    code: verificationCode
                }
            });

            if (verifyError) {
                throw new Error(verifyError.message);
            }

            if (!data.ok) {
                setError(currentLang === 'en' ? data.reason : data.reason_nl);
                return;
            }

            // Login successful - store auth data
            // Fetch accountId from accounts table
            let accountId = null;
            try {
                const normalizedPhone = data.phone_number.replace(/\s+/g, '');
                const { data: accountData, error: accountError } = await supabase
                    .from('accounts')
                    .select('id')
                    .or(`whatsapp_number.eq.${normalizedPhone},whatsapp_number.eq.${data.phone_number}`)
                    .limit(1)
                    .single();

                if (!accountError && accountData) {
                    accountId = accountData.id;
                }
            } catch (err) {
                // Non-fatal if account not found yet (Zoko might create it later)
                console.warn('Could not fetch account ID during login:', err);
            }

            login(data.token, data.phone_number, data.dossier_id, null, null, accountId, data.user_role || 'main_tenant', data.persoon_id || null);

            // Navigate to target page
            const from = searchParams.get('from') || '/aanvraag';
            router.replace(from);
        } catch (err) {
            console.error('Error verifying code:', err);
            setError(currentLang === 'en' ? 'Invalid code' : 'Ongeldige code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToPhone = () => {
        setStep('phone');
        setVerificationCode('');
        setError('');
        setCodeSent(false);
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.iconWrapper}>
                        <Phone size={28} />
                    </div>

                    <h1 className={styles.title}>
                        {currentLang === 'en' ? 'Sign In' : 'Inloggen'}
                    </h1>
                    <p className={styles.subtitle}>
                        {currentLang === 'en'
                            ? 'Enter your phone number to receive a verification code via WhatsApp'
                            : 'Voer je telefoonnummer in om een verificatiecode te ontvangen via WhatsApp'}
                    </p>

                    {step === 'phone' ? (
                        <form onSubmit={handleSendCode} className={styles.form}>
                            <div>
                                <label className={styles.inputLabel}>
                                    {currentLang === 'en' ? 'Phone number' : 'Telefoonnummer'}
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="tel"
                                        className={styles.input}
                                        placeholder="+31612345678"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <p className={styles.inputHint}>
                                    {currentLang === 'en'
                                        ? 'Include country code (e.g., +31 for Netherlands)'
                                        : 'Inclusief landcode (bijv. +31 voor Nederland)'}
                                </p>
                            </div>

                            {error && (
                                <div className={styles.errorMessage}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                className={styles.submitBtn}
                                disabled={isLoading}
                            >
                                {isLoading
                                    ? (currentLang === 'en' ? 'Sending...' : 'Versturen...')
                                    : (currentLang === 'en' ? 'Send WhatsApp code' : 'Stuur WhatsApp code')}
                            </button>

                            <div className={styles.signupLink}>
                                {currentLang === 'en' ? "Don't have an account? " : 'Nog geen account? '}
                                <Link href="/signup">
                                    {currentLang === 'en' ? 'Sign up' : 'Registreren'}
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className={styles.form}>
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={handleBackToPhone}
                            >
                                <ArrowLeft size={16} />
                                {currentLang === 'en' ? 'Back' : 'Terug'}
                            </button>

                            {codeSent && (
                                <div className={styles.successMessage}>
                                    <CheckCircle size={16} />
                                    {currentLang === 'en'
                                        ? `WhatsApp code sent to ${phoneNumber}`
                                        : `WhatsApp code verzonden naar ${phoneNumber}`}
                                </div>
                            )}

                            <form onSubmit={handleVerifyCode}>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label className={styles.inputLabel}>
                                        {currentLang === 'en' ? 'Verification code' : 'Verificatiecode'}
                                    </label>
                                    <input
                                        type="text"
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        maxLength={6}
                                        className={styles.input}
                                        placeholder="123456"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        required
                                        autoFocus
                                    />
                                </div>

                                {error && (
                                    <div className={styles.errorMessage}>
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className={styles.submitBtn}
                                    disabled={isLoading}
                                >
                                    {isLoading
                                        ? (currentLang === 'en' ? 'Verifying...' : 'Verifiëren...')
                                        : (currentLang === 'en' ? 'Verify' : 'Verifiëren')}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
