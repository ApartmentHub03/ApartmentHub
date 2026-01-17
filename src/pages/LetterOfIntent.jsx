import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CheckCircle, MessageCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import { sendLetterOfIntentEvent } from '../services/webhookService';
import Button from '../components/ui/Button';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import styles from './LetterOfIntent.module.css';

const LetterOfIntent = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { phoneNumber } = useAuth();
    const currentLang = useSelector((state) => state.ui.language);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [signature, setSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const [acceptedAllConditions, setAcceptedAllConditions] = useState(false);
    const [acceptedBrokerFee, setAcceptedBrokerFee] = useState(false);

    const {
        bidAmount = '2100',
        startDate = new Date().toISOString().split('T')[0],
        motivation = '',
        monthsAdvance = 0,
        tenantData = null,
        property = null
    } = location.state || {};

    const dossier = tenantData || { personen: [], kandidaat: {} };
    const bidData = { amount: bidAmount, startDate, monthsAdvance };

    const hoofdhuurder = dossier.personen?.find(p => p.rol === 'Hoofdhuurder') || {};
    const medehuurders = dossier.personen?.filter(p => p.rol === 'Medehuurder') || [];

    const propertyInfo = property || {
        adres: 'Keizersgracht 123, 1015 Amsterdam',
        huurprijs: 2100
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();
            canvas.width = rect.width;
            canvas.height = 150;

            const ctx = canvas.getContext('2d');
            ctx.strokeStyle = '#111827';
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        };

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, []);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDrawing = (e) => {
        e.preventDefault();
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const draw = (e) => {
        if (!isDrawing) return;
        e.preventDefault();
        const { x, y } = getCoordinates(e);
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.lineTo(x, y);
        ctx.stroke();
        setSignature('signed');
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignature('');
    };

    const canSubmit = acceptedAllConditions && acceptedBrokerFee && signature;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setIsSubmitting(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            await sendLetterOfIntentEvent({
                bidAmount: bidData.amount,
                startDate: bidData.startDate,
                motivation,
                monthsAdvance: bidData.monthsAdvance,
                tenantData: dossier,
                property: propertyInfo,
                conditionsAccepted: acceptedAllConditions,
                brokerFeeAccepted: acceptedBrokerFee,
                phoneNumber
            });

            setIsConfirmed(true);

            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#497772', '#F36B19', '#FFD700', '#00C851']
            });
        } catch (error) {
            console.error('LOI submit error:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString(currentLang === 'nl' ? 'nl-NL' : 'en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDateShort = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const conditionsNL = [
        'Het controleren van mijn persoonlijke informatie',
        'Een kredietcheck en BKR-opvraging',
        'Contact opnemen met mijn werkgever',
        'Het delen van mijn gegevens met EasyNuts voor advies over nutsvoorzieningen',
        'Vertrouwelijke behandeling van mijn gegevens',
        'Reactie binnen 7 werkdagen op mijn aanvraag',
        'Bij annulering na deal-bevestiging ben ik kosten van 1 maand huur (excl. BTW) verschuldigd'
    ];

    const conditionsEN = [
        'Verification of my personal information',
        'A credit check and BKR inquiry',
        'Contacting my employer',
        'Sharing my data with EasyNuts for utility advice',
        'Confidential treatment of my data',
        'Response within 7 working days on my application',
        'In case of cancellation after deal confirmation, I owe costs of 1 month rent (excl. VAT)'
    ];

    const conditions = currentLang === 'nl' ? conditionsNL : conditionsEN;

    const texts = currentLang === 'nl' ? {
        title: 'Letter of Intent',
        subtitle: 'Lees de voorwaarden zorgvuldig door en onderteken onderaan',
        propertySection: '📍 Pand Gegevens',
        address: 'Adres',
        rentPrice: 'Huurprijs',
        perMonth: 'per maand',
        deposit: 'Borgsom',
        startDate: 'Gewenste startdatum',
        tenantSection: '👤 Huurder(s)',
        mainTenant: 'Hoofdhuurder',
        coTenant: 'Mede-huurder',
        name: 'Naam',
        phone: 'Telefoonnummer',
        email: 'E-mail',
        conditionsSection: '📋 Voorwaarden',
        conditionsIntro: 'Ik ga akkoord met de volgende voorwaarden:',
        acceptAll: 'Ik accepteer alle bovenstaande voorwaarden',
        brokerFee: 'Ik ben ermee bekend dat Apartmenthub voor mij optreedt als aanhuurmakelaar en dat, indien ik door de verhuurder word geaccepteerd, Apartmenthub een vergoeding van één maandhuur excl. btw (bij een huurprijs onder € 2.000,-: tweemaal de maandhuur) bij mij in rekening brengt. Ik bevestig dat ik deze afspraak hierbij voor de tweede keer accordeer.',
        signatureSection: '✍️ Ondertekening door Hoofdhuurder',
        date: 'Datum',
        signatureLabel: 'Handtekening hoofdhuurder',
        signatureHint: '👆 Teken hieronder je handtekening met je muis of vinger',
        signPlaceholder: 'Teken hier je handtekening',
        clear: 'Wissen',
        submit: 'Ondertekenen & Indienen',
        submitting: 'Bezig met verzenden...',
        whatsappHelp: 'Heb je vragen? Chat met ons via WhatsApp',
        successTitle: 'Aanvraag Ingediend!',
        successSubtitle: 'Je Letter of Intent is succesvol verzonden.',
        responseTime: 'Wij nemen binnen <strong>24 uur</strong> contact met je op.',
        emailSent: 'Bevestiging verzonden naar:',
        backToHome: 'Terug naar Home',
        whatsappQuestions: 'Vragen? WhatsApp ons'
    } : {
        title: 'Letter of Intent',
        subtitle: 'Read the conditions carefully and sign below',
        propertySection: '📍 Property Details',
        address: 'Address',
        rentPrice: 'Rent Price',
        perMonth: 'per month',
        deposit: 'Deposit',
        startDate: 'Preferred Start Date',
        tenantSection: '👤 Tenant(s)',
        mainTenant: 'Main Tenant',
        coTenant: 'Co-tenant',
        name: 'Name',
        phone: 'Phone Number',
        email: 'Email',
        conditionsSection: '📋 Conditions',
        conditionsIntro: 'I agree to the following conditions:',
        acceptAll: 'I accept all the above conditions',
        brokerFee: 'I acknowledge that Apartmenthub acts as my rental broker and that, if I am accepted by the landlord, Apartmenthub will charge me a fee of one month\'s rent excl. VAT (for rent prices below €2,000: twice the monthly rent). I confirm that I hereby agree to this arrangement for the second time.',
        signatureSection: '✍️ Signature by Main Tenant',
        date: 'Date',
        signatureLabel: 'Main tenant signature',
        signatureHint: '👆 Sign below using your mouse or finger',
        signPlaceholder: 'Sign here',
        clear: 'Clear',
        submit: 'Sign & Submit',
        submitting: 'Submitting...',
        whatsappHelp: 'Have questions? Chat with us via WhatsApp',
        successTitle: 'Application Submitted!',
        successSubtitle: 'Your Letter of Intent has been successfully sent.',
        responseTime: 'We will contact you within <strong>24 hours</strong>.',
        emailSent: 'Confirmation sent to:',
        backToHome: 'Back to Home',
        whatsappQuestions: 'Questions? WhatsApp us'
    };

    if (isConfirmed) {
        return (
            <div className={styles.pageWrapper}>
                <Navbar />
                <div className={styles.successPage}>
                    <div className={styles.successCard}>
                        <div className={styles.successIconWrapper}>
                            <CheckCircle className={styles.successCheckIcon} size={80} />
                        </div>
                        <h1 className={styles.successTitle}>{texts.successTitle}</h1>
                        <p className={styles.successSubtitle}>{texts.successSubtitle}</p>
                        <p className={styles.responseTime} dangerouslySetInnerHTML={{ __html: texts.responseTime }} />
                        <div className={styles.successDivider}></div>
                        <div className={styles.emailConfirmation}>
                            <p className={styles.emailLabel}>{texts.emailSent}</p>
                            <p className={styles.emailValue}>
                                {hoofdhuurder?.email || dossier.kandidaat?.email || 'je@email.nl'}
                            </p>
                        </div>
                        <div className={styles.successActions}>
                            <Button size="lg" onClick={() => navigate('/')}>
                                {texts.backToHome}
                            </Button>
                            <a
                                href="https://wa.me/31658975449?text=Hallo%2C%20ik%20heb%20mijn%20Letter%20of%20Intent%20ondertekend%20en%20heb%20een%20vraag"
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.whatsappLink}
                            >
                                <MessageCircle size={16} />
                                {texts.whatsappQuestions}
                            </a>
                        </div>
                    </div>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <Navbar />
            <div className={styles.page}>
                <div className={styles.container}>
                    {/* Header */}
                    <div className={styles.header}>
                        <h1 className={styles.pageTitle}>{texts.title}</h1>
                        <p className={styles.pageSubtitle}>{texts.subtitle}</p>
                    </div>

                    {/* Property Details Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>{texts.propertySection}</h2>
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.address}</span>
                                    <span className={styles.detailValue}>{propertyInfo.adres}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.rentPrice}</span>
                                    <span className={styles.detailValue}>€{bidData.amount} {texts.perMonth}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.deposit}</span>
                                    <span className={styles.detailValue}>€{(bidData.amount || 2100) * 2}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.startDate}</span>
                                    <span className={styles.detailValue}>{formatDateShort(bidData.startDate)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tenant Details Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>{texts.tenantSection}</h2>
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.tenantSection}>
                                <h3 className={styles.tenantRole}>{texts.mainTenant}</h3>
                                <div className={styles.tenantDetailsGrid}>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>{texts.name}</span>
                                        <span className={styles.detailValue}>
                                            {hoofdhuurder?.naam || 'Jan Jansen'}
                                        </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>{texts.phone}</span>
                                        <span className={styles.detailValue}>
                                            {dossier.kandidaat?.whatsapp || hoofdhuurder?.whatsapp || phoneNumber || '+31611111111'}
                                        </span>
                                    </div>
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>{texts.email}</span>
                                        <span className={styles.detailValue}>
                                            {hoofdhuurder?.email || dossier.kandidaat?.email || 'jan@example.com'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {medehuurders.map((mh, idx) => (
                                <div key={mh.persoonId || idx} className={styles.tenantSection}>
                                    <h3 className={styles.tenantRole}>{texts.coTenant} {idx + 1}</h3>
                                    <div className={styles.tenantDetailsGrid}>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>{texts.coTenant}</span>
                                            <span className={styles.detailValue}>{mh.naam}</span>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <span className={styles.detailLabel}>{texts.phone}</span>
                                            <span className={styles.detailValue}>{mh.whatsapp}</span>
                                        </div>
                                        {mh.email && (
                                            <div className={styles.detailItem}>
                                                <span className={styles.detailLabel}>{texts.email}</span>
                                                <span className={styles.detailValue}>{mh.email}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Conditions Card */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>{texts.conditionsSection}</h2>
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.conditionsBox}>
                                <p className={styles.conditionsIntro}>{texts.conditionsIntro}</p>
                                <ul className={styles.conditionsList}>
                                    {conditions.map((condition, idx) => (
                                        <li key={idx}>{condition}</li>
                                    ))}
                                </ul>
                            </div>

                            <label className={styles.checkboxItem}>
                                <input
                                    type="checkbox"
                                    className={styles.checkbox}
                                    checked={acceptedAllConditions}
                                    onChange={(e) => setAcceptedAllConditions(e.target.checked)}
                                />
                                <span className={styles.checkboxLabel}>{texts.acceptAll}</span>
                            </label>

                            <div className={styles.brokerFeeBox}>
                                <label className={styles.checkboxItem}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={acceptedBrokerFee}
                                        onChange={(e) => setAcceptedBrokerFee(e.target.checked)}
                                    />
                                    <span className={styles.checkboxLabel}>{texts.brokerFee}</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Signature Card */}
                    <div className={styles.signatureCard}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>{texts.signatureSection}</h2>
                        </div>
                        <div className={styles.cardContent}>
                            <div className={styles.signerInfoGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.name}</span>
                                    <span className={styles.detailValueBold}>
                                        {hoofdhuurder?.naam || 'Jan Jansen'}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.phone}</span>
                                    <span className={styles.detailValueBold}>
                                        {dossier.kandidaat?.whatsapp || hoofdhuurder?.whatsapp || phoneNumber || '+31611111111'}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.email}</span>
                                    <span className={styles.detailValueBold}>
                                        {hoofdhuurder?.email || dossier.kandidaat?.email || 'jan@example.com'}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{texts.date}</span>
                                    <span className={styles.detailValue}>{formatDate(new Date().toISOString())}</span>
                                </div>
                            </div>

                            <div className={styles.signatureArea}>
                                <p className={styles.signatureLabel}>
                                    {texts.signatureLabel} <span className={styles.required}>*</span>
                                </p>
                                <div className={styles.signatureHintBox}>
                                    <p className={styles.signatureHintText}>{texts.signatureHint}</p>
                                </div>
                                <div className={styles.signatureContainer} ref={containerRef}>
                                    <canvas
                                        ref={canvasRef}
                                        className={styles.signatureCanvas}
                                        onMouseDown={startDrawing}
                                        onMouseMove={draw}
                                        onMouseUp={stopDrawing}
                                        onMouseLeave={stopDrawing}
                                        onTouchStart={startDrawing}
                                        onTouchMove={draw}
                                        onTouchEnd={stopDrawing}
                                    />
                                    {!signature && (
                                        <div className={styles.signaturePlaceholder}>
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="40"
                                                height="40"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className={styles.penIcon}
                                            >
                                                <path d="M15.707 21.293a1 1 0 0 1-1.414 0l-1.586-1.586a1 1 0 0 1 0-1.414l5.586-5.586a1 1 0 0 1 1.414 0l1.586 1.586a1 1 0 0 1 0 1.414z"></path>
                                                <path d="m18 13-1.375-6.874a1 1 0 0 0-.746-.776L3.235 2.028a1 1 0 0 0-1.207 1.207L5.35 15.879a1 1 0 0 0 .776.746L13 18"></path>
                                                <path d="m2.3 2.3 7.286 7.286"></path>
                                                <circle cx="11" cy="11" r="2"></circle>
                                            </svg>
                                            <span>{texts.signPlaceholder}</span>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.signatureActions}>
                                    <button
                                        type="button"
                                        className={styles.clearButton}
                                        onClick={clearSignature}
                                    >
                                        {texts.clear}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Submit Section */}
                    <div className={styles.submitSection}>
                        <button
                            type="button"
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={!canSubmit || isSubmitting}
                        >
                            {isSubmitting ? texts.submitting : texts.submit}
                        </button>

                        <a
                            href="https://wa.me/31658975449?text=Hallo%2C%20ik%20heb%20een%20vraag%20over%20mijn%20Letter%20of%20Intent"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.helpLink}
                        >
                            <MessageCircle size={16} />
                            {texts.whatsappHelp}
                        </a>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LetterOfIntent;
