'use client';

import { useAdminFetch } from '@/hooks/useAdminFetch';
import styles from '../seo.module.css';

const CATEGORIES = [
    {
        title: '🌐 Domain Analytics',
        items: [
            { report: 'domain_ranks', desc: 'Global rank, organic keywords, traffic, cost' },
            { report: 'domain_organic', desc: 'Keywords bringing organic traffic' },
            { report: 'domain_adwords', desc: 'Paid search keywords' },
            { report: 'domain_organic_organic', desc: 'Organic competitors' },
            { report: 'domain_adwords_adwords', desc: 'Paid-search competitors' },
            { report: 'domain_adwords_historical', desc: 'Historical paid search' },
            { report: 'domain_rank', desc: 'High-level SEO metrics per database' },
        ],
    },
    {
        title: '🔑 Keyword Analytics',
        items: [
            { report: 'phrase_this', desc: 'Keyword overview (volume, CPC, competition, trend)' },
            { report: 'phrase_organic', desc: 'Domains ranking for a keyword' },
            { report: 'phrase_adwords', desc: 'Domains bidding on a keyword' },
            { report: 'phrase_related', desc: 'Related keywords' },
            { report: 'phrase_fullsearch', desc: 'Broad match keywords' },
            { report: 'phrase_kdi', desc: 'Keyword difficulty score' },
        ],
    },
    {
        title: '🔗 Backlink Analytics',
        items: [
            { report: 'backlinks_overview', desc: 'Total backlinks, referring domains, authority' },
            { report: 'backlinks', desc: 'Individual backlink details' },
            { report: 'backlinks_refdomains', desc: 'Referring domains' },
            { report: 'backlinks_anchors', desc: 'Anchor text distribution' },
            { report: 'backlinks_competitors', desc: 'Backlink competitors' },
        ],
    },
];

export default function SemrushStatus({ refreshKey }) {
    const { data, loading, error } = useAdminFetch(`/api/admin/seo/semrush/status?_=${refreshKey}`);

    const remaining = data?.remaining;
    const baseEndpoint = data?.baseEndpoint || 'https://api.semrush.com/';

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Semrush API Status</h3>
            <div className={styles.semrushStatusGrid}>
                <div className={styles.semrushStatusItem}>
                    <div className={styles.scoreLabel}>Remaining API Units</div>
                    <div className={styles.scoreValue}>
                        {loading && !data
                            ? '…'
                            : error
                              ? '—'
                              : (remaining ?? 0).toLocaleString()}
                    </div>
                    {error && <div className={styles.semrushStatusError}>{error}</div>}
                </div>
                <div className={styles.semrushStatusItem}>
                    <div className={styles.scoreLabel}>Base Endpoint</div>
                    <div className={styles.semrushEndpoint}>{baseEndpoint}</div>
                </div>
            </div>

            <h4 className={styles.semrushCategoryHeader}>Available Data Categories</h4>
            <div className={styles.semrushCategories}>
                {CATEGORIES.map((cat) => (
                    <div key={cat.title} className={styles.semrushCategoryCard}>
                        <div className={styles.semrushCategoryTitle}>{cat.title}</div>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Report Type</th>
                                    <th>Data You Get</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cat.items.map((item) => (
                                    <tr key={item.report}>
                                        <td>
                                            <code className={styles.semrushCode}>
                                                {item.report}
                                            </code>
                                        </td>
                                        <td>{item.desc}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </div>
    );
}
