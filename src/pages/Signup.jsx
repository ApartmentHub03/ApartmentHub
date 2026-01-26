import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useSignUp } from '@clerk/clerk-react';
import { UserPlus, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './Login.module.css';

const Signup = () => {
    const navigate = useNavigate();
    const currentLang = useSelector((state) => state.ui.language);
    const { isClerkConfigured, isAuthenticated } = useAuth();

    const [step, setStep] = useState('details'); // 'details' or 'code'
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [codeSent, setCodeSent] = useState(false);

    // Clerk sign-up hook
    let signUp = null;
    let setActive = null;
    if (isClerkConfigured) {
        try {
            const result = useSignUp();
            signUp = result?.signUp;
            setActive = result?.setActive;
        } catch (e) {
            console.warn('Clerk useSignUp not available:', e);
        }
    }

    // Redirect if already authenticated
    React.useEffect(() => {
        if (isAuthenticated) {
            navigate('/aanvraag', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');

        if (!firstName.trim() || !lastName.trim()) {
            setError(currentLang === 'en' ? 'Please enter your name' : 'Voer je naam in');
            return;
        }

        if (!email || !email.includes('@')) {
            setError(currentLang === 'en' ? 'Please enter a valid email address' : 'Voer een geldig e-mailadres in');
            return;
        }

        setIsLoading(true);

        try {
            if (!isClerkConfigured || !signUp) {
                // Mock mode
                console.log('[Mock] Signing up:', { firstName, lastName, email });
                setCodeSent(true);
                setStep('code');
                setIsLoading(false);
                return;
            }

            // Create sign-up with email
            const signUpResult = await signUp.create({
                firstName,
                lastName,
                emailAddress: email,
            });

            console.log('SignUp created:', signUpResult);
            console.log('SignUp status:', signUp.status);
            console.log('SignUp missingFields:', signUp.missingFields);

            // Prepare email verification
            await signUp.prepareEmailAddressVerification({
                strategy: 'email_code',
            });

            setCodeSent(true);
            setStep('code');
        } catch (err) {
            console.error('Error signing up:', err);
            if (err.errors?.[0]?.code === 'form_identifier_exists') {
                setError(currentLang === 'en'
                    ? 'Email already registered. Please sign in instead.'
                    : 'E-mail is al geregistreerd. Log in.');
            } else {
                setError(err.errors?.[0]?.longMessage || err.message ||
                    (currentLang === 'en' ? 'Sign up failed' : 'Registratie mislukt'));
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
            if (!isClerkConfigured || !signUp) {
                // Mock mode - accept code "123456"
                if (verificationCode === '123456') {
                    navigate('/aanvraag', { replace: true });
                } else {
                    setError(currentLang === 'en' ? 'Invalid code' : 'Ongeldige code');
                }
                setIsLoading(false);
                return;
            }

            const result = await signUp.attemptEmailAddressVerification({
                code: verificationCode,
            });

            console.log('Verification result:', result.status, result);
            console.log('Missing fields:', JSON.stringify(result.missingFields));

            if (result.status === 'complete') {
                // Sign-up successful, activate session
                if (setActive && result.createdSessionId) {
                    await setActive({ session: result.createdSessionId });
                }
                // Navigate immediately
                navigate('/aanvraag', { replace: true });
            } else if (result.status === 'missing_requirements') {
                // Check if we have a session already (email verified successfully)
                if (result.createdSessionId) {
                    // Activate whatever session we have and proceed
                    if (setActive) {
                        await setActive({ session: result.createdSessionId });
                    }
                    navigate('/aanvraag', { replace: true });
                } else {
                    // Log missing fields for debugging
                    console.log('Cannot complete signup, missing:', result.missingFields);
                    setError(currentLang === 'en'
                        ? `Please try with a different email address. Your current email may already be registered.`
                        : `Probeer een ander e-mailadres. Dit e-mailadres is mogelijk al geregistreerd.`);
                }
            } else {
                setError(currentLang === 'en' ? 'Verification failed' : 'Verificatie mislukt');
            }
        } catch (err) {
            console.error('Error verifying code:', err);
            const errorCode = err.errors?.[0]?.code;
            const errorMessage = err.errors?.[0]?.longMessage || err.errors?.[0]?.message || err.message;

            // Handle already verified case - user might already exist
            if (errorCode === 'verification_already_verified' || errorMessage?.includes('already been verified')) {
                setError(currentLang === 'en'
                    ? 'This email is already verified. Try signing in instead.'
                    : 'Dit e-mailadres is al geverifieerd. Probeer in te loggen.');
            } else {
                setError(errorMessage || (currentLang === 'en' ? 'Invalid code' : 'Ongeldige code'));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToDetails = () => {
        setStep('details');
        setVerificationCode('');
        setError('');
        setCodeSent(false);
    };

    const handleTestCodeClick = () => {
        setVerificationCode('123456');
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
                                    {currentLang === 'en' ? 'Email address' : 'E-mailadres'}
                                </label>
                                <div className={styles.inputWrapper}>
                                    <input
                                        type="email"
                                        className={styles.input}
                                        placeholder="email@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
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

                            {!isClerkConfigured && (
                                <div className={styles.testModeNote}>
                                    Test mode: {currentLang === 'en' ? 'Use code' : 'Gebruik code'}{' '}
                                    <span className={styles.testModeCode} onClick={handleTestCodeClick}>123456</span>
                                </div>
                            )}
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
                                        ? `Code sent to ${email}`
                                        : `Code verzonden naar ${email}`}
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

                            {!isClerkConfigured && (
                                <div className={styles.testModeNote}>
                                    Test mode: {currentLang === 'en' ? 'Use code' : 'Gebruik code'}{' '}
                                    <span className={styles.testModeCode} onClick={handleTestCodeClick}>123456</span>
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
