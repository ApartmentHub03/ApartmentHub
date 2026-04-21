'use client';

import { useState } from 'react';
import { useAdminFetch } from '@/hooks/useAdminFetch';
import Button from '@/components/ui/Button';
import { SkeletonBlock } from './SkeletonCard';
import {
    Sparkles,
    AlertCircle,
    Zap,
    Target,
    FileText,
    Search,
    Shield,
    ChevronDown,
    ChevronUp,
    Loader2,
    Wrench,
} from 'lucide-react';
import { toast } from 'sonner';
import styles from '../seo.module.css';

const PROVIDER_LABELS = { groq: 'Groq (Llama 3.3)', gemini: 'Gemini 2.5 Flash' };

export default function AIInsightsTab({ refreshKey }) {
    const [webhookRunning, setWebhookRunning] = useState(false);
    const [webhookAnalysis, setWebhookAnalysis] = useState(null);
    const [pollStatus, setPollStatus] = useState(null);
    const [provider, setProvider] = useState('groq');
    const { data, loading } = useAdminFetch(
        `/api/admin/seo/ai/results?_=${refreshKey}`
    );

    const handleRunAnalysis = async () => {
        const providerName = PROVIDER_LABELS[provider];
        setWebhookRunning(true);
        setWebhookAnalysis(null);
        setPollStatus(`Gathering SEO data and sending to ${providerName}...`);
        toast.loading(`Sending dashboard data to ${providerName}...`, { id: 'webhook-run' });
        try {
            const token = sessionStorage.getItem('admin_token');
            const response = await fetch('/api/admin/seo/ai/webhook-analyze', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ provider }),
            });
            const json = await response.json();
            if (!response.ok) throw new Error(json.error || 'Failed to run analysis');
            if (!json.analysis) throw new Error('Analysis returned no data');

            setWebhookAnalysis(json.analysis);
            toast.success(
                json.analysis.sameAsPrevious
                    ? 'Analysis complete — same as previous run'
                    : 'Analysis complete',
                { id: 'webhook-run' }
            );
        } catch (err) {
            toast.error(err.message, { id: 'webhook-run' });
        } finally {
            setWebhookRunning(false);
            setPollStatus(null);
        }
    };

    if (loading && !data) return <SkeletonBlock />;

    const lastRun = data?.lastRun;

    return (
        <>
            <div className={styles.section}>
                <div className={styles.priorityHeader}>
                    <div>
                        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                            <Sparkles size={18} style={{ display: 'inline', marginRight: 8 }} />
                            AI SEO Analysis
                        </h3>
                        <p className={styles.sectionSubtitle}>
                            {lastRun
                                ? `Last run: ${new Date(lastRun.completed_at || lastRun.created_at).toLocaleString()}`
                                : 'Analyzes all dashboard data via AI and suggests improvements'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <select
                            value={provider}
                            onChange={(e) => setProvider(e.target.value)}
                            disabled={webhookRunning}
                            style={{
                                padding: '0.5rem 0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem',
                                background: '#fff',
                                cursor: webhookRunning ? 'not-allowed' : 'pointer',
                            }}
                        >
                            <option value="groq">Groq (Llama 3.3, free)</option>
                            <option value="gemini">Gemini 2.5 Flash</option>
                        </select>
                        <Button
                            onClick={handleRunAnalysis}
                            disabled={webhookRunning}
                            loading={webhookRunning}
                        >
                            <Sparkles size={14} />
                            {webhookRunning ? 'Analyzing...' : 'Run Analysis'}
                        </Button>
                    </div>
                </div>
            </div>

            {webhookRunning && pollStatus && (
                <div className={styles.section}>
                    <div className={styles.empty} style={{ textAlign: 'center' }}>
                        <Loader2 size={32} style={{ margin: '0 auto 1rem', color: '#009B8A', animation: 'spin 1s linear infinite' }} />
                        <p style={{ fontWeight: 500 }}>{pollStatus}</p>
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            )}

            {webhookAnalysis ? (
                <WebhookResults analysis={webhookAnalysis} />
            ) : !webhookRunning && (
                <div className={styles.section}>
                    <div className={styles.empty}>
                        <AlertCircle size={32} style={{ margin: '0 auto 1rem', color: '#9ca3af' }} />
                        <p>
                            No AI insights yet. Click <strong>Run Analysis</strong> to start.
                        </p>
                        <p style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
                            The selected model will analyze your traffic, keywords, backlinks, search
                            console data, and social metrics to generate specific improvement suggestions.
                        </p>
                    </div>
                </div>
            )}

        </>
    );
}

