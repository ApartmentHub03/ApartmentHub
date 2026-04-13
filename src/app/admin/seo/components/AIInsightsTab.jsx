'use client';

import { useState } from 'react';
import { useAdminFetch } from '@/hooks/useAdminFetch';
import Button from '@/components/ui/Button';
import { SkeletonBlock } from './SkeletonCard';
import { Sparkles, TrendingUp, CheckCircle, AlertCircle, Clock, BarChart2 } from 'lucide-react';
import { toast } from 'sonner';
import {
    RadarChart,
    PolarGrid,
    PolarAngleAxis,
    PolarRadiusAxis,
    Radar,
    ResponsiveContainer,
} from 'recharts';
import styles from '../seo.module.css';

export default function AIInsightsTab({ refreshKey }) {
    const [running, setRunning] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const { data, loading, error, refresh } = useAdminFetch(
        `/api/admin/seo/ai/results?_=${refreshKey}`
    );
    const { data: optData, refresh: refreshOpt } = useAdminFetch(
        `/api/admin/seo/ai/optimizations?_=${refreshKey}`
    );

    const handleRunAnalysis = async () => {
        setRunning(true);
        toast.loading('Running AI council analysis... this may take 30-60s', { id: 'ai-run' });
        try {
            const token = sessionStorage.getItem('admin_token');
            const response = await fetch('/api/admin/seo/ai/analyze', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ maxPages: 5 }),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Analysis failed');
            toast.success(`Analyzed ${json.pagesAnalyzed} pages`, { id: 'ai-run' });
            refresh();
        } catch (err) {
            toast.error(err.message, { id: 'ai-run' });
        } finally {
            setRunning(false);
        }
    };

    if (loading && !data) return <SkeletonBlock />;

    const lastRun = data?.lastRun;
    const results = data?.results || [];

    return (
        <>
            <div className={styles.section}>
                <div className={styles.priorityHeader}>
                    <div>
                        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                            <Sparkles size={18} style={{ display: 'inline', marginRight: 8 }} />
                            AI SEO Council
                        </h3>
                        <p className={styles.sectionSubtitle}>
                            {lastRun
                                ? `Last run: ${new Date(lastRun.completed_at || lastRun.created_at).toLocaleString()}`
                                : 'No analysis run yet'}
                        </p>
                    </div>
                    <Button onClick={handleRunAnalysis} disabled={running} loading={running}>
                        <Sparkles size={14} />
                        Run Full Analysis
                    </Button>
                </div>
                {error && <div className={styles.errorBanner}>{error}</div>}
            </div>

            {results.length === 0 ? (
                <div className={styles.section}>
                    <div className={styles.empty}>
                        <AlertCircle size={32} style={{ margin: '0 auto 1rem', color: '#9ca3af' }} />
                        <p>
                            No AI insights yet. Click <strong>Run Full Analysis</strong> to start.
                        </p>
                        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                            The AI council will analyze your top opportunity pages, compare against
                            competitors, and generate specific before/after suggestions.
                        </p>
                    </div>
                </div>
            ) : (
                results.map((page, i) => (
                    <div key={i} className={styles.priorityCard}>
                        <div className={styles.priorityHeader}>
                            <div>
                                <p className={styles.priorityPath}>
                                    Priority #{i + 1}: {page.pagePath}
                                </p>
                                <p className={styles.sectionSubtitle} style={{ margin: '0.25rem 0 0' }}>
                                    {page.gscData &&
                                        `Impressions: ${page.gscData.impressions} · CTR: ${(page.gscData.ctr * 100).toFixed(1)}% · Position: ${page.gscData.position?.toFixed(1)}`}
                                </p>
                            </div>
                            <div className={styles.priorityScore}>{page.overallScore}/100</div>
                        </div>

                        {page.scores && (
                            <div className={styles.chartContainer} style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart
                                        data={[
                                            { subject: 'Technical', score: page.scores.technical },
                                            { subject: 'Content', score: page.scores.content },
                                            { subject: 'Keywords', score: page.scores.keyword },
                                            { subject: 'UX', score: page.scores.ux },
                                        ]}
                                    >
                                        <PolarGrid stroke="#e5e7eb" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                                        <Radar
                                            name="Score"
                                            dataKey="score"
                                            stroke="#009B8A"
                                            fill="#009B8A"
                                            fillOpacity={0.3}
                                        />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {page.competitorComparison && (
                            <div style={{ marginTop: '1rem' }}>
                                <p className={styles.sectionSubtitle}>
                                    <strong>Title comparison:</strong>
                                </p>
                                <div className={styles.beforeAfter}>
                                    <div>
                                        <strong>Current:</strong> {page.competitorComparison.currentTitle}
                                    </div>
                                    <div style={{ marginTop: '0.25rem', color: '#059669' }}>
                                        <strong>Suggested:</strong> {page.competitorComparison.suggestedTitle}
                                    </div>
                                    {page.competitorComparison.reasoning && (
                                        <div style={{ marginTop: '0.25rem', fontStyle: 'italic' }}>
                                            {page.competitorComparison.reasoning}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {page.actionItems && page.actionItems.length > 0 && (
                            <div className={styles.actionList}>
                                <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
                                    <strong>Action Items:</strong>
                                </p>
                                {page.actionItems.map((item, j) => (
                                    <div key={j} className={styles.actionItem}>
                                        <TrendingUp size={16} style={{ color: '#009B8A', flexShrink: 0 }} />
                                        <div className={styles.actionText}>
                                            <div>{item.action}</div>
                                            {(item.before || item.after) && (
                                                <div className={styles.beforeAfter}>
                                                    {item.before && (
                                                        <div>
                                                            <strong>Before:</strong> {item.before}
                                                        </div>
                                                    )}
                                                    {item.after && (
                                                        <div>
                                                            <strong>After:</strong> {item.after}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            <div style={{ marginTop: '0.25rem' }}>
                                                <span
                                                    className={
                                                        item.impact === 'high'
                                                            ? styles.badgeHigh
                                                            : item.impact === 'medium'
                                                              ? styles.badgeMedium
                                                              : styles.badgeLow
                                                    }
                                                >
                                                    {item.impact} impact
                                                </span>{' '}
                                                <span className={styles.badgeLow}>{item.category}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))
            )}

            <OptimizationTracker
                optimizations={optData?.optimizations || []}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                onRefresh={refreshOpt}
            />
        </>
    );
}

function OptimizationTracker({ optimizations, statusFilter, onStatusFilterChange, onRefresh }) {
    const [actionLoading, setActionLoading] = useState(null);

    const statuses = ['all', 'suggested', 'applied', 'success', 'no_change'];

    const filtered =
        statusFilter === 'all'
            ? optimizations
            : optimizations.filter((o) => o.status === statusFilter);

    const handleMarkApplied = async (id) => {
        setActionLoading(id);
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/seo/ai/optimizations', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'applied' }),
            });
            if (!res.ok) throw new Error('Failed to update');
            toast.success('Optimization marked as applied');
            onRefresh?.();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleMeasure = async (id) => {
        setActionLoading(id);
        toast.loading('Measuring GSC performance...', { id: 'measure' });
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/seo/ai/optimizations/measure', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Measurement failed');
            const change = json.ctrChange != null ? (json.ctrChange * 100).toFixed(2) : '?';
            toast.success(
                `Result: ${json.status === 'success' ? 'Improved' : 'No change'} (CTR ${change >= 0 ? '+' : ''}${change}%)`,
                { id: 'measure' }
            );
            onRefresh?.();
        } catch (err) {
            toast.error(err.message, { id: 'measure' });
        } finally {
            setActionLoading(null);
        }
    };

    const daysSince = (dateStr) => {
        if (!dateStr) return 0;
        return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    };

    const statusBadge = (status) => {
        const map = {
            suggested: styles.badgeLow,
            applied: styles.badgeMedium,
            success: styles.badgeSuccess,
            no_change: styles.badgeNoChange,
        };
        return map[status] || styles.badgeLow;
    };

    return (
        <div className={styles.section}>
            <h3 className={styles.sectionTitle}>
                <span>
                    <BarChart2 size={18} style={{ display: 'inline', marginRight: 8 }} />
                    Optimization Tracking Pipeline
                </span>
            </h3>
            <p className={styles.sectionSubtitle}>
                Track optimizations from suggestion through measurement
            </p>

            <div className={styles.statusFilters}>
                {statuses.map((s) => (
                    <button
                        key={s}
                        className={`${styles.statusFilter} ${statusFilter === s ? styles.statusFilterActive : ''}`}
                        onClick={() => onStatusFilterChange(s)}
                    >
                        {s === 'all' ? 'All' : s === 'no_change' ? 'No Change' : s.charAt(0).toUpperCase() + s.slice(1)}
                        {s !== 'all' && (
                            <span style={{ marginLeft: 4, opacity: 0.7 }}>
                                ({optimizations.filter((o) => o.status === s).length})
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <div className={styles.empty}>
                    No optimizations {statusFilter !== 'all' ? `with status "${statusFilter}"` : 'tracked yet'}
                </div>
            ) : (
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Page</th>
                            <th>Type</th>
                            <th>Before / After</th>
                            <th>Status</th>
                            <th>CTR Change</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map((opt) => (
                            <tr key={opt.id}>
                                <td className={styles.tablePage}>{opt.page_path}</td>
                                <td>{opt.optimization_type}</td>
                                <td>
                                    <div className={styles.beforeAfter}>
                                        {opt.before_value && (
                                            <div><strong>Before:</strong> {opt.before_value.slice(0, 50)}</div>
                                        )}
                                        {opt.after_value && (
                                            <div><strong>After:</strong> {opt.after_value.slice(0, 50)}</div>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <span className={statusBadge(opt.status)}>
                                        {opt.status === 'no_change' ? 'no change' : opt.status}
                                    </span>
                                </td>
                                <td>
                                    {opt.after_ctr != null && opt.before_ctr != null ? (
                                        <span style={{ color: opt.after_ctr > opt.before_ctr ? '#059669' : '#dc2626' }}>
                                            {((opt.after_ctr - opt.before_ctr) * 100).toFixed(2)}%
                                        </span>
                                    ) : (
                                        '—'
                                    )}
                                </td>
                                <td>
                                    {opt.status === 'suggested' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleMarkApplied(opt.id)}
                                            loading={actionLoading === opt.id}
                                        >
                                            <CheckCircle size={12} />
                                            Applied
                                        </Button>
                                    )}
                                    {opt.status === 'applied' && (
                                        <div>
                                            <small style={{ color: '#6b7280' }}>
                                                <Clock size={10} style={{ display: 'inline' }} />{' '}
                                                {daysSince(opt.applied_at)}d ago
                                            </small>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleMeasure(opt.id)}
                                                loading={actionLoading === opt.id}
                                                disabled={daysSince(opt.applied_at) < 14}
                                                style={{ marginLeft: 8 }}
                                            >
                                                <BarChart2 size={12} />
                                                Measure
                                            </Button>
                                        </div>
                                    )}
                                    {(opt.status === 'success' || opt.status === 'no_change') && (
                                        <small style={{ color: '#6b7280' }}>
                                            Measured {opt.measured_at ? new Date(opt.measured_at).toLocaleDateString() : '—'}
                                        </small>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
