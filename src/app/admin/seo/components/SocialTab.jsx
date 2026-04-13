'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import ScoreCard from './ScoreCard';
import TrafficChart from './TrafficChart';
import { SkeletonCard, SkeletonBlock } from './SkeletonCard';
import styles from '../seo.module.css';

export default function SocialTab({ refreshKey }) {
    const { data: insightsData, loading: insightsLoading, error: insightsError } = useAdminFetch(
        `/api/admin/seo/meta/insights?_=${refreshKey}`
    );
    const { data: topPostsData, loading: topPostsLoading, error: topPostsError } = useAdminFetch(
        `/api/admin/seo/meta/top-posts?_=${refreshKey}`
    );

    const insights = insightsData?.insights || {};
    const topPosts = topPostsData?.topPosts || [];

    const totalReach = Array.isArray(insights.impressions)
        ? insights.impressions.reduce((s, d) => s + d.value, 0)
        : 0;

    const totalEngagements = Array.isArray(insights.engagements)
        ? insights.engagements.reduce((s, d) => s + d.value, 0)
        : 0;

    const engagementRate = totalReach > 0 ? totalEngagements / totalReach : 0;

    const engagementDays = Array.isArray(insights.engagements)
        ? insights.engagements.length
        : 0;

    // Build chart data from insights
    const chartData = Array.isArray(insights.engagements)
        ? insights.engagements.map((d, i) => ({
              date: d.date,
              engagements: d.value,
              reach: insights.impressions?.[i]?.value || 0,
          }))
        : [];

    if (insightsLoading && !insightsData) {
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

    const error = insightsError || topPostsError;

    return (
        <>
            {error && (
                <div className={styles.errorBanner}>
                    <strong>Error loading social data:</strong> {error}
                    <br />
                    <small>Check META_PAGE_ACCESS_TOKEN and META_PAGE_ID env vars.</small>
                </div>
            )}

            <div className={styles.kpiGrid}>
                <ScoreCard label="Total Reach (30d)" value={totalReach} format="number" />
                <ScoreCard label="Engagement Rate" value={engagementRate} format="percent" />
                <ScoreCard label="Days Tracked" value={engagementDays} format="number" />
                <ScoreCard label="Page Fans" value={insights.fans || 0} format="number" />
            </div>

            {chartData.length > 0 && (
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>Social Engagement Trend (30 days)</h3>
                    <TrafficChart
                        data={chartData}
                        lines={[
                            { key: 'engagements', label: 'Engagements', color: '#1877F2' },
                            { key: 'reach', label: 'Reach', color: '#f97316' },
                        ]}
                    />
                </div>
            )}

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Top Performing Posts</h3>
                <p className={styles.sectionSubtitle}>
                    Posts ranked by engaged users — patterns here inform content strategy
                </p>
                {topPostsLoading && !topPostsData ? (
                    <SkeletonBlock />
                ) : topPosts.length === 0 ? (
                    <div className={styles.empty}>No post data available</div>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Post</th>
                                <th>Date</th>
                                <th>Likes</th>
                                <th>Comments</th>
                                <th>Shares</th>
                                <th>Impressions</th>
                                <th>Eng. Rate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topPosts.map((p, i) => (
                                <tr key={i}>
                                    <td className={styles.tablePage}>
                                        {p.permalink ? (
                                            <a
                                                href={p.permalink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {p.message?.slice(0, 60) || '(no text)'}
                                            </a>
                                        ) : (
                                            p.message?.slice(0, 60) || '(no text)'
                                        )}
                                    </td>
                                    <td>{new Date(p.createdTime).toLocaleDateString()}</td>
                                    <td>{(p.likes || 0).toLocaleString()}</td>
                                    <td>{(p.comments || 0).toLocaleString()}</td>
                                    <td>{(p.shares || 0).toLocaleString()}</td>
                                    <td>{(p.impressions || 0).toLocaleString()}</td>
                                    <td>{((p.engagementRate || 0) * 100).toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Content Pattern Analysis</h3>
                <p className={styles.sectionSubtitle}>
                    Which post types perform best on your page
                </p>
                <ContentPatterns posts={topPosts} />
            </div>
        </>
    );
}

function ContentPatterns({ posts }) {
    if (posts.length === 0) {
        return <div className={styles.empty}>Not enough data for pattern analysis</div>;
    }

    // Group by message length
    const short = posts.filter((p) => (p.message?.length || 0) < 100);
    const medium = posts.filter(
        (p) => (p.message?.length || 0) >= 100 && (p.message?.length || 0) < 300
    );
    const long = posts.filter((p) => (p.message?.length || 0) >= 300);

    const avgEng = (arr) =>
        arr.length > 0
            ? (arr.reduce((s, p) => s + (p.engagementRate || 0), 0) / arr.length * 100).toFixed(2)
            : '0.00';

    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Post Length</th>
                    <th>Count</th>
                    <th>Avg Engagement Rate</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Short (&lt;100 chars)</td>
                    <td>{short.length}</td>
                    <td>{avgEng(short)}%</td>
                </tr>
                <tr>
                    <td>Medium (100-300 chars)</td>
                    <td>{medium.length}</td>
                    <td>{avgEng(medium)}%</td>
                </tr>
                <tr>
                    <td>Long (&gt;300 chars)</td>
                    <td>{long.length}</td>
                    <td>{avgEng(long)}%</td>
                </tr>
            </tbody>
        </table>
    );
}
