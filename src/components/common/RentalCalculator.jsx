
import React from 'react';
import { MapPin, Calculator, ChevronDown } from 'lucide-react';
import styles from './RentalCalculator.module.css';

const RentalCalculator = ({ onSubmit, onReset, submitted }) => {
    const [formData, setFormData] = React.useState({
        address: '',
        postalCode: '',
        squareMeters: '',
        rooms: '1',
        interior: 'unfurnished',
        condition: 'average',
        name: '',
        email: '',
        phone: ''
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (typeof onSubmit === 'function') {
            onSubmit(formData);
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
            name: '',
            email: '',
            phone: ''
        });
        if (typeof onReset === 'function') {
            onReset();
        }
    };

    // Styling for form elements within the green card
    const inputStyle = {
        width: '100%',
        borderRadius: '0.375rem',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        padding: '0.5rem 0.75rem',
        fontSize: '1rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: 'white',
        height: '2.75rem',
        outline: 'none'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.875rem',
        fontWeight: '500',
        color: 'white',
        marginBottom: '0.375rem'
    };

    if (submitted) {
        return (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{
                    width: '5rem',
                    height: '5rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '9999px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <svg style={{ width: '2.5rem', height: '2.5rem', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'white', marginBottom: '1rem' }}>
                    Thank you!
                </h3>
                <p style={{ color: 'rgba(255, 255, 255, 0.9)', marginBottom: '1.5rem', lineHeight: '1.625' }}>
                    We've received your information and will get back to you soon with a rental estimate.
                </p>
                <button
                    onClick={resetForm}
                    style={{
                        background: 'var(--color-primary-orange)',
                        color: 'white',
                        padding: '0.75rem 2rem',
                        borderRadius: '0.75rem',
                        fontWeight: '600',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                    }}
                >
                    Submit Another Property
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Full Width Address */}
            <div style={{ gridColumn: 'span 2' }}>
                <label style={labelStyle}>
                    <MapPin style={{ display: 'inline', width: '1rem', height: '1rem', marginRight: '0.5rem' }} />
                    ADDRESS *
                </label>
                <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Damrak 123, Amsterdam"

                    className={styles.formInput} style={inputStyle}
                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                    required
                />
            </div>

            {/* Grid for smaller inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>POSTAL CODE *</label>
                    <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        placeholder="1012 JS"
                        className={styles.formInput} style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                        required
                    />
                </div>
                <div>
                    <label style={labelStyle}>M2 *</label>
                    <input
                        type="number"
                        value={formData.squareMeters}
                        onChange={(e) => handleInputChange('squareMeters', e.target.value)}
                        placeholder="85"
                        className={styles.formInput} style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                        required
                    />
                </div>
            </div>

            {/* Rooms and Interior */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>ROOMS *</label>
                    <select
                        value={formData.rooms}
                        onChange={(e) => handleInputChange('rooms', e.target.value)}
                        className={styles.formSelect} style={{ ...inputStyle, appearance: 'none' }}
                        required
                    >
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5+</option>
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: '0.75rem', top: 'calc(50% + 0.5rem)', width: '1rem', height: '1rem', color: 'white', opacity: 0.5, pointerEvents: 'none' }} />
                </div>
                <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>INTERIOR *</label>
                    <select
                        value={formData.interior}
                        onChange={(e) => handleInputChange('interior', e.target.value)}
                        className={styles.formSelect} style={{ ...inputStyle, appearance: 'none' }}
                        required
                    >
                        <option value="shell">Shell</option>
                        <option value="unfurnished">Unfurnished</option>
                        <option value="partlyFurnished">Partly furnished</option>
                        <option value="furnished">Furnished</option>
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: '0.75rem', top: 'calc(50% + 0.5rem)', width: '1rem', height: '1rem', color: 'white', opacity: 0.5, pointerEvents: 'none' }} />
                </div>
            </div>

            {/* Condition and Name */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ position: 'relative' }}>
                    <label style={labelStyle}>CONDITION *</label>
                    <select
                        value={formData.condition}
                        onChange={(e) => handleInputChange('condition', e.target.value)}
                        className={styles.formSelect} style={{ ...inputStyle, appearance: 'none' }}
                        required
                    >
                        <option value="brandNew">New</option>
                        <option value="average">Average</option>
                        <option value="belowAverage">Below average</option>
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: '0.75rem', top: 'calc(50% + 0.5rem)', width: '1rem', height: '1rem', color: 'white', opacity: 0.5, pointerEvents: 'none' }} />
                </div>
                <div>
                    <label style={labelStyle}>FULL NAME *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="First and last name"
                        className={styles.formInput} style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                        required
                    />
                </div>
            </div>

            {/* Email and Phone */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                    <label style={labelStyle}>EMAIL *</label>
                    <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your.email@example.com"
                        className={styles.formInput} style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                        required
                    />
                </div>
                <div>
                    <label style={labelStyle}>PHONE *</label>
                    <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+31 6 12345678"
                        className={styles.formInput} style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = 'var(--color-primary-orange)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                        required
                    />
                </div>
            </div>

            <button
                type="submit"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    backgroundColor: 'var(--color-primary-orange)',
                    color: 'white',
                    padding: '0.625rem 1.5rem',
                    borderRadius: '0.75rem',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    height: '2.75rem',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    border: 'none',
                    cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 125, 40, 0.9)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-primary-orange)'}
            >
                <Calculator style={{ width: '1.25rem', height: '1.25rem' }} />
                CALCULATE NOW!
            </button>
        </form>
    );
};

export default RentalCalculator;
