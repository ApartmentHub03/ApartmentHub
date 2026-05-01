'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
    GitMerge,
    CheckCircle2,
    ExternalLink,
    Clock,
    XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import styles from '../seo.module.css';

const PROVIDER_LABELS = { groq: 'Groq (Llama 3.3)', gemini: 'Gemini 2.5 Flash' };

export default function AIInsightsTab({ refreshKey }) {
    const [webhookRunning, setWebhookRunning] = useState(false);
    const [webhookAnalysis, setWebhookAnalysis] = useState(null);
    const [pollStatus, setPollStatus] = useState(null);
    const [provider, setProvider] = useState('groq');
    const [jobsRefreshKey, setJobsRefreshKey] = useState(0);
    const bumpJobs = useCallback(() => setJobsRefreshKey((k) => k + 1), []);
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
            <JobsSections refreshKey={jobsRefreshKey} onChange={bumpJobs} />

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
                <WebhookResults analysis={webhookAnalysis} onDispatched={bumpJobs} />
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

function DevelopButton({ type, suggestion, dashboardContext, onDispatched }) {
    const [open, setOpen] = useState(false);
    const [dispatching, setDispatching] = useState(false);
    const [userPrompt, setUserPrompt] = useState('');

    const handleDevelop = async () => {
        if (dispatching) return;
        setDispatching(true);
        toast.loading('Dispatching to Claude Code on the Mac mini...', { id: 'dev-dispatch' });
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/seo/develop/jobs', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ type, suggestion, dashboardContext, userPrompt }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Dispatch failed');
            }
            toast.success(
                `Claude is working on it — moved to In Progress (job ${String(json.jobId || '').slice(0, 8)})`,
                { id: 'dev-dispatch', duration: 8000 }
            );
            setOpen(false);
            setUserPrompt('');
            onDispatched?.();
        } catch (err) {
            toast.error(err.message, { id: 'dev-dispatch' });
        } finally {
            setDispatching(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                title="Send this suggestion to Claude Code on the Mac mini to implement autonomously"
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    marginTop: '0.5rem',
                    border: '1px solid #009B8A',
                    background: '#009B8A',
                    color: '#fff',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                }}
            >
                <Wrench size={12} />
                Develop
            </button>
            {open && (
                <DevelopPromptModal
                    suggestion={suggestion}
                    type={type}
                    userPrompt={userPrompt}
                    onChangePrompt={setUserPrompt}
                    onCancel={() => {
                        if (!dispatching) {
                            setOpen(false);
                            setUserPrompt('');
                        }
                    }}
                    onConfirm={handleDevelop}
                    dispatching={dispatching}
                />
            )}
        </>
    );
}

