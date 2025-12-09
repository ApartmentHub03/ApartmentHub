import React from 'react';
import { Clock } from 'lucide-react';
import styles from '../../pages/RentIn.module.css';

const HeroSection = ({ title, subtitle }) => {
    return (
        <section className={styles.heroSection}>
            <div className={styles.heroContainer}>
                <h1 className={styles.heroTitle}>{title}</h1>
                <p className={styles.heroSubtitle}>{subtitle}</p>
            </div>
        </section>
    );
};

export default HeroSection;
