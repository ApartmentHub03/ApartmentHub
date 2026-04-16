'use client';

import { useState } from 'react';
import { useAdminFetch } from '@/hooks/useAdminFetch';
import LazySection from './LazySection';
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
    // Organic keywords auto-load at route default (25 rows).
    const { data, loading, error } = useAdminFetch(
        `/api/admin/seo/semrush/keywords?_=${refreshKey}`
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
                <h3 className={styles.sectionTitle}>Top 15 Organic Keywords by Traffic</h3>
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
                        Total organic keywords: <strong>{keywords.length}</strong>
                    </p>
                    <p className={styles.sectionSubtitle}>
                        Total est. traffic:{' '}
                        <strong>
                            {keywords.reduce((s, k) => s + k.traffic, 0).toLocaleString()}
                        </strong>
                    </p>
                </div>
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>All Organic Keywords</h3>
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

            <LazySection
                title="Paid Search Keywords (domain_adwords)"
                subtitle="Keywords the domain is bidding on in Google Ads"
                url={`/api/admin/seo/semrush/paid-keywords?limit=10&_=${refreshKey}`}
                unitsEstimate={200}
            >
                {(data) => {
                    const rows = data?.keywords || [];
                    if (rows.length === 0)
                        return <div className={styles.empty}>No paid search data available</div>;
                    return (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Keyword</th>
                                    <th>Position</th>
                                    <th>Volume</th>
                                    <th>CPC (€)</th>
                                    <th>Traffic %</th>
                                    <th>URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((k, i) => (
                                    <tr key={i}>
                                        <td>{k.keyword}</td>
                                        <td>{k.position}</td>
                                        <td>{k.volume.toLocaleString()}</td>
                                        <td>{k.cpc.toFixed(2)}</td>
                                        <td>{k.traffic.toFixed(2)}</td>
                                        <td className={styles.tablePage}>{k.url}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                }}
            </LazySection>

            <KeywordResearchSection refreshKey={refreshKey} />
        </>
    );
}

function KeywordResearchSection() {
    const [input, setInput] = useState('');
    const [phrase, setPhrase] = useState('');

    const encoded = encodeURIComponent(phrase);
    const url = phrase
        ? `/api/admin/seo/semrush/keyword?phrase=${encoded}&include=overview,related,broad,difficulty,adwords`
        : null;
    const { data, loading, error } = useAdminFetch(url, { lazy: !phrase });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim()) setPhrase(input.trim());
    };

    const overview = data?.overview;
    const difficulty = data?.difficulty;
    const related = data?.related || [];
    const broad = data?.broadMatch || [];
    const adwords = data?.adwords || [];

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Keyword Research</h3>
            <p className={styles.sectionSubtitle}>
                Look up a keyword to see overview, difficulty, related & broad-match phrases, and
                top paid bidders. Costs ~1,500 Semrush units per lookup (cached 24h).
            </p>

            <form className={styles.researchForm} onSubmit={handleSubmit}>
                <input
                    className={styles.researchInput}
                    type="text"
                    placeholder="e.g. apartments amsterdam"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button className={styles.researchButton} type="submit" disabled={!input.trim()}>
                    {loading ? 'Loading…' : 'Research'}
                </button>
            </form>

            {error && <div className={styles.errorBanner}>{error}</div>}
            {phrase && !loading && !data && !error && (
                <div className={styles.empty}>No data yet</div>
            )}

            {overview && (
                <>
                    <div className={styles.researchOverview}>
                        <div className={styles.researchStat}>
                            <div className={styles.researchStatLabel}>Volume</div>
                            <div className={styles.researchStatValue}>
                                {overview.volume.toLocaleString()}
                            </div>
                        </div>
                        <div className={styles.researchStat}>
                            <div className={styles.researchStatLabel}>CPC (€)</div>
                            <div className={styles.researchStatValue}>
                                {overview.cpc.toFixed(2)}
                            </div>
                        </div>
                        <div className={styles.researchStat}>
                            <div className={styles.researchStatLabel}>Competition</div>
                            <div className={styles.researchStatValue}>
                                {overview.competition.toFixed(2)}
                            </div>
                        </div>
                        <div className={styles.researchStat}>
                            <div className={styles.researchStatLabel}>SERP Results</div>
                            <div className={styles.researchStatValue}>
                                {overview.results.toLocaleString()}
                            </div>
                        </div>
                        {difficulty && (
                            <div className={styles.researchStat}>
                                <div className={styles.researchStatLabel}>Difficulty</div>
                                <div className={styles.researchStatValue}>
                                    {difficulty.difficulty.toFixed(0)}
                                </div>
                            </div>
                        )}
                    </div>

                    {related.length > 0 && (
                        <div className={styles.subSection}>
                            <h4 className={styles.sectionTitle}>
                                Related Keywords (phrase_related)
                            </h4>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Keyword</th>
                                        <th>Volume</th>
                                        <th>CPC (€)</th>
                                        <th>Competition</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {related.map((k, i) => (
                                        <tr key={i}>
                                            <td>{k.keyword}</td>
                                            <td>{k.volume.toLocaleString()}</td>
                                            <td>{k.cpc.toFixed(2)}</td>
                                            <td>{k.competition.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {broad.length > 0 && (
                        <div className={styles.subSection}>
                            <h4 className={styles.sectionTitle}>
                                Broad-Match Keywords (phrase_fullsearch)
                            </h4>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Keyword</th>
                                        <th>Volume</th>
                                        <th>CPC (€)</th>
                                        <th>Competition</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {broad.map((k, i) => (
                                        <tr key={i}>
                                            <td>{k.keyword}</td>
                                            <td>{k.volume.toLocaleString()}</td>
                                            <td>{k.cpc.toFixed(2)}</td>
                                            <td>{k.competition.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {adwords.length > 0 && (
                        <div className={styles.subSection}>
                            <h4 className={styles.sectionTitle}>
                                Domains Bidding (phrase_adwords)
                            </h4>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Domain</th>
                                        <th>URL</th>
                                        <th>Visibility %</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adwords.map((r, i) => (
                                        <tr key={i}>
                                            <td>{r.position}</td>
                                            <td>{r.domain}</td>
                                            <td className={styles.tablePage}>{r.url}</td>
                                            <td>{r.visibility.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
