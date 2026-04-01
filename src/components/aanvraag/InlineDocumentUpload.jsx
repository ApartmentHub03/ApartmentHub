import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Upload, CheckCircle, AlertCircle, File, RefreshCw, Trash2 } from 'lucide-react';
import { translations } from '../../data/translations';
import styles from './InlineDocumentUpload.module.css';

const InlineDocumentUpload = ({
    documentType,
    description,
    verplicht = true,
    status,
    fileName,
    onUpload,
    onRemove
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) handleUpload(file);
    };

    const handleUpload = (file) => {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            alert('Invalid file type');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            alert('File too large');
            return;
        }

        setUploading(true);
        setTimeout(() => {
            onUpload(file);
            setUploading(false);
        }, 800);
    };

    if (status === 'ontvangen') {
        return (
            <div className={styles.uploadCardReceived}>
                <div className={styles.contentWrapper}>
                    <div className={styles.topRow}>
                        <div className={styles.iconWrapperReceived}>
                            <CheckCircle className={styles.iconReceived} />
                        </div>
                        <div className={styles.textContainer}>
                            <p className={styles.titleReceived}>{documentType}</p>
                            <p className={styles.receivedFilename}>
                                <File className={styles.iconSmall} />
                                {fileName || 'Document uploaded'}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem' }}>
                        <label className={styles.cursorPointer}>
                            <input
                                type="file"
                                className={styles.hiddenInput}
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={handleFileSelect}
                                disabled={uploading}
                            />
                            <button type="button" className={styles.changeButton} disabled={uploading}>
                                <RefreshCw className={styles.iconSmall} />
                                Change
                            </button>
                        </label>
                        {onRemove && (
                            <button
                                type="button"
                                onClick={() => onRemove()}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                    padding: '0.25rem 0.5rem', borderRadius: '0.25rem',
                                    background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                                    cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'inherit'
                                }}
                            >
                                <Trash2 style={{ width: '0.75rem', height: '0.75rem' }} />
                                Remove
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className={`${styles.uploadCard} ${isDragging ? styles.uploadCardDragging : ''}`}
            onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <div className={styles.contentWrapper}>
                <div className={styles.topRow}>
                    <div className={`${styles.iconWrapper} ${verplicht ? styles.iconWrapperRequired : styles.iconWrapperOptional}`}>
                        <AlertCircle className={`${styles.icon} ${verplicht ? styles.iconRequired : styles.iconOptional}`} />
                    </div>
                    <div className={styles.textContainer}>
                        <div className={styles.titleRow}>
                            <p className={styles.title}>{documentType}</p>
                            {!verplicht && (
                                <span className={styles.optionalBadge}>optional</span>
                            )}
                        </div>
                        {description && <p className={styles.description}>{description}</p>}
                        <p className={styles.dragText}>
                            📎 Drag files or click to upload
                        </p>
                    </div>
                </div>
                <label className={styles.uploadLabelWrapper}>
                    <input
                        type="file"
                        className={styles.hiddenInput}
                        accept=".pdf,.jpg,.jpeg,.png,.webp"
                        onChange={handleFileSelect}
                        disabled={uploading}
                    />
                    <button type="button" className={styles.uploadButton} disabled={uploading}>
                        <Upload className={styles.uploadIcon} />
                        Upload
                    </button>
                </label>
            </div>
            <p className={styles.footer}>
                <File className={styles.footerIcon} />
                PDF, JPG, PNG, WEBP - Max 10MB
            </p>
        </div>
    );
};

export default InlineDocumentUpload;
