import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import { translations } from '../../data/translations';
import styles from './AddPersonModal.module.css';

const AddPersonModal = ({
    open,
    onOpenChange,
    role, // "Medehuurder" | "Garantsteller"
    onSubmit
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;

    const [name, setName] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const validate = () => {
        const newErrors = {};
        if (name.length < 2) newErrors.name = 'Name must be at least 2 characters'; // Localization needed?
        if (whatsapp.length < 10) newErrors.whatsapp = 'Phone number is too short';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit(name, whatsapp);
            setName('');
            setWhatsapp('');
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const roleIcon = role === 'Medehuurder' ? '👥' : '🛡️';
    const localizedRole = role; // Assuming role comes in localized or we map it. 'Medehuurder' is Dutch.

    return (
        <div className={styles.overlay} onClick={() => onOpenChange(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        <span style={{ fontSize: '1.5rem' }}>{roleIcon}</span>
                        {currentLang === 'en' ? `Add ${role}` : `${role} toevoegen`}
                    </h3>
                    <p className={styles.subtitle}>
                        {currentLang === 'en'
                            ? `Enter details for the new ${role.toLowerCase()}.`
                            : `Vul de gegevens in van de nieuwe ${role.toLowerCase()}.`}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="name">
                            {currentLang === 'en' ? 'Name' : 'Naam'} *
                        </label>
                        <input
                            id="name"
                            className={styles.input}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={currentLang === 'en' ? 'John Doe' : 'Jan Jansen'}
                        />
                        {errors.name && <span className={styles.errorText}>{errors.name}</span>}
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label} htmlFor="whatsapp">
                            {currentLang === 'en' ? 'WhatsApp Number' : 'WhatsApp Nummer'} *
                        </label>
                        <input
                            id="whatsapp"
                            type="tel"
                            className={styles.input}
                            value={whatsapp}
                            onChange={(e) => setWhatsapp(e.target.value)}
                            placeholder="+31 6 12345678"
                        />
                        {errors.whatsapp && <span className={styles.errorText}>{errors.whatsapp}</span>}
                    </div>

                    <div className={styles.footer}>
                        <button
                            type="button"
                            className={styles.cancelButton}
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            {currentLang === 'en' ? 'Cancel' : 'Annuleren'}
                        </button>
                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={loading}
                        >
                            {loading ? (
                                <span>{currentLang === 'en' ? 'Adding...' : 'Toevoegen...'}</span>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    <span>{currentLang === 'en' ? 'Add' : 'Toevoegen'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPersonModal;
