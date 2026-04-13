'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import TrafficChart from './TrafficChart';
import { SkeletonCard, SkeletonBlock } from './SkeletonCard';
import ScoreCard from './ScoreCard';
import styles from '../seo.module.css';

export default function GSCPerformanceTab({ refreshKey }) {
    const { data, loading, error } = useAdminFetch(
        `/api/admin/seo/gsc/analytics?days=30&_=${refreshKey}`
    );

    if (loading && !data) {
        return (
            <>
                <div className={styles.kpiGrid}>
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonCard key={i} />
                    ))}
                </div>
                <SkeletonBlock />
            </>
        );
    }

    if (error) {
        return (
            <div className={styles.errorBanner}>
                <strong>Error loading GSC data:</strong> {error}
                <br />
                <small>Check GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, GSC_SITE_URL env vars.</small>
            </div>
        );
    }

    const totals = data?.totals || {};
    const trend = data?.trend || [];
    const topQueries = data?.topQueries || [];
    const rows = data?.rows || [];

    // Position distribution
    const positionBuckets = rows.reduce(
        (acc, row) => {
            if (row.position <= 3) acc.top3++;
            else if (row.position <= 10) acc.top10++;
            else if (row.position <= 20) acc.top20++;
            else acc.beyond20++;
            return acc;
        },
        { top3: 0, top10: 0, top20: 0, beyond20: 0 }
    );

    return (
        <>
            <div className={styles.kpiGrid}>
                <ScoreCard label="Total Clicks" value={totals.clicks} format="number" />
                <ScoreCard label="Impressions" value={totals.impressions} format="number" />
                <ScoreCard label="Avg CTR" value={totals.ctr} format="percent" />
                <ScoreCard label="Avg Position" value={totals.position?.toFixed(1)} format="number" />
            </div>

            <TrafficChart
                data={trend}
                title="Clicks & Impressions (30 days)"
                lines={[
                    { key: 'clicks', label: 'Clicks', color: '#009B8A' },
                    { key: 'impressions', label: 'Impressions', color: '#3b82f6' },
                ]}
            />

            <div className={styles.chartGrid}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Position Distribution</h3>
                    <p className={styles.sectionSubtitle}>
                        How many ranking query-page pairs are in each position bucket
                    </p>
                    <table className={styles.table}>
                        <tbody>
                            <tr>
                                <td>Position 1-3 (Top results)</td>
                                <td>
                                    <strong>{positionBuckets.top3}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>Position 4-10 (First page)</td>
                                <td>
                                    <strong>{positionBuckets.top10}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>Position 11-20 (Second page)</td>
                                <td>
                                    <strong>{positionBuckets.top20}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>Position 20+ (Beyond)</td>
                                <td>
                                    <strong>{positionBuckets.beyond20}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Top Performing Queries</h3>
                    <p className={styles.sectionSubtitle}>Highest clicks in last 30 days</p>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Query</th>
                                <th>Clicks</th>
                                <th>CTR</th>
                                <th>Position</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topQueries.slice(0, 10).map((q, i) => (
                                <tr key={i}>
                                    <td>{q.query}</td>
                                    <td>{q.clicks}</td>
                                    <td>{(q.ctr * 100).toFixed(1)}%</td>
                                    <td>{q.position?.toFixed(1)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>All Queries × Pages (Top 25)</h3>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Query</th>
                            <th>Page</th>
                            <th>Clicks</th>
                            <th>Impressions</th>
                            <th>CTR</th>
                            <th>Position</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows
                            .slice()
                            .sort((a, b) => b.impressions - a.impressions)
                            .slice(0, 25)
                            .map((r, i) => (
                                <tr key={i}>
                                    <td>{r.query}</td>
                                    <td className={styles.tablePage}>{r.page}</td>
                                    <td>{r.clicks}</td>
                                    <td>{r.impressions.toLocaleString()}</td>
                                    <td>{(r.ctr * 100).toFixed(2)}%</td>
                                    <td>{r.position?.toFixed(1)}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
