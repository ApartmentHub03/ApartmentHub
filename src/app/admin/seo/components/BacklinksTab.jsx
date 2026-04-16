'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import ScoreCard from './ScoreCard';
import { SkeletonCard, SkeletonBlock } from './SkeletonCard';
import styles from '../seo.module.css';

export default function BacklinksTab({ refreshKey }) {
    const { data: backlinksData, loading: loadingB, error: errorB } = useAdminFetch(
        `/api/admin/seo/semrush/backlinks?_=${refreshKey}`
    );
    const { data: competitorsData, loading: loadingC, error: errorC } = useAdminFetch(
        `/api/admin/seo/semrush/competitors?_=${refreshKey}`
    );
    const refdomains = useAdminFetch(`/api/admin/seo/semrush/refdomains?limit=25&_=${refreshKey}`);
    const anchors = useAdminFetch(`/api/admin/seo/semrush/anchors?limit=25&_=${refreshKey}`);
    const backlinksList = useAdminFetch(
        `/api/admin/seo/semrush/backlinks-list?limit=25&_=${refreshKey}`
    );
    const backlinkCompetitors = useAdminFetch(
        `/api/admin/seo/semrush/backlink-competitors?limit=10&_=${refreshKey}`
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
    const refDomainRows = refdomains.data?.refdomains || [];
    const anchorRows = anchors.data?.anchors || [];
    const backlinkRows = backlinksList.data?.backlinks || [];
    const backlinkCompetitorRows = backlinkCompetitors.data?.competitors || [];

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

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Referring Domains (backlinks_refdomains)</h3>
                <p className={styles.sectionSubtitle}>
                    Unique domains linking to apartmenthub.nl, ranked by authority
                </p>
                {refdomains.error && <div className={styles.errorBanner}>{refdomains.error}</div>}
                {refdomains.loading && !refdomains.data ? (
                    <SkeletonBlock />
                ) : refDomainRows.length === 0 ? (
                    <div className={styles.empty}>No referring domains found</div>
                ) : (
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
                            {refDomainRows.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.authorityScore}</td>
                                    <td>{r.domain}</td>
                                    <td>{r.backlinks.toLocaleString()}</td>
                                    <td>{r.ip}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Anchor Text Distribution (backlinks_anchors)</h3>
                <p className={styles.sectionSubtitle}>
                    Most-used anchor text across incoming links
                </p>
                {anchors.error && <div className={styles.errorBanner}>{anchors.error}</div>}
                {anchors.loading && !anchors.data ? (
                    <SkeletonBlock />
                ) : anchorRows.length === 0 ? (
                    <div className={styles.empty}>No anchor data available</div>
                ) : (
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
                            {anchorRows.map((r, i) => (
                                <tr key={i}>
                                    <td className={styles.tablePage}>{r.anchor || '(empty)'}</td>
                                    <td>{r.referringDomains.toLocaleString()}</td>
                                    <td>{r.backlinks.toLocaleString()}</td>
                                    <td>{r.firstSeen}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Individual Backlinks (backlinks)</h3>
                <p className={styles.sectionSubtitle}>Latest incoming links with source metadata</p>
                {backlinksList.error && (
                    <div className={styles.errorBanner}>{backlinksList.error}</div>
                )}
                {backlinksList.loading && !backlinksList.data ? (
                    <SkeletonBlock />
                ) : backlinkRows.length === 0 ? (
                    <div className={styles.empty}>No backlinks found</div>
                ) : (
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
                            {backlinkRows.map((r, i) => (
                                <tr key={i}>
                                    <td>{r.authorityScore}</td>
                                    <td className={styles.tablePage}>
                                        {r.sourceTitle || r.sourceUrl}
                                    </td>
                                    <td className={styles.tablePage}>{r.anchor || '(empty)'}</td>
                                    <td className={styles.tablePage}>{r.targetUrl}</td>
                                    <td>{r.firstSeen}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>
                    Backlink Competitors (backlinks_competitors)
                </h3>
                <p className={styles.sectionSubtitle}>
                    Domains with a similar backlink profile to apartmenthub.nl
                </p>
                {backlinkCompetitors.error && (
                    <div className={styles.errorBanner}>{backlinkCompetitors.error}</div>
                )}
                {backlinkCompetitors.loading && !backlinkCompetitors.data ? (
                    <SkeletonBlock />
                ) : backlinkCompetitorRows.length === 0 ? (
                    <div className={styles.empty}>No backlink competitors found</div>
                ) : (
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
                            {backlinkCompetitorRows.map((r, i) => (
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
                )}
            </div>
        </>
    );
}
