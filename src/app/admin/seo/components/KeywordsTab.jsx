'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import { SkeletonBlock } from './SkeletonCard';
import styles from '../seo.module.css';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';

export default function KeywordsTab({ refreshKey }) {
    const { data, loading, error } = useAdminFetch(
        `/api/admin/seo/semrush/keywords?limit=50&_=${refreshKey}`
    );

    if (loading && !data) return <SkeletonBlock />;
    if (error)
        return (
            <div className={styles.errorBanner}>
                <strong>Error loading keywords:</strong> {error}
                <br />
                <small>Check SEMRUSH_API_KEY env var.</small>
            </div>
        );

    const keywords = data?.keywords || [];
    const topByTraffic = keywords.slice().sort((a, b) => b.traffic - a.traffic).slice(0, 15);

    const positionBuckets = keywords.reduce(
        (acc, k) => {
            if (k.position <= 3) acc.top3++;
            else if (k.position <= 10) acc.top10++;
            else if (k.position <= 20) acc.top20++;
            else acc.beyond20++;
            return acc;
        },
        { top3: 0, top10: 0, top20: 0, beyond20: 0 }
    );

    return (
        <>
            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Top 15 Keywords by Traffic</h3>
                <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topByTraffic} layout="vertical" margin={{ left: 140 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                            <XAxis type="number" stroke="#6b7280" fontSize={12} />
                            <YAxis
                                type="category"
                                dataKey="keyword"
                                stroke="#6b7280"
                                fontSize={11}
                                width={140}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.875rem',
                                }}
                            />
                            <Bar dataKey="traffic" fill="#009B8A" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className={styles.chartGrid}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Position Distribution</h3>
                    <table className={styles.table}>
                        <tbody>
                            <tr>
                                <td>Position 1-3</td>
                                <td>
                                    <strong>{positionBuckets.top3}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>Position 4-10</td>
                                <td>
                                    <strong>{positionBuckets.top10}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>Position 11-20</td>
                                <td>
                                    <strong>{positionBuckets.top20}</strong>
                                </td>
                            </tr>
                            <tr>
                                <td>Position 20+</td>
                                <td>
                                    <strong>{positionBuckets.beyond20}</strong>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Summary</h3>
                    <p className={styles.sectionSubtitle}>
                        Total keywords: <strong>{keywords.length}</strong>
                    </p>
                    <p className={styles.sectionSubtitle}>
                        Total est. traffic: <strong>{keywords.reduce((s, k) => s + k.traffic, 0).toLocaleString()}</strong>
                    </p>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>All Keywords</h3>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Keyword</th>
                            <th>Position</th>
                            <th>Volume</th>
                            <th>CPC (€)</th>
                            <th>Traffic</th>
                            <th>URL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {keywords.map((k, i) => (
                            <tr key={i}>
                                <td>{k.keyword}</td>
                                <td>{k.position}</td>
                                <td>{k.volume.toLocaleString()}</td>
                                <td>{k.cpc.toFixed(2)}</td>
                                <td>{k.traffic.toLocaleString()}</td>
                                <td className={styles.tablePage}>{k.url}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
