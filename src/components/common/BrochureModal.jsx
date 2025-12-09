import React, { useState } from 'react';
import { X, FileText, Lock } from 'lucide-react';
import styles from './BrochureModal.module.css';
import logoImage from '../../assets/5a9afd14-27a5-40d8-a185-fac727f64fdf.png';

const BrochureModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: ''
    });
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Brochure request:', formData);

        // Open the PDF in a new tab
        window.open('/src/assets/amsterdam-rental-guide-2024.pdf', '_blank');

        setIsSubmitted(true);

        // Reset and close after 2 seconds
        setTimeout(() => {
            setIsSubmitted(false);
            setFormData({ fullName: '', email: '' });
            onClose();
        }, 2000);
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalWrapper}>
            <div className={styles.modalOverlay} onClick={onClose}></div>
            <div className={styles.modalContainer}>
                <button className={styles.closeButton} onClick={onClose}>
                    <X size={24} />
                </button>

                <div className={styles.modalContent}>
                    <div className={styles.logoWrapper}>
                        <img src={logoImage} alt="ApartmentHub" className={styles.logo} />
                    </div>

                    <h2 className={styles.title}>Request Free Brochure</h2>
                    <p className={styles.subtitle}>
                        Receive our complete guide for hassle-free renting directly in your inbox
                    </p>

                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Full name <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="text"
                                    className={styles.input}
                                    placeholder="Enter your full name"
                                    value={formData.fullName}
                                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>
                                    Email address <span className={styles.required}>*</span>
                                </label>
                                <input
                                    type="email"
                                    className={styles.input}
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.privacyNotice}>
                                <Lock size={16} />
                                <span>Your data is handled securely and not shared with third parties</span>
                            </div>

                            <button type="submit" className={styles.submitButton}>
                                <FileText size={20} />
                                Receive Brochure
                            </button>
                        </form>
                    ) : (
                        <div className={styles.successMessage}>
                            <div className={styles.successIcon}>✓</div>
                            <p className={styles.successText}>Thank you! Opening brochure...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BrochureModal;
