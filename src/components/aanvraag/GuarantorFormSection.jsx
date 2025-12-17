import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { translations } from '../../data/translations';
import GuarantorWorkStatusSelector from './GuarantorWorkStatusSelector';
import InlineDocumentUpload from './InlineDocumentUpload';
import { getRequiredDocuments } from '../../utils/documentRequirements';
import styles from './GuarantorFormSection.module.css';

const GuarantorCard = ({
    persoon,
    onDocumentUpload,
    onSendWhatsAppLink,
    onRemove
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;

    // Check if docsCompleet is already set in persoon, otherwise calculate
    const isInitiallyComplete = persoon.docsCompleet || false;
    const [isExpanded, setIsExpanded] = useState(!isInitiallyComplete);
    const [workStatus, setWorkStatus] = useState(persoon.werkstatus || null);

    const requiredDocuments = getRequiredDocuments(workStatus, 'guarantor');
    const getDoc = (type) => (persoon.documenten || []).find(d => d.type === type);
    const isDocUploaded = (type) => {
        const doc = getDoc(type);
        return doc && doc.status === 'ontvangen';
    };

    const completedDocsCount = requiredDocuments.filter(d => isDocUploaded(d.type)).length;
    const totalDocsCount = requiredDocuments.length;
    // Recalculate completeness based on current status
    const isComplete = totalDocsCount > 0 && completedDocsCount === totalDocsCount;
    // Assume progress calculation
    const progress = totalDocsCount > 0 ? Math.round((completedDocsCount / totalDocsCount) * 100) : 0;

    const handleWorkStatusChange = (status) => {
        setWorkStatus(status);
        // Should lift this up if needed
    };

    const handleLocalUpload = (type, file) => {
        onDocumentUpload(persoon.persoonId, type, file);
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
                    <div className={styles.formItem}>
                        <label className={styles.label}>{currentLang === 'en' ? 'Full Name' : 'Volledige Naam'} *</label>
                        <input className={styles.input} placeholder={currentLang === 'en' ? 'John Doe' : 'Jan Jansen'} defaultValue={persoon.naam} />
                    </div>

                    <div className={styles.formItem}>
                        <label className={styles.label}>Email *</label>
                        <input className={styles.input} type="email" placeholder="naam@voorbeeld.nl" defaultValue={persoon.email} />
                    </div>

                    <div className={styles.grid}>
                        <div className={styles.formItem}>
                            <label className={styles.label}>{currentLang === 'en' ? 'Current Address' : 'Huidig Adres'}</label>
                            <input className={styles.input} placeholder={currentLang === 'en' ? 'Street 123' : 'Straat 123'} />
                        </div>
                        <div className={styles.formItem}>
                            <label className={styles.label}>{currentLang === 'en' ? 'Postcode' : 'Postcode'}</label>
                            <input className={styles.input} placeholder="1234 AB" />
                        </div>
                    </div>

                    <div className={styles.formItem}>
                        <label className={styles.label}>{currentLang === 'en' ? 'City' : 'Woonplaats'}</label>
                        <input className={styles.input} placeholder={currentLang === 'en' ? 'Amsterdam' : 'Amsterdam'} />
                    </div>

                    <div className={styles.formItem}>
                        <label className={styles.label}>💼 {currentLang === 'en' ? 'Work Status' : 'Werkstatus'} *</label>
                        <GuarantorWorkStatusSelector selected={workStatus} onChange={handleWorkStatusChange} />
                    </div>

                    <div className={styles.formItem}>
                        <label className={styles.label}>{currentLang === 'en' ? 'Gross Annual Income' : 'Bruto Jaarinkomen'} *</label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.currencyPrefix}>€</span>
                            <input className={`${styles.input} ${styles.inputWithPrefix}`} type="number" placeholder="45000" />
                        </div>
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
                                    {currentLang === 'en' ? 'For Guarantor' : 'Voor Garantsteller'} ({workStatus})
                                </p>
                                <div className={styles.documentsList}>
                                    {requiredDocuments.map((doc) => {
                                        const docData = getDoc(doc.type);
                                        return (
                                            <InlineDocumentUpload
                                                key={doc.type}
                                                documentType={doc.type} // Should translate
                                                description={doc.description}
                                                verplicht={doc.verplicht}
                                                status={isDocUploaded(doc.type) ? 'ontvangen' : 'ontbreekt'}
                                                fileName={docData?.file?.name}
                                                onUpload={(f) => handleLocalUpload(doc.type, f)}
                                                onRemove={() => { }}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    <div className={styles.actions}>
                        {onRemove && (
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
    onSendWhatsAppLink,
    onAddGuarantor,
    onRemove
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {guarantors.map((guarantor) => (
                <GuarantorCard
                    key={guarantor.persoonId}
                    persoon={guarantor}
                    onDocumentUpload={onDocumentUpload}
                    onSendWhatsAppLink={onSendWhatsAppLink}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
};

export default GuarantorFormSection;