function DevelopButton({ type, suggestion, dashboardContext }) {
    const [dispatching, setDispatching] = useState(false);

    const handleDevelop = async () => {
        if (dispatching) return;
        setDispatching(true);
        toast.loading('Dispatching to Claude Code on the Mac mini...', { id: 'dev-dispatch' });
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/seo/ai/develop', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, suggestion, dashboardContext }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Dispatch failed');
            }
            toast.success(
                `Claude is working on it — a PR will appear on GitHub in a few minutes (job ${String(json.jobId).slice(0, 8)})`,
                { id: 'dev-dispatch', duration: 8000 }
            );
        } catch (err) {
            toast.error(err.message, { id: 'dev-dispatch' });
        } finally {
            setDispatching(false);
        }
    };

    return (
        <button
            onClick={handleDevelop}
            disabled={dispatching}
            title="Send this suggestion to Claude Code on the Mac mini to implement autonomously"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.35rem 0.75rem',
                marginTop: '0.5rem',
                border: '1px solid #009B8A',
                background: dispatching ? '#e5f6f4' : '#009B8A',
                color: dispatching ? '#009B8A' : '#fff',
                borderRadius: '0.375rem',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: dispatching ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
            }}
        >
            {dispatching ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Wrench size={12} />}
            {dispatching ? 'Dispatching...' : 'Develop'}
        </button>
    );
}

