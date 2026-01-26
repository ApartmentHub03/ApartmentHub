import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { ChevronDown, CheckCircle, Upload, Send, Trash2, ChevronUp, AlertCircle } from 'lucide-react';
import { translations } from '../../data/translations';
import { getRequiredDocuments } from '../../utils/documentRequirements';
import { documentTypeLabels } from '../../config/documentRequirements';
import WorkStatusSelector from './WorkStatusSelector';
import InlineDocumentUpload from './InlineDocumentUpload';
import MultiFileDocumentUpload from './MultiFileDocumentUpload';
import { Card, CardTitle, CardContent } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import styles from './TenantFormSection.module.css';

const TenantFormSection = ({
    persoon,
    onDocumentUpload,
    onSendWhatsAppLink,
    onRemove,
    onFormDataChange,
    showUploadChoice = false
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;
    const tForm = translations.tenantForm[currentLang] || translations.tenantForm.en;

    // Form state - controlled inputs
    const [formData, setFormData] = useState({
        naam: persoon.naam || '',
        email: persoon.email || '',
        telefoon: persoon.telefoon || '',
        adres: persoon.adres || '',
        postcode: persoon.postcode || '',
        woonplaats: persoon.woonplaats || '',
        inkomen: persoon.inkomen || ''
    });

    // State
    const [isExpanded, setIsExpanded] = useState(true);
    const [uploadMethod, setUploadMethod] = useState(null);
    const [workStatus, setWorkStatus] = useState(persoon.werkstatus || null);

    // Sync formData and workStatus when persoon prop changes (e.g., when data loads from DB)
    useEffect(() => {
        // Only update if persoon has meaningful data (has supabaseId or has name/email filled)
        // This prevents overwriting user input during initial render
        if (persoon.supabaseId || persoon.naam || persoon.email) {
            setFormData({
                naam: persoon.naam || '',
                email: persoon.email || '',
                telefoon: persoon.telefoon || '',
                adres: persoon.adres || '',
                postcode: persoon.postcode || '',
                woonplaats: persoon.woonplaats || '',
                inkomen: persoon.inkomen != null && persoon.inkomen !== '' ? persoon.inkomen.toString() : ''
            });
            if (persoon.werkstatus) {
                setWorkStatus(persoon.werkstatus);
            }
        }
    }, [persoon.persoonId, persoon.supabaseId, persoon.naam, persoon.email, persoon.telefoon, persoon.adres, persoon.postcode, persoon.woonplaats, persoon.inkomen, persoon.werkstatus]);

    // Derived
    const requiredDocuments = getRequiredDocuments(workStatus, 'tenant');
    const getDoc = (type) => (persoon.documenten || []).find(d => d.type === type);
    const isDocUploaded = (type) => {
        const doc = getDoc(type);
        return doc && doc.status === 'ontvangen';
    };

    // Calculate form completion (required fields: name, email, phone, workStatus, income)
    const calculateFormProgress = useCallback(() => {
        const requiredFields = [
            { key: 'naam', filled: formData.naam.trim() !== '' },
            { key: 'email', filled: formData.email.trim() !== '' },
            { key: 'telefoon', filled: formData.telefoon.trim() !== '' },
            { key: 'workStatus', filled: workStatus !== null },
            { key: 'inkomen', filled: formData.inkomen.toString().trim() !== '' }
        ];

        const filledCount = requiredFields.filter(f => f.filled).length;
        return Math.round((filledCount / requiredFields.length) * 100);
    }, [formData.naam, formData.email, formData.telefoon, formData.inkomen, workStatus]);

    // Calculate document completion
    const calculateDocProgress = useCallback(() => {
        if (!workStatus) return 0;
        const requiredDocs = requiredDocuments.filter(d => d.verplicht);
        if (requiredDocs.length === 0) return 100;
        const uploadedRequiredDocs = requiredDocs.filter(d => isDocUploaded(d.type)).length;
        return Math.round((uploadedRequiredDocs / requiredDocs.length) * 100);
    }, [workStatus, requiredDocuments, persoon.documenten]);

    // Overall progress: 60% form completion + 40% document completion
    const formProgress = calculateFormProgress();
    const docProgress = calculateDocProgress();
    const overallProgress = Math.round((formProgress * 0.6) + (docProgress * 0.4));

    // Store callback in ref to avoid dependency issues
    const onFormDataChangeRef = React.useRef(onFormDataChange);
    onFormDataChangeRef.current = onFormDataChange;

    // Notify parent of changes - only when progress values change
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
                formProgress,
                docProgress,
                overallProgress,
                isFormComplete: formProgress === 100,
                isDocsComplete: docProgress === 100
            });
        }
    }, [formProgress, docProgress, overallProgress, persoon.persoonId, formData.naam, formData.email, formData.telefoon, formData.adres, formData.postcode, formData.woonplaats, formData.inkomen, workStatus]);

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleWorkStatusChange = (status) => {
        setWorkStatus(status);
    };

    const handleLocalUpload = (type, file) => {
        onDocumentUpload(persoon.persoonId, type, file);
    };

    const handleMultiFileUpload = (type, files) => {
        onDocumentUpload(persoon.persoonId, type, files);
    };

    const handleMultiFileRemove = (type, indexToRemove) => {
        const docData = getDoc(type);
        if (docData?.files) {
            const newFiles = docData.files.filter((_, idx) => idx !== indexToRemove);
            onDocumentUpload(persoon.persoonId, type, newFiles);
        }
    };

    // Progress for display
    const completedDocs = requiredDocuments.filter(d => d.verplicht && isDocUploaded(d.type)).length;
    const totalRequiredDocs = requiredDocuments.filter(d => d.verplicht).length;
    const isComplete = overallProgress === 100;

    return (
        <Card className={styles.tenantCard}>
            {/* Header */}
            <div
                className={styles.cardHeader}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className={styles.headerLeft}>
                    <div className={styles.avatar}>
                        {isComplete ? <CheckCircle className="h-6 w-6" /> : (formData.naam?.[0]?.toUpperCase() || 'J')}
                    </div>
                    <div className={styles.headerInfo}>
                        <h3 className={styles.roleTitle}>
                            {persoon.rol === 'Hoofdhuurder' ? 'MAIN TENANT' : persoon.rol?.toUpperCase()}
                        </h3>
                        <p className={styles.personName}>
                            {formData.naam || tForm.newTenant}
                        </p>
                    </div>
                </div>

                <div className={styles.headerRight}>
                    <div className={styles.documentsProgress}>
                        <span className={styles.documentsLabel}>Documents</span>
                        <span className={`${styles.documentsPercent} ${isComplete ? styles.percentComplete : styles.percentIncomplete}`}>
                            {overallProgress}%
                        </span>
                    </div>

                    {!isComplete ? (
                        <Badge variant="warning" pulse className={styles.statusBadge}>
                            <AlertCircle className="h-4 w-4" />
                            Missing
                        </Badge>
                    ) : (
                        <Badge variant="success" className={styles.statusBadge}>
                            <CheckCircle className="h-4 w-4" />
                            Complete
                        </Badge>
                    )}

                    <ChevronUp className={`${styles.chevron} ${isExpanded ? '' : styles.chevronCollapsed}`} />
                </div>
            </div>

            {/* Content */}
            {isExpanded && (
                <CardContent className={styles.cardContent}>
                    {/* Form Fields */}
                    <div className={styles.formSection}>
                        {/* Full Name */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{tForm.fullName} *</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                placeholder="Jan Jansen"
                                value={formData.naam}
                                onChange={(e) => handleInputChange('naam', e.target.value)}
                            />
                        </div>

                        {/* Email */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{tForm.email} *</label>
                            <input
                                type="email"
                                className={styles.formInput}
                                placeholder="john@example.com"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                            />
                        </div>

                        {/* Phone Number */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>
                                {currentLang === 'en' ? 'Phone number' : 'Telefoonnummer'} *
                            </label>
                            <input
                                type="tel"
                                className={styles.formInput}
                                placeholder="+31 6 12345678"
                                value={formData.telefoon}
                                onChange={(e) => handleInputChange('telefoon', e.target.value)}
                            />
                        </div>

                        {/* Work Status */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>💼 {tForm.workStatus} *</label>
                            <WorkStatusSelector
                                selected={workStatus}
                                onChange={handleWorkStatusChange}
                                labels={{
                                    student: tForm.student,
                                    employee: tForm.employee,
                                    entrepreneur: tForm.entrepreneur
                                }}
                            />
                        </div>

                        {/* Address Row */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{tForm.currentAddress}</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="Street 123"
                                    value={formData.adres}
                                    onChange={(e) => handleInputChange('adres', e.target.value)}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>{tForm.postcode}</label>
                                <input
                                    type="text"
                                    className={styles.formInput}
                                    placeholder="1234 AB"
                                    value={formData.postcode}
                                    onChange={(e) => handleInputChange('postcode', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* City */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{tForm.city}</label>
                            <input
                                type="text"
                                className={styles.formInput}
                                placeholder="Amsterdam"
                                value={formData.woonplaats}
                                onChange={(e) => handleInputChange('woonplaats', e.target.value)}
                            />
                        </div>

                        {/* Income */}
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>{tForm.income} *</label>
                            <div className={styles.inputWithPrefix}>
                                <span className={styles.inputPrefix}>€</span>
                                <input
                                    type="number"
                                    className={`${styles.formInput} ${styles.inputHasPrefix}`}
                                    placeholder="45000"
                                    value={formData.inkomen}
                                    onChange={(e) => handleInputChange('inkomen', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Documents Section */}
                    <div className={styles.documentsSection}>
                        <p className={styles.documentsSectionTitle}>📎 {tForm.documentsTitle}</p>

                        {!workStatus ? (
                            <div className={styles.selectWorkStatusWarning}>
                                💡 {tForm.pleaseSelectWorkStatus}
                            </div>
                        ) : (
                            <>
                                <div className={styles.documentsHeader}>
                                    <span className={styles.forRoleText}>
                                        For {workStatus === 'student' ? 'Student' : workStatus === 'werknemer' ? 'Employee' : 'Entrepreneur'}
                                    </span>
                                    <button
                                        className={styles.changeMethodButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setUploadMethod(null);
                                        }}
                                    >
                                        Choose another method
                                    </button>
                                </div>

                                <div className={styles.documentsList}>
                                    {requiredDocuments.map((doc) => {
                                        const docData = getDoc(doc.type);
                                        const files = docData?.files || [];
                                        const file = docData?.file;

                                        const labels = documentTypeLabels[currentLang] || documentTypeLabels['en'] || {};
                                        const labelData = labels[doc.type] || {};
                                        const title = labelData.name || doc.type;
                                        const description = labelData.description || doc.description;

                                        if (doc.multiFile) {
                                            return (
                                                <MultiFileDocumentUpload
                                                    key={doc.type}
                                                    documentType={title}
                                                    description={description}
                                                    verplicht={doc.verplicht}
                                                    minFiles={doc.minFiles}
                                                    maxFiles={doc.maxFiles}
                                                    uploadedFiles={files}
                                                    onUpload={(f) => handleMultiFileUpload(doc.type, f)}
                                                    onRemove={(idx) => handleMultiFileRemove(doc.type, idx)}
                                                />
                                            );
                                        }
                                        return (
                                            <InlineDocumentUpload
                                                key={doc.type}
                                                documentType={title}
                                                description={description}
                                                verplicht={doc.verplicht}
                                                status={isDocUploaded(doc.type) ? 'ontvangen' : 'ontbreekt'}
                                                fileName={file?.name}
                                                onUpload={(f) => handleLocalUpload(doc.type, f)}
                                                onRemove={() => { }}
                                            />
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Actions */}
                    <div className={styles.actionsRow}>
                        {persoon.rol === 'Medehuurder' && onRemove && (
                            <button
                                className={styles.removeButton}
                                onClick={() => onRemove(persoon.persoonId)}
                            >
                                <Trash2 className="h-4 w-4" />
                                {tForm.removeTenant}
                            </button>
                        )}
                        <button
                            className={styles.collapseButton}
                            onClick={() => setIsExpanded(false)}
                        >
                            <ChevronUp className="h-4 w-4" />
                            {tForm.collapse}
                        </button>
                    </div>
                </CardContent>
            )}
        </Card>
    );
};

export default TenantFormSection;
