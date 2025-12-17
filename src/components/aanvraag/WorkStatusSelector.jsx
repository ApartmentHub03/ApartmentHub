import React from 'react';
import { useSelector } from 'react-redux';
import { GraduationCap, Briefcase, Users } from 'lucide-react';
import { translations } from '../../data/translations';
import styles from './WorkStatusSelector.module.css';

const WorkStatusSelector = ({ selected, onChange }) => {
    const currentLang = useSelector((state) => state.ui.language);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;

    const options = [
        {
            value: "student",
            label: currentLang === 'en' ? 'Student' : 'Student',
            emoji: "🎓",
            icon: GraduationCap,
            gradientClass: styles.studentGradient
        },
        {
            value: "werknemer",
            label: currentLang === 'en' ? 'Employee' : 'Werknemer',
            emoji: "💼",
            icon: Briefcase,
            gradientClass: styles.employeeGradient
        },
        {
            value: "ondernemer",
            label: currentLang === 'en' ? 'Entrepreneur' : 'Ondernemer',
            emoji: "🏢",
            icon: Users,
            gradientClass: styles.entrepreneurGradient
        }
    ];

    return (
        <div className={styles.container}>
            {options.map((option) => {
                const Icon = option.icon;
                const isSelected = selected === option.value;
                const buttonClass = isSelected
                    ? `${styles.optionButton} ${styles.optionButtonSelected} ${option.gradientClass}`
                    : `${styles.optionButton} ${styles.optionButtonOutline}`;

                return (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onChange(option.value)}
                        className={buttonClass}
                    >
                        <div className={styles.iconWrapper}>
                            <Icon className={styles.icon} />
                        </div>
                        <div className={styles.labelContainer}>
                            <span className={styles.emoji}>{option.emoji}</span>
                            <span className={styles.labelText}>{option.label}</span>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default WorkStatusSelector;
