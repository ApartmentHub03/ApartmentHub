import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { CheckCircle, Home, FileText, User, Mail, Euro, Calendar, MapPin, Briefcase, Phone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../contexts/AuthContext';
import { translations } from '../data/translations';
import Button from '../components/ui/Button';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import styles from './LetterOfIntent.module.css';

const LetterOfIntent = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { phoneNumber } = useAuth();
    const currentLang = useSelector((state) => state.ui.language);
    const tNL = translations.letterOfIntent.nl;
    const tEN = translations.letterOfIntent.en;

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [conditions, setConditions] = useState({
        condition1: false,
        condition2: false,
        condition3: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Get data from navigation state
    const {
        bidAmount = '2100',
        startDate = new Date().toISOString().split('T')[0],
        motivation = '',
        monthsAdvance = 0,
        tenantData = null,
        property = null
    } = location.state || {};

    // Extract tenant info
    const mainTenant = tenantData?.personen?.find(p => p.rol === 'Hoofdhuurder') || {};
    const propertyInfo = property || {
        adres: 'Apollolaan 171',
        stad: 'Amsterdam',
        huurprijs: 2100
    };

    // Format date for display
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('nl-NL', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    // Canvas setup - simplified without DPR scaling to prevent cursor offset
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const resizeCanvas = () => {
            const container = containerRef.current;
            if (!container) return;

            const rect = container.getBoundingClientRect();

            // Set canvas size to match display size exactly (no DPR scaling)
            canvas.width = rect.width;
            canvas.height = 100;

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

        // Handle both mouse and touch events
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        // Calculate position relative to canvas, accounting for any CSS scaling
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
        setHasSignature(true);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const clearSignature = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasSignature(false);
    };

    const allConditionsAccepted = Object.values(conditions).every(Boolean);
    const canSubmit = allConditionsAccepted && hasSignature;

    const handleSubmit = async () => {
        if (!canSubmit) return;

        setSubmitting(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Fire confetti!
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });

        setSubmitted(true);
        setSubmitting(false);
    };

    // Get work status display
    const getWorkStatusDisplay = (status) => {
        switch (status) {
            case 'werknemer':
                return { nl: 'Werknemer', en: 'Employee' };
            case 'student':
                return { nl: 'Student', en: 'Student' };
            case 'ondernemer':
                return { nl: 'Ondernemer', en: 'Entrepreneur' };
            default:
                return { nl: 'Niet opgegeven', en: 'Not specified' };
        }
    };

    const workStatus = getWorkStatusDisplay(mainTenant.werkstatus);

    if (submitted) {
        return (
            <div className={styles.pageWrapper}>
                <Navbar />
                <div className={styles.successPage}>
                    <div className={styles.successIcon}>
                        <CheckCircle size={48} />
                    </div>
                    <h1 className={styles.successTitle}>
                        {tNL.successTitle} / {tEN.successTitle}
                    </h1>
                    <p className={styles.successMessage}>
                        {tNL.successMessage}
                        <br /><br />
                        {tEN.successMessage}
                    </p>
                    <Button size="lg" onClick={() => navigate('/')}>
                        {tNL.backToHome} / {tEN.backToHome}
                    </Button>
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
                    <div className={styles.header}>
                        <h1 className={styles.title}>
                            {tNL.title} / {tEN.title}
                        </h1>
                        <p className={styles.subtitle}>
                            {tNL.subtitle}
                            <br />
                            {tEN.subtitle}
                        </p>
                    </div>

                    <div className={styles.card}>
                        {/* Property Details */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Home size={20} />
                                {tNL.propertyDetails} / {tEN.propertyDetails}
                            </h2>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <MapPin size={14} />
                                        {tNL.address} / {tEN.address}
                                    </span>
                                    <span className={styles.detailValue}>
                                        {propertyInfo.adres}{propertyInfo.stad ? `, ${propertyInfo.stad}` : ''}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <Euro size={14} />
                                        {tNL.rent} / {tEN.rent}
                                    </span>
                                    <span className={styles.detailValue}>€{bidAmount} / maand (month)</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <Calendar size={14} />
                                        {tNL.startDate} / {tEN.startDate}
                                    </span>
                                    <span className={styles.detailValue}>{formatDate(startDate)}</span>
                                </div>
                                {monthsAdvance > 0 && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>
                                            <Euro size={14} />
                                            Vooruitbetaling / Advance Payment
                                        </span>
                                        <span className={styles.detailValue}>
                                            {monthsAdvance} maand(en) / month(s)
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Tenant Details */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <User size={20} />
                                {tNL.tenantDetails} / {tEN.tenantDetails}
                            </h2>
                            <div className={styles.detailsGrid}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <User size={14} />
                                        Volledige Naam / Full Name
                                    </span>
                                    <span className={styles.detailValue}>{mainTenant.naam || 'Jan Jansen'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <Mail size={14} />
                                        E-mail / Email
                                    </span>
                                    <span className={styles.detailValue}>{mainTenant.email || 'user@example.com'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <Phone size={14} />
                                        Telefoon / Phone
                                    </span>
                                    <span className={styles.detailValue}>{mainTenant.telefoon || phoneNumber || '-'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <Briefcase size={14} />
                                        Beroep / Profession
                                    </span>
                                    <span className={styles.detailValue}>
                                        {workStatus.nl} / {workStatus.en}
                                    </span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>
                                        <Euro size={14} />
                                        Jaarinkomen / Annual Income
                                    </span>
                                    <span className={styles.detailValue}>€{mainTenant.inkomen || '-'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Conditions */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <FileText size={20} />
                                {tNL.conditions} / {tEN.conditions}
                            </h2>
                            <div className={styles.conditionsList}>
                                <label className={styles.conditionItem}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={conditions.condition1}
                                        onChange={(e) => setConditions(prev => ({ ...prev, condition1: e.target.checked }))}
                                    />
                                    <span className={styles.conditionText}>
                                        {tNL.condition1}
                                        <br />
                                        <span className={styles.conditionEn}>{tEN.condition1}</span>
                                    </span>
                                </label>
                                <label className={styles.conditionItem}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={conditions.condition2}
                                        onChange={(e) => setConditions(prev => ({ ...prev, condition2: e.target.checked }))}
                                    />
                                    <span className={styles.conditionText}>
                                        {tNL.condition2}
                                        <br />
                                        <span className={styles.conditionEn}>{tEN.condition2}</span>
                                    </span>
                                </label>
                                <label className={styles.conditionItem}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        checked={conditions.condition3}
                                        onChange={(e) => setConditions(prev => ({ ...prev, condition3: e.target.checked }))}
                                    />
                                    <span className={styles.conditionText}>
                                        {tNL.condition3}
                                        <br />
                                        <span className={styles.conditionEn}>{tEN.condition3}</span>
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Signature */}
                        <div className={styles.section}>
                            <div className={styles.signatureSection}>
                                <div className={styles.signatureLabel}>
                                    {tNL.signature} / {tEN.signature}
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
                                    {!hasSignature && (
                                        <div className={styles.signaturePlaceholder}>
                                            {tNL.signHere} / {tEN.signHere}
                                        </div>
                                    )}
                                </div>
                                <div className={styles.signatureActions}>
                                    <Button variant="ghost" size="sm" onClick={clearSignature}>
                                        {tNL.clearSignature} / {tEN.clearSignature}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className={styles.submitSection}>
                            <Button
                                size="lg"
                                onClick={handleSubmit}
                                loading={submitting}
                                disabled={!canSubmit}
                                fullWidth
                            >
                                {submitting ? `${tNL.submitting}...` : `${tNL.submit} / ${tEN.submit}`}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default LetterOfIntent;
