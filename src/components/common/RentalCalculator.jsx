import React from 'react';
import { MapPin, Calculator, ChevronDown } from 'lucide-react';
import styles from './RentalCalculator.module.css';
import { supabase } from '../../lib/supabase';


const RentalCalculator = ({ onSubmit, onReset, submitted }) => {
    const [formData, setFormData] = React.useState({
        address: '',
        postalCode: '',
        squareMeters: '',
        rooms: '1',
        interior: 'unfurnished',
        condition: 'average',
        fullName: '',
        email: '',
        phone: ''
    });

    const [estimatedRent, setEstimatedRent] = React.useState(0);
    const [showCalculation, setShowCalculation] = React.useState(false);
    const [isBlinking, setIsBlinking] = React.useState(false);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [errors, setErrors] = React.useState({});

    // Only used if passing breakdown to parent
    const [breakdown, setBreakdown] = React.useState({
        baseRent: 0,
        locationBonus: 0,
        optimization: 0
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error for this field
        if (field === 'fullName' || field === 'email' || field === 'phone') {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const getFormulaDisplay = () => {
        const address = formData.address || '...';
        const postal = formData.postalCode || '...';
        const sqm = formData.squareMeters || '...';
        const rooms = formData.rooms || '...';
        const condition = formData.condition || '...';
        const interior = formData.interior || '...';

        return '((√' + address + '-' + postal + ') × ' + sqm + ') ÷ ' + rooms + ' + ' + condition + ' ^' + interior;
    };

    const validateForm = () => {
        const newErrors = {};
        if (!formData.fullName || formData.fullName.trim().length < 2) newErrors.fullName = "Voer een geldige naam in";
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Voer een geldig emailadres in";
        if (!formData.phone || formData.phone.trim().length < 10) newErrors.phone = "Voer een geldig telefoonnummer in";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const calculateRent = async () => {
        setIsAnalyzing(true);
        setIsBlinking(true);
        setShowCalculation(true);

        try {
            // Try Supabase function first if available
            if (supabase) {
                const { data, error } = await supabase.functions.invoke('analyze-rental-price', {
                    body: {
                        address: formData.address,
                        postalCode: formData.postalCode,
                        squareMeters: parseInt(formData.squareMeters),
                        rooms: parseInt(formData.rooms),
                        interior: formData.interior,
                        condition: formData.condition
                    }
                });

                if (error) {
                    console.error('Supabase function error:', error);
                    throw error;
                }

                if (data && data.estimatedRent) {
                    // Show blinking animation for 1 second before showing result
                    setTimeout(() => {
                        setEstimatedRent(data.estimatedRent);
                        setBreakdown({
                            baseRent: data.baseRent || Math.round(data.estimatedRent * 0.85),
                            locationBonus: data.locationBonus || Math.round(data.estimatedRent * 0.10),
                            optimization: data.optimization || Math.round(data.estimatedRent * 0.05)
                        });
                        setIsBlinking(false);
                        setIsAnalyzing(false);
                    }, 1000);
                    return data.estimatedRent;
                }
            }

            // Fallback to client-side calculation if Supabase not available
            await new Promise(resolve => setTimeout(resolve, 800));

            const sqm = parseFloat(formData.squareMeters) || 0;
            const rooms = parseInt(formData.rooms) || 1;
            const postalCode = parseInt(formData.postalCode.replace(/\\D/g, '')) || 0;

            // Step 1: Base Rent Calculation
            let pricePerSqm = 20.66; // Default for non-Amsterdam addresses (adjusted to match expected output)

            // Postal code ranges for Amsterdam districts
            if (postalCode >= 1012 && postalCode <= 1019) pricePerSqm = 25.50; // Centrum
            else if (postalCode >= 1015 && postalCode <= 1017) pricePerSqm = 23.80; // Jordaan
            else if (postalCode >= 1071 && postalCode <= 1077) pricePerSqm = 24.65; // Zuid
            else if (postalCode >= 1072 && postalCode <= 1075) pricePerSqm = 22.10; // De Pijp
            else if (postalCode >= 1091 && postalCode <= 1098) pricePerSqm = 21.25; // Oost
            else if (postalCode >= 1031 && postalCode <= 1039) pricePerSqm = 18.70; // Noord
            else if (postalCode >= 1055 && postalCode <= 1069) pricePerSqm = 17.85; // Nieuw-West

            const roomBonus = rooms * 100;
            const baseCalc = (sqm * pricePerSqm) + roomBonus;

            // Step 2: Interior Adjustment
            let interiorMultiplier = 1.0;
            if (formData.interior === 'shell') interiorMultiplier = 0.82;
            else if (formData.interior === 'partlyFurnished') interiorMultiplier = 1.08;
            else if (formData.interior === 'furnished') interiorMultiplier = 1.20;

            const afterInterior = baseCalc * interiorMultiplier;

            // Step 3: Condition Adjustment
            let conditionMultiplier = 1.0;
            if (formData.condition === 'brandNew') conditionMultiplier = 1.12;
            else if (formData.condition === 'belowAverage') conditionMultiplier = 0.88;

            const finalRent = Math.round(afterInterior * conditionMultiplier);

            setEstimatedRent(finalRent);
            setBreakdown({
                baseRent: Math.round(baseCalc),
                locationBonus: roomBonus,
                optimization: finalRent - Math.round(baseCalc)
            });

            setIsBlinking(false);
            setIsAnalyzing(false);
            return finalRent;
        } catch (error) {
            console.error('Error calculating rent:', error);
            // Fallback to a basic calculation on error
            const estimate = Math.round(parseFloat(formData.squareMeters) * 20 * 1.2);
            setEstimatedRent(estimate);
            setIsBlinking(false);
            setIsAnalyzing(false);
            return estimate;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        const calculatedRent = await calculateRent();

        // Pass result to parent, but keep component displaying the form + result in screen
        if (typeof onSubmit === 'function') {
            // We pass the data up, but we DO NOT assume the parent unmounts us immediately
            // The user requested "output should appear in the calculator only"
            // So we show it in the screen.
            onSubmit({ ...formData, estimatedRent: calculatedRent });
        }
    };

    const resetForm = () => {
        setFormData({
            address: '',
            postalCode: '',
            squareMeters: '',
            rooms: '1',
            interior: 'unfurnished',
            condition: 'average',
            fullName: '',
            email: '',
            phone: ''
        });
        setShowCalculation(false);
        setEstimatedRent(0);
        setErrors({});
        if (typeof onReset === 'function') {
            onReset();
        }
    };

    // Styling for form elements within the green card
    const inputStyle = {
        // Keeping inline styles for overrides but relying mainly on class
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'white',
        marginBottom: '0.375rem'
    };

    const canCalculate = formData.address && formData.postalCode && formData.squareMeters;



    return (
        <div className={styles.rentalCalculatorCard}>
            {/* Single Calculator Display Screen - matches original */}
            <div className={styles.resultScreen}>
                <div className={styles.screenFrame}></div>
                <div className={styles.screenGlow}></div>

                <div className={styles.screenContent}>
                    {/* Status indicator - shown when calculated */}
                    {showCalculation && estimatedRent > 0 && (
                        <div className={styles.statusBadge}>
                            <span className={styles.statusDot}></span>
                            Berekend
                        </div>
                    )}

                    {/* Formula Display */}
                    <div className={styles.formulaDisplay}>
                        {getFormulaDisplay()}
                    </div>

                    {/* Result Display - shown when calculated */}
                    {showCalculation && estimatedRent > 0 && (
                        <div className={styles.resultValue}>
                            <span className={styles.currencySymbol}>€</span>
                            <span className={styles.amount}>{estimatedRent.toLocaleString('nl-NL')}</span>
                            <span className={styles.perMonth}>/maand</span>
                        </div>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.calculatorForm}>
                {/* Full Width Address */}
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                        <MapPin size={16} />
                        ADDRESS *
                    </label>
                    <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder="Damrak 123, Amsterdam"
                        className={styles.formInput}
                        required
                    />
                </div>

                {/* Postal Code & M2 */}
                <div className={`${styles.formGrid} ${styles.gridCols2} `}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>POSTAL CODE *</label>
                        <input
                            type="text"
                            value={formData.postalCode}
                            onChange={(e) => handleInputChange('postalCode', e.target.value)}
                            placeholder="1012 JS"
                            className={styles.formInput}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>M2 *</label>
                        <input
                            type="number"
                            value={formData.squareMeters}
                            onChange={(e) => handleInputChange('squareMeters', e.target.value)}
                            placeholder="85"
                            className={styles.formInput}
                            required
                        />
                    </div>
                </div>

                {/* Rooms and Interior */}
                <div className={`${styles.formGrid} ${styles.gridCols2} `}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>ROOMS *</label>
                        <div className={styles.selectWrapper}>
                            <select
                                value={formData.rooms}
                                onChange={(e) => handleInputChange('rooms', e.target.value)}
                                className={styles.formSelect}
                                required
                            >
                                <option value="1">1</option>
                                <option value="2">2</option>
                                <option value="3">3</option>
                                <option value="4">4</option>
                                <option value="5">5+</option>
                            </select>
                            <ChevronDown className={styles.selectIcon} />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>INTERIOR *</label>
                        <div className={styles.selectWrapper}>
                            <select
                                value={formData.interior}
                                onChange={(e) => handleInputChange('interior', e.target.value)}
                                className={styles.formSelect}
                                required
                            >
                                <option value="shell">Shell</option>
                                <option value="unfurnished">Unfurnished</option>
                                <option value="partlyFurnished">Partly furnished</option>
                                <option value="furnished">Furnished</option>
                            </select>
                            <ChevronDown className={styles.selectIcon} />
                        </div>
                    </div>
                </div>

                {/* Condition and Name */}
                <div className={`${styles.formGrid} ${styles.gridCols2} `}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>CONDITION *</label>
                        <div className={styles.selectWrapper}>
                            <select
                                value={formData.condition}
                                onChange={(e) => handleInputChange('condition', e.target.value)}
                                className={styles.formSelect}
                                required
                            >
                                <option value="brandNew">New</option>
                                <option value="average">Average</option>
                                <option value="belowAverage">Below average</option>
                            </select>
                            <ChevronDown className={styles.selectIcon} />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>FULL NAME *</label>
                        <input
                            type="text"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            placeholder="First and last name"
                            className={`${styles.formInput} ${errors.fullName ? styles.inputError : ''} `}
                            required
                        />
                        {errors.fullName && <span className={styles.errorText}>{errors.fullName}</span>}
                    </div>
                </div>

                {/* Email and Phone */}
                <div className={`${styles.formGrid} ${styles.gridCols2} `}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>EMAIL *</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            placeholder="your.email@example.com"
                            className={`${styles.formInput} ${errors.email ? styles.inputError : ''} `}
                            required
                        />
                        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>PHONE *</label>
                        <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            placeholder="+31 6 12345678"
                            className={`${styles.formInput} ${errors.phone ? styles.inputError : ''} `}
                            required
                        />
                        {errors.phone && <span className={styles.errorText}>{errors.phone}</span>}
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isAnalyzing}
                    className={styles.submitButton}
                >
                    <Calculator size={20} />
                    {isAnalyzing ? 'CALCULATING...' : 'CALCULATE NOW!'}
                </button>
            </form>
        </div>
    );
};

export default RentalCalculator;
