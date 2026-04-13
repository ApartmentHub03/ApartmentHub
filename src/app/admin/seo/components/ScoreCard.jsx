'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import styles from '../seo.module.css';

function formatValue(value, format) {
    if (value === null || value === undefined) return '—';
    if (format === 'percent') return `${(value * 100).toFixed(1)}%`;
    if (format === 'duration') {
        const seconds = Math.round(value);
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    }
    if (format === 'number') return Number(value).toLocaleString();
    return value;
}

function formatDelta(current, previous, format) {
    if (current == null || previous == null || previous === 0) return null;
    const diff = current - previous;
    const pct = (diff / previous) * 100;
    return {
        pct: pct.toFixed(1),
        direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'neutral',
    };
}

export default function ScoreCard({ label, value, previous, format = 'number', invertDelta = false }) {
    const formatted = formatValue(value, format);
    const delta = formatDelta(value, previous, format);

    // For metrics like bounce rate, "down" is good
    let deltaClass = styles.deltaNeutral;
    if (delta) {
        const isGood = invertDelta ? delta.direction === 'down' : delta.direction === 'up';
        if (delta.direction === 'neutral') deltaClass = styles.deltaNeutral;
        else if (isGood) deltaClass = styles.deltaUp;
        else deltaClass = styles.deltaDown;
    }

    const DeltaIcon =
        delta?.direction === 'up' ? TrendingUp : delta?.direction === 'down' ? TrendingDown : Minus;

    return (
        <div className={styles.scoreCard}>
            <p className={styles.scoreLabel}>{label}</p>
            <p className={styles.scoreValue}>{formatted}</p>
            {delta && (
                <div className={`${styles.scoreDelta} ${deltaClass}`}>
                    <DeltaIcon size={12} />
                    <span>
                        {delta.pct > 0 ? '+' : ''}
                        {delta.pct}%
                    </span>
                </div>
            )}
        </div>
    );
}
