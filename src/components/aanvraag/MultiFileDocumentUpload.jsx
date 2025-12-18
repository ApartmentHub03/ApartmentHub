import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Upload, CheckCircle, AlertCircle, File, X } from 'lucide-react';
import { translations } from '../../data/translations';
import styles from './MultiFileDocumentUpload.module.css';

const MultiFileDocumentUpload = ({
    documentType,
    description,
    verplicht = true,
    maxFiles = 3,
    minFiles = 1,
    uploadedFiles = [],
    onUpload,
    onRemove
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        handleFilesUpload(files);
    };

    const handleFileSelect = (e) => {
        const files = e.target.files ? Array.from(e.target.files) : [];
        handleFilesUpload(files);
    };

    const handleFilesUpload = async (files) => {
        const remainingSlots = maxFiles - uploadedFiles.length;
        if (files.length > remainingSlots) {
            alert(`Too many files. First ${remainingSlots} will be added.`);
        }

        const filesToAdd = files.slice(0, remainingSlots);
        const validFiles = [];
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

        for (const file of filesToAdd) {
            if (!allowedTypes.includes(file.type)) {
                console.warn(`Skipping invalid type: ${file.name}`);
                continue;
            }
            if (file.size > 10 * 1024 * 1024) {
                console.warn(`Skipping too large: ${file.name}`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length > 0) {
            setUploading(true);
            setTimeout(() => {
                onUpload([...uploadedFiles, ...validFiles]);
                setUploading(false);
            }, 800);
        }
    };

    const isComplete = uploadedFiles.length >= minFiles;
    const canUploadMore = uploadedFiles.length < maxFiles;
    const isFullyComplete = uploadedFiles.length >= maxFiles;

    // Completed state with files - match InlineDocumentUpload styling
    if (uploadedFiles.length > 0) {
        return (
            <div className={isFullyComplete ? styles.uploadCardReceived : styles.uploadCardPartial}>
                <div className={styles.contentWrapper}>
                    <div className={styles.topRow}>
                        <div className={isFullyComplete ? styles.iconWrapperReceived : styles.iconWrapperPartial}>
                            <CheckCircle className={isFullyComplete ? styles.iconReceived : styles.iconPartial} />
                        </div>
                        <div className={styles.textContainer}>
                            <p className={isFullyComplete ? styles.titleReceived : styles.titlePartial}>{documentType}</p>
                            <p className={isFullyComplete ? styles.receivedSubtitle : styles.partialSubtitle}>
                                {uploadedFiles.length}/{maxFiles} {isFullyComplete ? '✓ Complete' : 'uploaded'}
                            </p>
                            <div className={styles.fileListCompact}>
                                {uploadedFiles.map((file, index) => (
                                    <div key={index} className={styles.fileItemCompact}>
                                        <File className={styles.fileIconSmall} />
                                        <span className={styles.fileNameCompact}>{file.name}</span>
                                        <span className={styles.fileSizeCompact}>{(file.size / 1024).toFixed(0)} KB</span>
                                        <button
                                            type="button"
                                            className={styles.removeButtonCompact}
                                            onClick={() => onRemove(index)}
                                        >
                                            <X className={styles.removeIconSmall} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {canUploadMore && (
                                <p className={styles.uploadMoreHintCompact}>
                                    📎 You can add {maxFiles - uploadedFiles.length} more file(s)
                                </p>
                            )}
                        </div>
                    </div>
                    <label className={styles.cursorPointer}>
                        <input
                            type="file"
                            className={styles.hiddenInput}
                            accept=".pdf,.jpg,.jpeg,.png,.webp"
                            onChange={handleFileSelect}
                            disabled={uploading}
                            multiple
                        />
                        <button type="button" className={styles.changeButton} disabled={uploading}>
                            <Upload className={styles.changeIcon} />
                            Upload more
                        </button>
                    </label>
                </div>
            </div>
        );
    }

    // Default upload state
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
                            📎 Upload minimum {minFiles} file(s), maximum {maxFiles}
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
                        multiple
                    />
                    <button type="button" className={styles.uploadButton} disabled={uploading}>
                        <Upload className={styles.uploadIcon} />
                        Upload
                    </button>
                </label>
            </div>
            <p className={styles.footer}>
                <File className={styles.footerIcon} />
                PDF, JPG, PNG, WEBP - Max 10MB per file
            </p>
        </div>
    );
};

export default MultiFileDocumentUpload;