function DevelopPromptModal({
    suggestion,
    type,
    userPrompt,
    onChangePrompt,
    onCancel,
    onConfirm,
    dispatching,
}) {
    const summary =
        suggestion?.issue ||
        suggestion?.action ||
        suggestion?.suggestion ||
        suggestion?.keyword ||
        suggestion?.page ||
        'this suggestion';

    return (
        <div
            onClick={onCancel}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(17, 24, 39, 0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '1rem',
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: 560,
                    background: '#fff',
                    borderRadius: '0.75rem',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
                    padding: '1.5rem',
                    fontFamily: 'inherit',
                }}
            >
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#111827' }}>
                    <Wrench size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: '-2px' }} />
                    Develop suggestion
                </h3>
                <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5 }}>
                    Claude Code will work on the AI suggestion below. You can add extra instructions
                    here — anything you want it to focus on, avoid, or do differently.
                </p>

                <div
                    style={{
                        background: '#f9fafb',
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        fontSize: '0.8125rem',
                        color: '#374151',
                    }}
                >
                    <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.25rem', letterSpacing: '0.025em' }}>
                        AI suggestion ({type})
                    </div>
                    <div style={{ fontWeight: 500 }}>{summary}</div>
                </div>

                <label
                    htmlFor="develop-prompt"
                    style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '0.375rem' }}
                >
                    Additional instructions (optional)
                </label>
                <textarea
                    id="develop-prompt"
                    value={userPrompt}
                    onChange={(e) => onChangePrompt(e.target.value)}
                    disabled={dispatching}
                    rows={5}
                    placeholder="e.g. focus on the /nl/aanvraag page, keep changes minimal, don't touch the header component..."
                    style={{
                        width: '100%',
                        padding: '0.625rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                    }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                    <button
                        onClick={onCancel}
                        disabled={dispatching}
                        style={{
                            padding: '0.5rem 1rem',
                            border: '1px solid #d1d5db',
                            background: '#fff',
                            color: '#374151',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: dispatching ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={dispatching}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.5rem 1rem',
                            border: '1px solid #009B8A',
                            background: dispatching ? '#e5f6f4' : '#009B8A',
                            color: dispatching ? '#009B8A' : '#fff',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: dispatching ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {dispatching ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Wrench size={14} />
                        )}
                        {dispatching ? 'Dispatching...' : 'Dispatch to Claude'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function WebhookResults({ analysis, onDispatched }) {
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
                                                onDispatched={onDispatched}
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
                                                onDispatched={onDispatched}
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
                                                onDispatched={onDispatched}
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
                                                onDispatched={onDispatched}
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

function suggestionSummary(s) {
    if (!s) return 'Suggestion';
    return (
        s.issue ||
        s.action ||
        s.suggestion ||
        s.keyword ||
        s.page ||
        'Suggestion'
    );
}

function JobsSections({ refreshKey, onChange }) {
    const { data: inProgressData, loading: inProgressLoading } = useAdminFetch(
        `/api/admin/seo/develop/jobs?status=in_progress&_=${refreshKey}`
    );
    const { data: completedData } = useAdminFetch(
        `/api/admin/seo/develop/jobs?status=completed&_=${refreshKey}`
    );

    const inProgress = inProgressData?.jobs || [];
    const completed = completedData?.jobs || [];

    if (!inProgressLoading && inProgress.length === 0 && completed.length === 0) {
        return null;
    }

    return (
        <>
            {(inProgressLoading || inProgress.length > 0) && (
                <InProgressSection jobs={inProgress} onChange={onChange} />
            )}
            {completed.length > 0 && <CompletedSection jobs={completed} />}
        </>
    );
}

function InProgressSection({ jobs, onChange }) {
    const [collapsed, setCollapsed] = useState(false);
    const [prStatus, setPrStatus] = useState(null);
    const [prLoading, setPrLoading] = useState(false);
    const [merging, setMerging] = useState(false);
    const pollRef = useRef(null);

    const fetchPrStatus = useCallback(async () => {
        try {
            setPrLoading(true);
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/seo/develop/pr-status', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (res.ok && json.success) setPrStatus(json);
        } catch {
            // Silent — banner just won't show.
        } finally {
            setPrLoading(false);
        }
    }, []);

    useEffect(() => {
        if (jobs.length === 0) return;
        fetchPrStatus();
        pollRef.current = setInterval(fetchPrStatus, 30000);
        return () => clearInterval(pollRef.current);
    }, [jobs.length, fetchPrStatus]);

    const handleMerge = async () => {
        if (merging) return;
        setMerging(true);
        toast.loading('Merging seo branch into main...', { id: 'seo-merge' });
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch('/api/admin/seo/develop/merge', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Merge failed');
            }
            toast.success(`Merged PR #${json.pr_number} into main`, { id: 'seo-merge' });
            onChange?.();
            setPrStatus(null);
        } catch (err) {
            toast.error(err.message, { id: 'seo-merge', duration: 6000 });
        } finally {
            setMerging(false);
        }
    };

    const mergeable = prStatus?.exists && prStatus.mergeable === true;
    const conflicted = prStatus?.exists && prStatus.mergeable === false;
    const computing = prStatus?.exists && prStatus.mergeable === null;

    return (
        <div className={styles.section}>
            <button
                onClick={() => setCollapsed((c) => !c)}
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                }}
            >
                <div className={styles.priorityHeader}>
                    <div>
                        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                            <Clock size={18} style={{ display: 'inline', marginRight: 8, color: '#d97706' }} />
                            In Progress ({jobs.length})
                        </h3>
                        <p className={styles.sectionSubtitle} style={{ margin: '0.25rem 0 0' }}>
                            Suggestions Claude is working on. Add follow-up instructions or merge when ready.
                        </p>
                    </div>
                    {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
            </button>

            {!collapsed && (
                <>
                    <PrStatusBanner
                        prStatus={prStatus}
                        prLoading={prLoading}
                        merging={merging}
                        mergeable={mergeable}
                        conflicted={conflicted}
                        computing={computing}
                        onMerge={handleMerge}
                        onRefresh={fetchPrStatus}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                        {jobs.map((job) => (
                            <InProgressJobCard
                                key={job.id}
                                job={job}
                                onRefined={onChange}
                                onMerge={handleMerge}
                                merging={merging}
                                mergeable={mergeable}
                                conflicted={conflicted}
                                computing={computing}
                            />
                        ))}
                    </div>
                </>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );
}

function PrStatusBanner({
    prStatus,
    prLoading,
    merging,
    mergeable,
    conflicted,
    computing,
    onMerge,
    onRefresh,
}) {
    let bg = '#f3f4f6';
    let color = '#374151';
    let icon = <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />;
    let label = prLoading ? 'Checking PR status...' : 'No open PR yet';

    if (prStatus?.exists) {
        if (mergeable) {
            bg = '#ecfdf5';
            color = '#065f46';
            icon = <CheckCircle2 size={14} />;
            label = 'PR is mergeable — ready to merge into main';
        } else if (conflicted) {
            bg = '#fef2f2';
            color = '#991b1b';
            icon = <XCircle size={14} />;
            label = 'Merge conflicts — resolve them on GitHub before merging';
        } else if (computing) {
            bg = '#fffbeb';
            color = '#92400e';
            icon = <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />;
            label = 'GitHub is computing mergeability — try again in a moment';
        }
    }

    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                background: bg,
                color,
                borderRadius: '0.5rem',
                fontSize: '0.8125rem',
                fontWeight: 500,
                flexWrap: 'wrap',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {icon}
                <span>{label}</span>
                {prStatus?.exists && prStatus.url && (
                    <a
                        href={prStatus.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'inherit', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                        PR #{prStatus.number} <ExternalLink size={12} />
                    </a>
                )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                    onClick={onRefresh}
                    disabled={prLoading}
                    style={{
                        padding: '0.35rem 0.65rem',
                        background: 'transparent',
                        border: '1px solid currentColor',
                        color: 'inherit',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        cursor: prLoading ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    Refresh
                </button>
                <button
                    onClick={onMerge}
                    disabled={!mergeable || merging}
                    title={
                        !prStatus?.exists
                            ? 'No PR to merge yet'
                            : conflicted
                              ? 'Merge conflicts — resolve on GitHub first'
                              : computing
                                ? 'GitHub is computing mergeability'
                                : 'Squash-merge into main'
                    }
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        background: mergeable ? '#059669' : '#9ca3af',
                        border: '1px solid transparent',
                        color: '#fff',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: !mergeable || merging ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                    }}
                >
                    {merging ? (
                        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <GitMerge size={12} />
                    )}
                    {merging ? 'Merging...' : 'Merge to main'}
                </button>
            </div>
        </div>
    );
}

function InProgressJobCard({ job, onRefined, onMerge, merging, mergeable, conflicted, computing }) {
    const [refinePrompt, setRefinePrompt] = useState('');
    const [refining, setRefining] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const prompts = Array.isArray(job.prompts) ? job.prompts : [];
    const summary = suggestionSummary(job.suggestion);

    const handleRefine = async () => {
        const text = refinePrompt.trim();
        if (!text || refining) return;
        setRefining(true);
        toast.loading('Sending refinement to Claude...', { id: `refine-${job.id}` });
        try {
            const token = sessionStorage.getItem('admin_token');
            const res = await fetch(`/api/admin/seo/develop/jobs/${job.id}/refine`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userPrompt: text }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) {
                throw new Error(json.error || 'Refine failed');
            }
            toast.success('Refinement dispatched — Claude will update the PR', {
                id: `refine-${job.id}`,
            });
            setRefinePrompt('');
            onRefined?.();
        } catch (err) {
            toast.error(err.message, { id: `refine-${job.id}` });
        } finally {
            setRefining(false);
        }
    };

    return (
        <div
            style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.625rem',
                padding: '1rem',
                background: '#fff',
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.025em', marginBottom: '0.25rem' }}>
                        {job.suggestion_type}
                    </div>
                    <div style={{ fontWeight: 500, color: '#111827', fontSize: '0.9rem' }}>{summary}</div>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280' }}>
                        Started {new Date(job.created_at).toLocaleString()}
                        {prompts.length > 0 && (
                            <>
                                {' · '}
                                <button
                                    onClick={() => setShowHistory((s) => !s)}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        color: '#2563eb',
                                        cursor: 'pointer',
                                        fontSize: 'inherit',
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {prompts.length} prompt{prompts.length === 1 ? '' : 's'} {showHistory ? '▲' : '▼'}
                                </button>
                            </>
                        )}
                    </div>
                </div>
                <button
                    onClick={onMerge}
                    disabled={!mergeable || merging}
                    title={
                        conflicted
                            ? 'Merge conflicts — resolve on GitHub first'
                            : computing
                              ? 'GitHub is computing mergeability'
                              : !mergeable
                                ? 'No mergeable PR yet'
                                : 'Merge into main'
                    }
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        background: mergeable ? '#059669' : '#e5e7eb',
                        color: mergeable ? '#fff' : '#6b7280',
                        border: '1px solid transparent',
                        borderRadius: '0.375rem',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: !mergeable || merging ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                        flexShrink: 0,
                    }}
                >
                    <GitMerge size={12} />
                    Merge
                </button>
            </div>

            {showHistory && prompts.length > 0 && (
                <ol style={{ margin: '0.75rem 0 0', paddingLeft: '1.25rem', fontSize: '0.8125rem', color: '#374151' }}>
                    {prompts.map((p, i) => (
                        <li key={i} style={{ marginBottom: '0.25rem' }}>
                            <span style={{ color: '#6b7280' }}>[{p.kind || 'prompt'}]</span> {p.text}
                        </li>
                    ))}
                </ol>
            )}

            <div style={{ marginTop: '0.75rem' }}>
                <textarea
                    value={refinePrompt}
                    onChange={(e) => setRefinePrompt(e.target.value)}
                    disabled={refining}
                    rows={2}
                    placeholder="Add follow-up instruction (e.g. 'also update the EN version', 'revert the meta change on /aanvraag')..."
                    style={{
                        width: '100%',
                        padding: '0.5rem 0.65rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.375rem',
                        fontSize: '0.8125rem',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        boxSizing: 'border-box',
                    }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                        onClick={handleRefine}
                        disabled={refining || !refinePrompt.trim()}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.85rem',
                            background: refining || !refinePrompt.trim() ? '#e5f6f4' : '#009B8A',
                            color: refining || !refinePrompt.trim() ? '#009B8A' : '#fff',
                            border: '1px solid #009B8A',
                            borderRadius: '0.375rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: refining || !refinePrompt.trim() ? 'not-allowed' : 'pointer',
                            fontFamily: 'inherit',
                        }}
                    >
                        {refining ? (
                            <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <Wrench size={12} />
                        )}
                        {refining ? 'Sending...' : 'Refine'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CompletedSection({ jobs }) {
    const [collapsed, setCollapsed] = useState(true);

    return (
        <div className={styles.section}>
            <button
                onClick={() => setCollapsed((c) => !c)}
                style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                }}
            >
                <div className={styles.priorityHeader}>
                    <div>
                        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>
                            <CheckCircle2 size={18} style={{ display: 'inline', marginRight: 8, color: '#059669' }} />
                            Completed ({jobs.length})
                        </h3>
                        <p className={styles.sectionSubtitle} style={{ margin: '0.25rem 0 0' }}>
                            Suggestions that have been merged into main.
                        </p>
                    </div>
                    {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                </div>
            </button>

            {!collapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {jobs.map((job) => (
                        <div
                            key={job.id}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                gap: '0.75rem',
                                padding: '0.75rem 1rem',
                                border: '1px solid #e5e7eb',
                                borderRadius: '0.5rem',
                                background: '#f9fafb',
                            }}
                        >
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.025em' }}>
                                    {job.suggestion_type}
                                </div>
                                <div style={{ fontWeight: 500, fontSize: '0.875rem', color: '#111827' }}>
                                    {suggestionSummary(job.suggestion)}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.125rem' }}>
                                    Merged {job.completed_at ? new Date(job.completed_at).toLocaleString() : '—'}
                                </div>
                            </div>
                            {job.pr_url && (
                                <a
                                    href={job.pr_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.3rem',
                                        fontSize: '0.75rem',
                                        color: '#2563eb',
                                        textDecoration: 'none',
                                        flexShrink: 0,
                                    }}
                                >
                                    PR #{job.pr_number} <ExternalLink size={12} />
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

