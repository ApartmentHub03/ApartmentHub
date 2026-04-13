'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import ScoreCard from './ScoreCard';
import { SkeletonCard } from './SkeletonCard';
import styles from '../seo.module.css';

export default function BacklinksTab({ refreshKey }) {
    const { data: backlinksData, loading: loadingB, error: errorB } = useAdminFetch(
        `/api/admin/seo/semrush/backlinks?_=${refreshKey}`
    );
    const { data: competitorsData, loading: loadingC, error: errorC } = useAdminFetch(
        `/api/admin/seo/semrush/competitors?_=${refreshKey}`
    );

    if (loadingB && !backlinksData) {
        return (
            <div className={styles.kpiGrid}>
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
        );
    }

    if (errorB)
        return (
            <div className={styles.errorBanner}>
                <strong>Error loading backlinks:</strong> {errorB}
            </div>
        );

    const backlinks = backlinksData?.backlinks || {};
    const competitors = competitorsData?.competitors || [];

    return (
        <>
            <div className={styles.kpiGrid}>
                <ScoreCard
                    label="Total Backlinks"
                    value={backlinks.totalBacklinks}
                    format="number"
                />
                <ScoreCard
                    label="Referring Domains"
                    value={backlinks.referringDomains}
                    format="number"
                />
                <ScoreCard
                    label="Referring URLs"
                    value={backlinks.referringUrls}
                    format="number"
                />
                <ScoreCard
                    label="Referring IPs"
                    value={backlinks.referringIps}
                    format="number"
                />
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Top Organic Competitors</h3>
                <p className={styles.sectionSubtitle}>
                    Domains that rank for similar keywords as apartmenthub.nl
                </p>
                {errorC && <div className={styles.errorBanner}>{errorC}</div>}
                {loadingC && !competitorsData ? (
                    <SkeletonCard />
                ) : competitors.length === 0 ? (
                    <div className={styles.empty}>No competitor data available</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Domain</th>
                                <th>Common Keywords</th>
                                <th>Organic Keywords</th>
                                <th>Organic Traffic</th>
                                <th>Relevance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {competitors.map((c, i) => (
                                <tr key={i}>
                                    <td>{c.domain}</td>
                                    <td>{c.commonKeywords.toLocaleString()}</td>
                                    <td>{c.organicKeywords.toLocaleString()}</td>
                                    <td>{c.organicTraffic.toLocaleString()}</td>
                                    <td>{c.competitorRelevance.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
