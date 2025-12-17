import React from 'react';
import { useSelector } from 'react-redux';
import { Upload, Send } from 'lucide-react';
import { translations } from '../../data/translations';
import styles from './UploadChoiceModal.module.css';

const UploadChoiceModal = ({
    open,
    onOpenChange,
    role,
    onSelfUpload,
    onSendLink
}) => {
    const currentLang = useSelector((state) => state.ui.language);
    const tChoice = translations.uploadChoice[currentLang] || translations.uploadChoice.nl;

    if (!open) return null;

    const handleSelfUpload = () => {
        onSelfUpload();
        onOpenChange(false);
    };

    const handleSendLink = () => {
        onSendLink();
        onOpenChange(false);
    };

    const icon = role === 'Medehuurder' ? '👥' : '🛡️';

    // Helper to replace {{role}}
    const replaceRole = (text) => text.replace('{{role}}', role);

    const localizedTitle = replaceRole(tChoice.title);
    const localizedSendLink = replaceRole(tChoice.sendLinkDesc);
    const localizedAddBtn = replaceRole(tChoice.forRole);

    return (
        <div className={styles.overlay} onClick={() => onOpenChange(false)}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3 className={styles.title}>
                        {icon} {localizedTitle}
                    </h3>
                    <p className={styles.subtitle}>
                        {tChoice.subtitle}
                    </p>
                </div>

                <div className={styles.optionsContainer}>
                    <button className={`${styles.optionButton} ${styles.selfUploadButton}`} onClick={handleSelfUpload}>
                        <div className={`${styles.iconWrapper} ${styles.selfUploadIconWrapper}`}>
                            <Upload className={styles.icon} />
                        </div>
                        <div className={styles.buttonText}>
                            <div className={styles.buttonTitle}>
                                {tChoice.uploadSelf}
                            </div>
                            <div className={styles.buttonDesc}>
                                {tChoice.uploadSelfDesc}
                            </div>
                        </div>
                    </button>

                    <button className={`${styles.optionButton} ${styles.linkButton}`} onClick={handleSendLink}>
                        <div className={`${styles.iconWrapper} ${styles.linkIconWrapper}`}>
                            <Send className={`${styles.icon} ${styles.linkIcon}`} />
                        </div>
                        <div className={styles.buttonText}>
                            <div className={styles.buttonTitle}>
                                {tChoice.sendLink}
                            </div>
                            <div className={`${styles.buttonDesc} ${styles.linkButtonDesc}`}>
                                {localizedSendLink}
                            </div>
                        </div>
                    </button>

                    {/* Role Indicator if needed, or included in title already */}
                </div>
            </div>
        </div>
    );
};

export default UploadChoiceModal;
