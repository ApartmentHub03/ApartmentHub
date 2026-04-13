'use client';

import styles from '../seo.module.css';

export function SkeletonCard() {
    return <div className={`${styles.skeleton} ${styles.skeletonTall}`} />;
}

export function SkeletonBlock() {
    return <div className={`${styles.skeleton} ${styles.skeletonBlock}`} />;
}
