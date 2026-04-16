'use client';

import { useState } from 'react';
import { useAdminFetch } from '@/hooks/useAdminFetch';
import { SkeletonBlock } from './SkeletonCard';
import styles from '../seo.module.css';

/**
 * Wraps a Semrush endpoint that we don't auto-fetch to conserve API units.
 * Shows a "Load" button until the user triggers the fetch; afterwards behaves
 * like the standard data section. Once loaded (and cached server-side for 24h),
 * the button is removed.
 *
 * @param {string} title - Section heading
 * @param {string} subtitle - Description shown under heading
 * @param {string} url - Backend endpoint
 * @param {number} unitsEstimate - Estimated API-unit cost for user warning
 * @param {(data: any) => React.ReactNode} children - Renderer for loaded data
 */
export default function LazySection({ title, subtitle, url, unitsEstimate, children }) {
    const [armed, setArmed] = useState(false);
    const { data, loading, error } = useAdminFetch(armed ? url : null, { lazy: !armed });

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>{title}</h3>
            {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}

            {!armed ? (
                <div className={styles.lazyPrompt}>
                    <p className={styles.lazyNote}>
                        Not loaded yet — this endpoint costs about{' '}
                        <strong>{unitsEstimate.toLocaleString()}</strong> Semrush units.
                        Result is cached for 24h after first load.
                    </p>
                    <button
                        className={styles.researchButton}
                        type="button"
                        onClick={() => setArmed(true)}
                    >
                        Load data
                    </button>
                </div>
            ) : error ? (
                <div className={styles.errorBanner}>{error}</div>
            ) : loading && !data ? (
                <SkeletonBlock />
            ) : (
                children(data)
            )}
        </div>
    );
}
