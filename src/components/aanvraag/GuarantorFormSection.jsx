import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { translations } from '../../data/translations';
import GuarantorWorkStatusSelector from './GuarantorWorkStatusSelector';
import InlineDocumentUpload from './InlineDocumentUpload';
import { getRequiredDocuments } from '../../utils/documentRequirements';
import { documentTypeLabels, workStatusLabels } from '../../config/documentRequirements';
import styles from './GuarantorFormSection.module.css';

const GuarantorCard = ({
    persoon,
    onDocumentUpload,
    onDocumentRemove,
    onSendWhatsAppLink,
    onRemove,
    onFormDataChange,
    isPhoneDuplicate,
    getPhoneConflict,
    readOnly = false,
    hideIncome = false
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;

    // Check if docsCompleet is already set in persoon, otherwise calculate
    const isInitiallyComplete = persoon.docsCompleet || false;
    const [isExpanded, setIsExpanded] = useState(!isInitiallyComplete);
    const [workStatus, setWorkStatus] = useState(persoon.werkstatus || null);

    // Controlled-input state. Previously the inputs used defaultValue with no
    // onChange, so guarantor edits were never pushed back to the parent and
    // never saved — the persoon row was always empty in the DB.
    const [formData, setFormData] = useState({
        naam: persoon.naam || '',
        email: persoon.email || '',
        telefoon: persoon.telefoon || '',
        adres: persoon.adres || '',
        postcode: persoon.postcode || '',
        woonplaats: persoon.woonplaats || '',
        inkomen: persoon.inkomen != null && persoon.inkomen !== '' ? persoon.inkomen.toString() : '',
    });

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const requiredDocuments = getRequiredDocuments(workStatus, 'guarantor');
    const getDoc = (type) => (persoon.documenten || []).find(d => d.type === type);
    const isDocUploaded = (type) => {
        const doc = getDoc(type);
        return doc && doc.status === 'ontvangen';
    };

    // Only count required (verplicht) documents for completion check
    const verplichteDocs = requiredDocuments.filter(d => d.verplicht);
    const completedDocsCount = verplichteDocs.filter(d => isDocUploaded(d.type)).length;
    const totalDocsCount = verplichteDocs.length;
    const isComplete = totalDocsCount > 0 ? completedDocsCount === totalDocsCount : true;
    const progress = totalDocsCount > 0 ? Math.round((completedDocsCount / totalDocsCount) * 100) : 100;

    const calculateFormProgress = useCallback(() => {
        const requiredFields = [
            { key: 'naam', filled: formData.naam.trim() !== '' },
            { key: 'email', filled: formData.email.trim() !== '' },
            { key: 'telefoon', filled: formData.telefoon.trim() !== '' },
            { key: 'workStatus', filled: workStatus !== null },
        ];
        if (!hideIncome) {
            requiredFields.push({ key: 'inkomen', filled: formData.inkomen.toString().trim() !== '' });
        }
        const filledCount = requiredFields.filter(f => f.filled).length;
        return Math.round((filledCount / requiredFields.length) * 100);
    }, [formData.naam, formData.email, formData.telefoon, formData.inkomen, workStatus, hideIncome]);

    const formProgress = calculateFormProgress();

    // Notify parent of both form fields and document completion status.
    const onFormDataChangeRef = useRef(onFormDataChange);
    onFormDataChangeRef.current = onFormDataChange;

    useEffect(() => {
        if (onFormDataChangeRef.current) {
            onFormDataChangeRef.current(persoon.persoonId, {
                naam: formData.naam,
                email: formData.email,
                telefoon: formData.telefoon,
                adres: formData.adres,
                postcode: formData.postcode,
                woonplaats: formData.woonplaats,
                inkomen: formData.inkomen,
                workStatus,
                overallProgress: progress,
                isDocsComplete: isComplete,
                isFormComplete: formProgress === 100,
            });
        }
    }, [
        formData.naam, formData.email, formData.telefoon, formData.adres,
        formData.postcode, formData.woonplaats, formData.inkomen,
        workStatus, progress, isComplete, formProgress, persoon.persoonId,
    ]);

    const handleWorkStatusChange = (status) => {
        setWorkStatus(status);
    };

    // Return the promise so InlineDocumentUpload can await it and show an
    // "uploading…" state for the full duration of the actual upload.
    const handleLocalUpload = (type, file) => {
        return onDocumentUpload(persoon.persoonId, type, file);
    };

    return (
        <div className={styles.card}>
            <div
                className={styles.cardHeader}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className={styles.headerContent}>
                    <div className={styles.personInfo}>
                        <div className={styles.avatar}>🛡️</div>
                        <div className={styles.personDetails}>
                            <div className={styles.title}>{currentLang === 'en' ? 'Guarantor' : 'Garantsteller'}</div>
                            <div className={styles.personName}>{persoon.naam}</div>
                        </div>
                    </div>
                    <div className={styles.statusContainer}>
                        <div className={styles.statusText}>
                            <p className={styles.statusLabel}>{currentLang === 'en' ? 'Documents' : 'Documenten'}</p>
                            <p className={`${styles.statusPercentage} ${isComplete ? styles.percentageComplete : styles.percentageIncomplete}`}>
                                {progress}%
                            </p>
                        </div>
                        <div className={`${styles.statusBadge} ${isComplete ? styles.badgeComplete : styles.badgeIncomplete}`}>
                            {isComplete ? (
                                <>
                                    <CheckCircle size={16} />
                                    {currentLang === 'en' ? 'Complete' : 'Compleet'}
                                </>
                            ) : (
                                <>
                                    <AlertCircle size={16} />
                                    {currentLang === 'en' ? 'Missing' : 'Ontbreekt'}
                                </>
                            )}
                        </div>
                        {isExpanded ? <ChevronUp className={styles.dropdownIcon} /> : <ChevronDown className={styles.dropdownIcon} />}
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.cardContent}>
                    {readOnly && (
                        <div className={styles.readOnlyBanner}>
                            <AlertCircle size={16} />
                            <span>
                                {currentLang === 'en'
                                    ? 'These details are filled by the main tenant. You cannot edit them.'
                                    : 'Deze gegevens zijn ingevuld door de hoofdhuurder. U kunt deze niet bewerken.'}
                            </span>
                        </div>
                    )}
                    <div>
                        <div className={styles.formItem}>
                            <label className={styles.label}>{currentLang === 'en' ? 'Full Name' : 'Volledige Naam'} *</label>
                            <input
                                className={styles.input}
                                placeholder={currentLang === 'en' ? 'John Doe' : 'Jan Jansen'}
                                value={formData.naam}
                                onChange={(e) => handleInputChange('naam', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>

                        <div className={styles.formItem}>
                            <label className={styles.label}>Email *</label>
                            <input
                                className={styles.input}
                                type="email"
                                placeholder="naam@voorbeeld.nl"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>

                        <div className={styles.formItem}>
                            <label className={styles.label}>
                                {currentLang === 'en' ? 'Phone number' : 'Telefoonnummer'} *
                            </label>
                            <input
                                type="tel"
                                className={`${styles.input} ${isPhoneDuplicate && formData.telefoon && isPhoneDuplicate(formData.telefoon, persoon.persoonId) ? styles.inputError : ''}`}
                                placeholder="+31 6 12345678"
                                value={formData.telefoon}
                                onChange={(e) => handleInputChange('telefoon', e.target.value)}
                                disabled={readOnly}
                            />
                            {isPhoneDuplicate && formData.telefoon && isPhoneDuplicate(formData.telefoon, persoon.persoonId) && (
                                <p className={styles.fieldError}>
                                    {(() => {
                                        const en = currentLang === 'en';
                                        const roleLabels = en
                                            ? { Hoofdhuurder: 'main tenant', Medehuurder: 'co-tenant', Garantsteller: 'guarantor' }
                                            : { Hoofdhuurder: 'hoofdhuurder', Medehuurder: 'medehuurder', Garantsteller: 'garantsteller' };
                                        const conflict = getPhoneConflict ? getPhoneConflict(formData.telefoon, persoon.persoonId) : null;
                                        if (conflict) {
                                            const label = roleLabels[conflict.rol] || conflict.rol;
                                            const namePart = conflict.naam ? ` (${conflict.naam})` : '';
                                            return en
                                                ? `This phone number is already used as ${label}${namePart} in this application. Each person can only have one role per application.`
                                                : `Dit telefoonnummer wordt al gebruikt als ${label}${namePart} in deze aanvraag. Elke persoon kan maar één rol per aanvraag hebben.`;
                                        }
                                        return en
                                            ? 'This phone number is already used by another person in this application'
                                            : 'Dit telefoonnummer wordt al gebruikt door een andere persoon in deze aanvraag';
                                    })()}
                                </p>
                            )}
                        </div>

                        <div className={styles.grid}>
                            <div className={styles.formItem}>
                                <label className={styles.label}>{currentLang === 'en' ? 'Current Address' : 'Huidig Adres'}</label>
                                <input
                                    className={styles.input}
                                    placeholder={currentLang === 'en' ? 'Street 123' : 'Straat 123'}
                                    value={formData.adres}
                                    onChange={(e) => handleInputChange('adres', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                            <div className={styles.formItem}>
                                <label className={styles.label}>{currentLang === 'en' ? 'Postcode' : 'Postcode'}</label>
                                <input
                                    className={styles.input}
                                    placeholder="1234 AB"
                                    value={formData.postcode}
                                    onChange={(e) => handleInputChange('postcode', e.target.value)}
                                    disabled={readOnly}
                                />
                            </div>
                        </div>

                        <div className={styles.formItem}>
                            <label className={styles.label}>{currentLang === 'en' ? 'City' : 'Woonplaats'}</label>
                            <input
                                className={styles.input}
                                placeholder={currentLang === 'en' ? 'Amsterdam' : 'Amsterdam'}
                                value={formData.woonplaats}
                                onChange={(e) => handleInputChange('woonplaats', e.target.value)}
                                disabled={readOnly}
                            />
                        </div>

                        <div className={styles.formItem}>
                            <label className={styles.label}>💼 {currentLang === 'en' ? 'Work Status' : 'Werkstatus'} *</label>
                            <GuarantorWorkStatusSelector selected={workStatus} onChange={readOnly ? undefined : handleWorkStatusChange} disabled={readOnly} />
                        </div>

                        {!hideIncome && (
                            <div className={styles.formItem}>
                                <label className={styles.label}>{currentLang === 'en' ? 'Gross Annual Income' : 'Bruto Jaarinkomen'} *</label>
                                <div className={styles.inputWrapper}>
                                    <span className={styles.currencyPrefix}>€</span>
                                    <input
                                        className={`${styles.input} ${styles.inputWithPrefix}`}
                                        type="number"
                                        placeholder="45000"
                                        value={formData.inkomen}
                                        onChange={(e) => handleInputChange('inkomen', e.target.value)}
                                        disabled={readOnly}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.documentsSection}>
                        <p className={styles.sectionTitle}>📎 {currentLang === 'en' ? 'Required Documents' : 'Benodigde Documenten'}</p>
                        {!workStatus ? (
                            <div className={styles.workStatusWarning}>
                                💡 {currentLang === 'en' ? 'Please select a work status first.' : 'Selecteer eerst een werkstatus.'}
                            </div>
                        ) : (
                            <>
                                <p className={styles.statusContext}>
                                    {currentLang === 'en' ? 'For Guarantor' : 'Voor Garantsteller'} ({workStatusLabels[currentLang]?.[workStatus] || workStatus})
                                </p>
                                <div className={styles.documentsList}>
                                    {requiredDocuments.map((doc) => {
                                        const docData = getDoc(doc.type);
                                        const labels = documentTypeLabels[currentLang] || documentTypeLabels.en || {};
                                        const labelData = labels[doc.type] || {};
                                        const title = labelData.name || doc.type;
                                        const description = labelData.description || doc.description;
                                        return (
                                            <InlineDocumentUpload
                                                key={doc.type}
                                                documentType={title}
                                                description={description}
                                                verplicht={doc.verplicht}
                                                status={isDocUploaded(doc.type) ? 'ontvangen' : 'ontbreekt'}
                                                fileName={docData?.file?.name}
                                                onUpload={readOnly ? undefined : (f) => handleLocalUpload(doc.type, f)}
                                                onRemove={readOnly ? undefined : (onDocumentRemove ? () => onDocumentRemove(persoon.persoonId, doc.type) : undefined)}
                                                readOnly={readOnly}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.actions}>
                        {onRemove && !readOnly && (
                            <button className={styles.removeButton} onClick={() => onRemove(persoon.persoonId)}>
                                <Trash2 size={16} />
                                {currentLang === 'en' ? 'Remove Guarantor' : 'Garantsteller verwijderen'}
                            </button>
                        )}
                        <button className={styles.collapseButton} onClick={() => setIsExpanded(false)}>
                            <ChevronUp size={16} />
                            {currentLang === 'en' ? 'Collapse' : 'Inklappen'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const GuarantorFormSection = ({
    guarantors,
    onDocumentUpload,
    onDocumentRemove,
    onSendWhatsAppLink,
    onAddGuarantor,
    onRemove,
    onFormDataChange,
    isPhoneDuplicate,
    getPhoneConflict,
    readOnly = false,
    hideIncome = false
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {guarantors.map((guarantor) => (
                <GuarantorCard
                    key={guarantor.persoonId}
                    persoon={guarantor}
                    onDocumentUpload={onDocumentUpload}
                    onDocumentRemove={onDocumentRemove}
                    onSendWhatsAppLink={onSendWhatsAppLink}
                    onRemove={onRemove}
                    onFormDataChange={onFormDataChange}
                    isPhoneDuplicate={isPhoneDuplicate}
                    getPhoneConflict={getPhoneConflict}
                    readOnly={readOnly}
                    hideIncome={hideIncome}
                />
            ))}
        </div>
    );
};

export default GuarantorFormSection;
