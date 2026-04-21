'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import ScoreCard from './ScoreCard';
import LazySection from './LazySection';
import { SkeletonCard } from './SkeletonCard';
import styles from '../seo.module.css';

export default function BacklinksTab({ refreshKey }) {
    // Cheap: single-row aggregate (auto-load)
    const { data: backlinksData, loading: loadingB, error: errorB } = useAdminFetch(
        `/api/admin/seo/semrush/backlinks?_=${refreshKey}`
    );
    // Moderate: 10 rows, auto-load
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
                    label="Authority Score"
                    value={backlinks.authorityScore}
                    format="number"
                />
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

            <LazySection
                title="Referring Domains (backlinks_refdomains)"
                subtitle="Unique domains linking to apartmenthub.nl, ranked by authority"
                url={`/api/admin/seo/semrush/refdomains?limit=10&_=${refreshKey}`}
                unitsEstimate={400}
            >
                {(data) => {
                    const rows = data?.refdomains || [];
                    if (rows.length === 0)
                        return <div className={styles.empty}>No referring domains found</div>;
                    return (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Authority</th>
                                    <th>Domain</th>
                                    <th>Backlinks</th>
                                    <th>IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.authorityScore}</td>
                                        <td>{r.domain}</td>
                                        <td>{r.backlinks.toLocaleString()}</td>
                                        <td>{r.ip}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                }}
            </LazySection>

            <LazySection
                title="Anchor Text Distribution (backlinks_anchors)"
                subtitle="Most-used anchor text across incoming links"
                url={`/api/admin/seo/semrush/anchors?limit=10&_=${refreshKey}`}
                unitsEstimate={400}
            >
                {(data) => {
                    const rows = data?.anchors || [];
                    if (rows.length === 0)
                        return <div className={styles.empty}>No anchor data available</div>;
                    return (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Anchor Text</th>
                                    <th>Referring Domains</th>
                                    <th>Backlinks</th>
                                    <th>First Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i}>
                                        <td className={styles.tablePage}>
                                            {r.anchor || '(empty)'}
                                        </td>
                                        <td>{r.referringDomains.toLocaleString()}</td>
                                        <td>{r.backlinks.toLocaleString()}</td>
                                        <td>{r.firstSeen}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                }}
            </LazySection>

            <LazySection
                title="Individual Backlinks (backlinks)"
                subtitle="Latest incoming links with source metadata"
                url={`/api/admin/seo/semrush/backlinks-list?limit=10&_=${refreshKey}`}
                unitsEstimate={400}
            >
                {(data) => {
                    const rows = data?.backlinks || [];
                    if (rows.length === 0)
                        return <div className={styles.empty}>No backlinks found</div>;
                    return (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Authority</th>
                                    <th>Source</th>
                                    <th>Anchor</th>
                                    <th>Target</th>
                                    <th>First Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.authorityScore}</td>
                                        <td className={styles.tablePage}>
                                            {r.sourceTitle || r.sourceUrl}
                                        </td>
                                        <td className={styles.tablePage}>
                                            {r.anchor || '(empty)'}
                                        </td>
                                        <td className={styles.tablePage}>{r.targetUrl}</td>
                                        <td>{r.firstSeen}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                }}
            </LazySection>

            <LazySection
                title="Backlink Competitors (backlinks_competitors)"
                subtitle="Domains with a similar backlink profile to apartmenthub.nl"
                url={`/api/admin/seo/semrush/backlink-competitors?limit=10&_=${refreshKey}`}
                unitsEstimate={400}
            >
                {(data) => {
                    const rows = data?.competitors || [];
                    if (rows.length === 0)
                        return (
                            <div className={styles.empty}>No backlink competitors found</div>
                        );
                    return (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Authority</th>
                                    <th>Domain</th>
                                    <th>Similarity</th>
                                    <th>Referring Domains</th>
                                    <th>Backlinks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r, i) => (
                                    <tr key={i}>
                                        <td>{r.authorityScore}</td>
                                        <td>{r.domain}</td>
                                        <td>{r.similarity.toFixed(2)}</td>
                                        <td>{r.referringDomains.toLocaleString()}</td>
                                        <td>{r.backlinks.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    );
                }}
            </LazySection>
        </>
    );
}
