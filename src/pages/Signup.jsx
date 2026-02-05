import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import styles from './Login.module.css';

const Signup = () => {
    const navigate = useNavigate();
    const currentLang = useSelector((state) => state.ui.language);
    const { isAuthenticated, login } = useAuth();

    const [step, setStep] = useState('details'); // 'details' or 'code'
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('+');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [testCode, setTestCode] = useState(null);

    // Redirect if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/aanvraag', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const formatPhoneNumber = (value) => {
        // Keep only digits and +
        let cleaned = value.replace(/[^\d+]/g, '');
        // Ensure it starts with +
        if (!cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        return cleaned;
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        setTestCode(null);

        if (!firstName.trim() || !lastName.trim()) {
            setError(currentLang === 'en' ? 'Please enter your name' : 'Voer je naam in');
            return;
        }

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
                body: { phone_number: phoneNumber, mode: 'signup' }
            });

            if (sendError) {
                throw new Error(sendError.message);
            }

            if (!data.ok) {
                setError(currentLang === 'en' ? data.message : data.message_nl);
                return;
            }

            // Store test code if returned (development mode)
            if (data.test_code) {
                setTestCode(data.test_code);
            }

            setCodeSent(true);
            setStep('code');
        } catch (err) {
            console.error('Error signing up:', err);
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
            const { data, error: verifyError } = await supabase.functions.invoke('auth-verify-code', {
                body: {
                    phone_number: phoneNumber,
                    code: verificationCode,
                    first_name: firstName,
                    last_name: lastName
                }
            });

            if (verifyError) {
                throw new Error(verifyError.message);
            }

            if (!data.ok) {
                setError(currentLang === 'en' ? data.reason : data.reason_nl);
                return;
            }

            // Signup successful - store auth data
            login(data.token, data.phone_number, data.dossier_id, firstName, lastName);

            // Navigate to application page
            navigate('/aanvraag', { replace: true });
        } catch (err) {
            console.error('Error verifying code:', err);
            setError(currentLang === 'en' ? 'Invalid code' : 'Ongeldige code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToDetails = () => {
        setStep('details');
        setVerificationCode('');
        setError('');
        setCodeSent(false);
        setTestCode(null);
    };

    const handleTestCodeClick = () => {
        setVerificationCode(testCode || '123456');
    };

    return (
        <div className={styles.page}>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.iconWrapper}>
                        <UserPlus size={28} />
                    </div>

                    <h1 className={styles.title}>
                        {currentLang === 'en' ? 'Create Account' : 'Account aanmaken'}
                    </h1>
                    <p className={styles.subtitle}>
                        {currentLang === 'en'
                            ? 'Enter your details to create an account'
                            : 'Voer je gegevens in om een account aan te maken'}
                    </p>

                    {step === 'details' ? (
                        <form onSubmit={handleSignUp} className={styles.form}>
                            <div className={styles.nameRow}>
                                <div>
                                    <label className={styles.inputLabel}>
                                        {currentLang === 'en' ? 'First name' : 'Voornaam'}
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder={currentLang === 'en' ? 'John' : 'Jan'}
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className={styles.inputLabel}>
                                        {currentLang === 'en' ? 'Last name' : 'Achternaam'}
                                    </label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        placeholder={currentLang === 'en' ? 'Doe' : 'Jansen'}
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={styles.inputLabel}>
                                    {currentLang === 'en' ? 'Phone number (WhatsApp)' : 'Telefoonnummer (WhatsApp)'}
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="tel"
                                        className={styles.input}
                                        placeholder="+31612345678"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                                        required
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
                                    ? (currentLang === 'en' ? 'Creating account...' : 'Account aanmaken...')
                                    : (currentLang === 'en' ? 'Create account' : 'Account aanmaken')}
                            </button>

                            <div className={styles.signupLink}>
                                {currentLang === 'en' ? 'Already have an account? ' : 'Heb je al een account? '}
                                <Link to="/login">
                                    {currentLang === 'en' ? 'Sign in' : 'Inloggen'}
                                </Link>
                            </div>
                        </form>
                    ) : (
                        <div className={styles.form}>
                            <button
                                type="button"
                                className={styles.backButton}
                                onClick={handleBackToDetails}
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
                                        : (currentLang === 'en' ? 'Verify & Complete' : 'Verifiëren & Voltooien')}
                                </button>
                            </form>

                            {(testCode || true) && (
                                <div className={styles.testModeNote}>
                                    {currentLang === 'en' ? 'Test mode: Use code' : 'Testmodus: Gebruik code'}{' '}
                                    <span className={styles.testModeCode} onClick={handleTestCodeClick}>
                                        {testCode || '123456'}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Signup;