function WebhookResults({ analysis }) {
    const [expandedSection, setExpandedSection] = useState(null);

    if (!analysis) return null;

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    const impactColor = (impact) => {
        switch (impact) {
            case 'high': return '#dc2626';
            case 'medium': return '#d97706';
            case 'low': return '#059669';
            default: return '#6b7280';
        }
    };

    return (
        <>
            {analysis.sameAsPrevious && (
                <div
                    className={styles.priorityCard}
                    style={{
                        background: '#fef3c7',
                        borderColor: '#f59e0b',
                        color: '#92400e',
                    }}
                >
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>
                        <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                        Same suggestions as the previous one
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                        The model had no new suggestions beyond the previous run.
                    </p>
                </div>
            )}

            {/* Health Score & Summary */}
            {(analysis.summary || analysis.healthScore != null) && (
                <div className={styles.priorityCard}>
                    <div className={styles.priorityHeader}>
                        <div style={{ flex: 1 }}>
                            <p className={styles.priorityPath}>
                                <Shield size={16} style={{ display: 'inline', marginRight: 6 }} />
                                SEO Health Assessment
                            </p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>
                                {analysis.summary}
                            </p>
                        </div>
                        {analysis.healthScore != null && (
                            <div className={styles.priorityScore} style={{
                                color: analysis.healthScore >= 70 ? '#059669'
                                    : analysis.healthScore >= 40 ? '#d97706' : '#dc2626'
                            }}>
                                {analysis.healthScore}/100
                            </div>
                        )}
                    </div>

                    {analysis.monthlyPriorities && analysis.monthlyPriorities.length > 0 && (
                        <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '0.5rem' }}>
                            <p style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 600, color: '#166534' }}>
                                Monthly Priorities:
                            </p>
                            <ol style={{ margin: '0.5rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#166534' }}>
                                {analysis.monthlyPriorities.map((p, i) => (
                                    <li key={i} style={{ marginBottom: '0.25rem' }}>{p}</li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}

            {/* Critical Issues */}
            {analysis.criticalIssues && analysis.criticalIssues.length > 0 && (
                <div className={styles.priorityCard}>
                    <button
                        onClick={() => toggleSection('critical')}
                        style={{
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                            padding: 0, textAlign: 'left', fontFamily: 'inherit',
                        }}
                    >
                        <div className={styles.priorityHeader}>
                            <p className={styles.priorityPath} style={{ color: '#dc2626' }}>
                                <AlertCircle size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Critical Issues ({analysis.criticalIssues.length})
                            </p>
                            {expandedSection === 'critical' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </button>
                    {expandedSection === 'critical' && (
                        <div className={styles.actionList}>
                            {analysis.criticalIssues.map((issue, i) => (
                                <div key={i} className={styles.actionItem}>
                                    <AlertCircle size={16} style={{ color: impactColor(issue.impact), flexShrink: 0 }} />
                                    <div className={styles.actionText}>
                                        <div style={{ fontWeight: 500 }}>{issue.issue}</div>
                                        <div style={{ marginTop: '0.25rem', color: '#059669', fontSize: '0.8125rem' }}>
                                            <strong>Fix:</strong> {issue.fix}
                                        </div>
                                        <span
                                            className={
                                                issue.impact === 'high' ? styles.badgeHigh
                                                    : issue.impact === 'medium' ? styles.badgeMedium
                                                        : styles.badgeLow
                                            }
                                            style={{ marginTop: '0.25rem', display: 'inline-block' }}
                                        >
                                            {issue.impact} impact
                                        </span>
                                        <div>
                                            <DevelopButton
                                                type="criticalIssue"
                                                suggestion={issue}
                                                dashboardContext={analysis}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Quick Wins */}
            {analysis.quickWins && analysis.quickWins.length > 0 && (
                <div className={styles.priorityCard}>
                    <button
                        onClick={() => toggleSection('quickwins')}
                        style={{
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                            padding: 0, textAlign: 'left', fontFamily: 'inherit',
                        }}
                    >
                        <div className={styles.priorityHeader}>
                            <p className={styles.priorityPath} style={{ color: '#059669' }}>
                                <Zap size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Quick Wins ({analysis.quickWins.length})
                            </p>
                            {expandedSection === 'quickwins' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </button>
                    {expandedSection === 'quickwins' && (
                        <div className={styles.actionList}>
                            {analysis.quickWins.map((win, i) => (
                                <div key={i} className={styles.actionItem}>
                                    <Zap size={16} style={{ color: '#059669', flexShrink: 0 }} />
                                    <div className={styles.actionText}>
                                        <div style={{ fontWeight: 500 }}>{win.action}</div>
                                        <div style={{ marginTop: '0.25rem', fontSize: '0.8125rem', color: '#6b7280' }}>
                                            {win.expectedImpact}
                                        </div>
                                        <div style={{ marginTop: '0.25rem' }}>
                                            <span className={styles.badgeLow}>{win.category}</span>{' '}
                                            <span className={
                                                win.effort === 'low' ? styles.badgeSuccess
                                                    : win.effort === 'medium' ? styles.badgeMedium
                                                        : styles.badgeHigh
                                            }>
                                                {win.effort} effort
                                            </span>
                                        </div>
                                        <div>
                                            <DevelopButton
                                                type="quickWin"
                                                suggestion={win}
                                                dashboardContext={analysis}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Content Suggestions */}
            {analysis.contentSuggestions && analysis.contentSuggestions.length > 0 && (
                <div className={styles.priorityCard}>
                    <button
                        onClick={() => toggleSection('content')}
                        style={{
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                            padding: 0, textAlign: 'left', fontFamily: 'inherit',
                        }}
                    >
                        <div className={styles.priorityHeader}>
                            <p className={styles.priorityPath}>
                                <FileText size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Content Suggestions ({analysis.contentSuggestions.length})
                            </p>
                            {expandedSection === 'content' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </button>
                    {expandedSection === 'content' && (
                        <div className={styles.actionList}>
                            {analysis.contentSuggestions.map((sug, i) => (
                                <div key={i} className={styles.actionItem}>
                                    <FileText size={16} style={{ color: '#6366f1', flexShrink: 0 }} />
                                    <div className={styles.actionText}>
                                        <div style={{ fontWeight: 500 }}>{sug.page}</div>
                                        <div className={styles.beforeAfter}>
                                            <div><strong>Issue:</strong> {sug.currentIssue}</div>
                                            <div style={{ color: '#059669' }}>
                                                <strong>Suggestion:</strong> {sug.suggestion}
                                            </div>
                                        </div>
                                        <span
                                            className={
                                                sug.priority === 'high' ? styles.badgeHigh
                                                    : sug.priority === 'medium' ? styles.badgeMedium
                                                        : styles.badgeLow
                                            }
                                            style={{ marginTop: '0.25rem', display: 'inline-block' }}
                                        >
                                            {sug.priority} priority
                                        </span>
                                        <div>
                                            <DevelopButton
                                                type="contentSuggestion"
                                                suggestion={sug}
                                                dashboardContext={analysis}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Keyword Opportunities */}
            {analysis.keywordOpportunities && analysis.keywordOpportunities.length > 0 && (
                <div className={styles.priorityCard}>
                    <button
                        onClick={() => toggleSection('keywords')}
                        style={{
                            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                            padding: 0, textAlign: 'left', fontFamily: 'inherit',
                        }}
                    >
                        <div className={styles.priorityHeader}>
                            <p className={styles.priorityPath}>
                                <Search size={16} style={{ display: 'inline', marginRight: 6 }} />
                                Keyword Opportunities ({analysis.keywordOpportunities.length})
                            </p>
                            {expandedSection === 'keywords' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </div>
                    </button>
                    {expandedSection === 'keywords' && (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Keyword</th>
                                    <th>Position</th>
                                    <th>Impressions</th>
                                    <th>Action</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {analysis.keywordOpportunities.map((kw, i) => (
                                    <tr key={i}>
                                        <td style={{ fontWeight: 500 }}>{kw.keyword}</td>
                                        <td>{kw.currentPosition ?? '—'}</td>
                                        <td>{kw.impressions ?? '—'}</td>
                                        <td style={{ fontSize: '0.8125rem' }}>{kw.action}</td>
                                        <td>
                                            <DevelopButton
                                                type="keywordOpportunity"
                                                suggestion={kw}
                                                dashboardContext={analysis}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Competitor Insights */}
            {analysis.competitorInsights && (
                <div className={styles.priorityCard}>
                    <div className={styles.priorityHeader}>
                        <p className={styles.priorityPath}>
                            <Target size={16} style={{ display: 'inline', marginRight: 6 }} />
                            Competitor Insights
                        </p>
                    </div>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#374151', lineHeight: 1.6 }}>
                        {analysis.competitorInsights}
                    </p>
                </div>
            )}
        </>
    );
}

