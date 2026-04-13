'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import ScoreCard from './ScoreCard';
import TrafficChart from './TrafficChart';
import { SkeletonCard, SkeletonBlock } from './SkeletonCard';
import styles from '../seo.module.css';

export default function OverviewTab({ refreshKey }) {
    const { data, loading, error } = useAdminFetch(`/api/admin/seo/overview?_=${refreshKey}`);

    if (loading && !data) {
        return (
            <>
                <div className={styles.kpiGrid}>
                    {Array.from({ length: 6 }).map((_, i) => (
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
                <strong>Error loading overview:</strong> {error}
                <br />
                <small>Check env vars for GA4, GSC, and Semrush credentials.</small>
            </div>
        );
    }

    const ga4 = data?.ga4 || {};
    const semrush = data?.semrush || {};
    const gsc = data?.gsc || {};
    const meta = data?.meta || {};

    const trafficCurrent = ga4.traffic || {};
    const realtime = ga4.realtime || {};
    const semrushDomain = semrush.domain || {};
    const semrushBacklinks = semrush.backlinks || {};
    const gscTotals = gsc.totals || {};
    const gscOpportunities = gsc.opportunities || [];

    const hasErrors = data?.errors && data.errors.length > 0;

    return (
        <>
            {hasErrors && (
                <div className={styles.errorBanner}>
                    Some data sources failed to load. Check API credentials in env vars.
                </div>
            )}

            <div className={styles.kpiGrid}>
                <ScoreCard label="Realtime Users" value={realtime.activeUsers} format="number" />
                <ScoreCard label="Sessions (7d)" value={trafficCurrent.sessions} format="number" />
                <ScoreCard label="Page Views (7d)" value={trafficCurrent.pageviews} format="number" />
                <ScoreCard label="Avg CTR (GSC)" value={gscTotals.ctr} format="percent" />
                <ScoreCard
                    label="Organic Keywords"
                    value={semrushDomain.organicKeywords}
                    format="number"
                />
                <ScoreCard
                    label="Backlinks"
                    value={semrushBacklinks.totalBacklinks}
                    format="number"
                />
                <ScoreCard
                    label="Social Reach (7d)"
                    value={
                        Array.isArray(meta.insights?.impressions)
                            ? meta.insights.impressions.reduce((s, d) => s + d.value, 0)
                            : 0
                    }
                    format="number"
                />
            </div>

            <div className={styles.chartGrid}>
                <TrafficChart
                    data={ga4.trend || []}
                    title="Traffic Trend (30 days) — GA4"
                    lines={[
                        { key: 'sessions', label: 'Sessions', color: '#009B8A' },
                        { key: 'pageviews', label: 'Page Views', color: '#f97316' },
                    ]}
                />
                <TrafficChart
                    data={gsc.trend || []}
                    title="Search Performance (30 days) — GSC"
                    lines={[
                        { key: 'clicks', label: 'Clicks', color: '#009B8A' },
                        { key: 'impressions', label: 'Impressions', color: '#3b82f6' },
                    ]}
                />
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Top Opportunities</h3>
                <p className={styles.sectionSubtitle}>
                    High-impression pages with low CTR — biggest optimization potential
                </p>
                {gscOpportunities.length === 0 ? (
                    <div className={styles.empty}>No opportunities found yet — GSC data pending</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Query</th>
                                <th>Page</th>
                                <th>Impressions</th>
                                <th>Clicks</th>
                                <th>CTR</th>
                                <th>Position</th>
                                <th>Priority</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gscOpportunities.slice(0, 10).map((opp, i) => (
                                <tr key={i}>
                                    <td>{opp.query}</td>
                                    <td className={styles.tablePage}>{opp.page}</td>
                                    <td>{opp.impressions.toLocaleString()}</td>
                                    <td>{opp.clicks}</td>
                                    <td>{(opp.ctr * 100).toFixed(2)}%</td>
                                    <td>{opp.position?.toFixed(1)}</td>
                                    <td>
                                        <span
                                            className={
                                                opp.priority === 'HIGH'
                                                    ? styles.badgeHigh
                                                    : opp.priority === 'MEDIUM'
                                                      ? styles.badgeMedium
                                                      : styles.badgeLow
                                            }
                                        >
                                            {opp.priority}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Top Pages (GA4)</h3>
                {(ga4.topPages || []).length === 0 ? (
                    <div className={styles.empty}>No data</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Page</th>
                                <th>Title</th>
                                <th>Views</th>
                                <th>Bounce Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(ga4.topPages || []).map((p, i) => (
                                <tr key={i}>
                                    <td>{i + 1}</td>
                                    <td className={styles.tablePage}>{p.pagePath}</td>
                                    <td className={styles.tablePage}>{p.pageTitle}</td>
                                    <td>{p.views.toLocaleString()}</td>
                                    <td>{(p.bounceRate * 100).toFixed(1)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Recent Social Posts</h3>
                {(meta.recentPosts || []).length === 0 ? (
                    <div className={styles.empty}>
                        No Meta/Facebook data — check META_PAGE_ACCESS_TOKEN env var
                    </div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Post</th>
                                <th>Date</th>
                                <th>Likes</th>
                                <th>Comments</th>
                                <th>Shares</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(meta.recentPosts || []).map((p, i) => (
                                <tr key={i}>
                                    <td className={styles.tablePage}>
                                        {p.message?.slice(0, 60) || '(no text)'}
                                    </td>
                                    <td>{new Date(p.createdTime).toLocaleDateString()}</td>
                                    <td>{(p.likes || 0).toLocaleString()}</td>
                                    <td>{(p.comments || 0).toLocaleString()}</td>
                                    <td>{(p.shares || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </>
    );
}
