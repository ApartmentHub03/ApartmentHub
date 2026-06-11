'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Input from '@/components/ui/Input';
import { LogOut, Users, Clock, CalendarDays, TrendingUp, Search, Download, ChevronLeft, ChevronRight, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import styles from './meta-leads.module.css';

const BEDROOM_OPTIONS = ['1', '2', '3', '4+'];
const BUDGET_OPTIONS = ['2000-2500', '2500-3000', '3000-3500', '3500-4000', '4000-4500'];

export default function MetaLeadsDashboard() {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({ total: 0, today: 0, thisWeek: 0, byLanguage: {}, bySource: {} });
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit] = useState(50);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [languageFilter, setLanguageFilter] = useState('');
    const [bedroomsFilter, setBedroomsFilter] = useState('');
    const [budgetFilter, setBudgetFilter] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        setAuthenticated(true);
    }, [router]);

    const fetchLeads = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (search) params.set('search', search);
            if (sourceFilter) params.set('source', sourceFilter);
            if (languageFilter) params.set('language', languageFilter);
            if (bedroomsFilter) params.set('bedrooms', bedroomsFilter);
            if (budgetFilter) params.set('budget', budgetFilter);

            const res = await fetch(`/api/admin/meta-leads?${params.toString()}`);
            const data = await res.json();

            if (!data.success) {
                toast.error('Failed to load leads');
                return;
            }

            setLeads(data.leads);
            setTotal(data.total);
            setStats(data.stats);
        } catch {
            toast.error('Failed to load leads');
        } finally {
            setLoading(false);
        }
    }, [page, limit, search, sourceFilter, languageFilter, bedroomsFilter, budgetFilter]);

    useEffect(() => {
        if (authenticated) fetchLeads();
    }, [authenticated, fetchLeads]);

    const handleSearch = () => {
        setSearch(searchInput);
        setPage(1);
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleExport = () => {
        if (leads.length === 0) return;

        const headers = ['Name', 'Phone', 'Email', 'Bedrooms', 'Budget', 'Language', 'Source', 'UTM Source', 'UTM Medium', 'UTM Campaign', 'UTM Content', 'UTM Term', 'Referrer', 'Created'];
        const rows = leads.map(l => [
            l.full_name,
            l.phone,
            l.email || '',
            l.bedrooms || '',
            l.budget || '',
            l.language,
            l.source || '',
            l.utm_source || '',
            l.utm_medium || '',
            l.utm_campaign || '',
            l.utm_content || '',
            l.utm_term || '',
            l.referrer || '',
            new Date(l.created_at).toLocaleString('en-NL', { timeZone: 'Europe/Amsterdam' }),
        ]);

        const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meta-leads-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_token');
        router.push('/admin');
    };

    const totalPages = Math.ceil(total / limit);

    const formatDate = (dt) => {
        return new Date(dt).toLocaleString('en-NL', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Europe/Amsterdam',
        });
    };

    const toggleRow = (id) => {
        setExpandedRow(prev => prev === id ? null : id);
    };

    const utmFields = (lead) => [
        { label: 'UTM Source', value: lead.utm_source },
        { label: 'UTM Medium', value: lead.utm_medium },
        { label: 'UTM Campaign', value: lead.utm_campaign },
        { label: 'UTM Content', value: lead.utm_content },
        { label: 'UTM Term', value: lead.utm_term },
        { label: 'Referrer', value: lead.referrer },
    ];

    if (!authenticated) return null;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.headerLeft}>
                        <div className={styles.logoIcon}>
                            <Users size={20} />
                        </div>
                        <h1 className={styles.headerTitle}>Meta Leads</h1>
                    </div>
                    <div className={styles.headerActions}>
                        <Button variant="outline" size="sm" onClick={() => router.push('/admin/dashboard')}>
                            <Building2 size={16} />
                            Dashboard
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut size={16} />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.statsGrid}>
                    <Card shadow="lg">
                        <CardContent>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}><Users size={20} /></div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statValue}>{stats.total}</span>
                                    <span className={styles.statLabel}>Total Leads</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card shadow="lg">
                        <CardContent>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}><Clock size={20} /></div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statValue}>{stats.today}</span>
                                    <span className={styles.statLabel}>Today</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card shadow="lg">
                        <CardContent>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}><CalendarDays size={20} /></div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statValue}>{stats.thisWeek}</span>
                                    <span className={styles.statLabel}>This Week</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card shadow="lg">
                        <CardContent>
                            <div className={styles.statCard}>
                                <div className={styles.statIcon}><TrendingUp size={20} /></div>
                                <div className={styles.statInfo}>
                                    <span className={styles.statValue}>
                                        {Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'}
                                    </span>
                                    <span className={styles.statLabel}>Top Source</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className={styles.toolbar}>
                    <div className={styles.searchRow}>
                        <div className={styles.searchBox}>
                            <Input
                                placeholder="Search name, phone, email..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                            />
                            <button className={styles.searchBtn} onClick={handleSearch} title="Search">
                                <Search size={16} />
                            </button>
                        </div>
                        <div className={styles.filterGroup}>
                            <select
                                className={styles.select}
                                value={languageFilter}
                                onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Languages</option>
                                <option value="nl">Dutch</option>
                                <option value="en">English</option>
                            </select>
                            <select
                                className={styles.select}
                                value={sourceFilter}
                                onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Sources</option>
                                {Object.keys(stats.bySource).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            <select
                                className={styles.select}
                                value={bedroomsFilter}
                                onChange={(e) => { setBedroomsFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Bedrooms</option>
                                {BEDROOM_OPTIONS.map(b => (
                                    <option key={b} value={b}>{b === '4+' ? '4+' : b}</option>
                                ))}
                            </select>
                            <select
                                className={styles.select}
                                value={budgetFilter}
                                onChange={(e) => { setBudgetFilter(e.target.value); setPage(1); }}
                            >
                                <option value="">All Budgets</option>
                                {BUDGET_OPTIONS.map(b => (
                                    <option key={b} value={b}>
                                        &euro;{b.replace('-', ' – \u20ac')}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleExport} disabled={leads.length === 0}>
                        <Download size={14} />
                        Export CSV
                    </Button>
                </div>

                <div className={styles.tableWrapper}>
                    {loading ? (
                        <div className={styles.loadingState}>Loading leads...</div>
                    ) : leads.length === 0 ? (
                        <Card>
                            <CardContent>
                                <div className={styles.emptyState}>
                                    <Users size={48} className={styles.emptyIcon} />
                                    <p className={styles.emptyText}>No leads found</p>
                                    <p className={styles.emptySubtext}>Adjust filters or wait for new leads to come in.</p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <colgroup>
                                    <col style={{ width: '17%' }} />
                                    <col style={{ width: '13%' }} />
                                    <col style={{ width: '17%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '6%' }} />
                                    <col style={{ width: '9%' }} />
                                    <col style={{ width: '11%' }} />
                                    <col style={{ width: '7%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Phone</th>
                                        <th>Email</th>
                                        <th>Bedrooms</th>
                                        <th>Budget</th>
                                        <th>Lang</th>
                                        <th>Source</th>
                                        <th>Created</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map((lead) => (
                                        <>
                                            <tr key={lead.id} className={expandedRow === lead.id ? styles.expandedParent : ''}>
                                                <td className={styles.nameCell} title={lead.full_name}>{lead.full_name}</td>
                                                <td className={styles.phoneCell} title={lead.phone}>{lead.phone}</td>
                                                <td className={styles.emailCell} title={lead.email || ''}>{lead.email || '—'}</td>
                                                <td className={styles.bedroomsCell}>{lead.bedrooms || '—'}</td>
                                                <td className={styles.budgetCell}>{lead.budget || '—'}</td>
                                                <td className={styles.langCell}>
                                                    <Badge variant={lead.language === 'nl' ? 'default' : 'secondary'} size="sm">
                                                        {lead.language}
                                                    </Badge>
                                                </td>
                                                <td className={styles.sourceCell} title={lead.source || ''}>{lead.source || '—'}</td>
                                                <td className={styles.dateCell} title={formatDate(lead.created_at)}>{formatDate(lead.created_at)}</td>
                                                <td>
                                                    <button
                                                        className={styles.expandBtn}
                                                        onClick={() => toggleRow(lead.id)}
                                                        title={expandedRow === lead.id ? 'Hide UTM data' : 'Show UTM data'}
                                                    >
                                                        {expandedRow === lead.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </button>
                                                </td>
                                            </tr>
                                            {expandedRow === lead.id && (
                                                <tr key={`${lead.id}-utm`}>
                                                    <td colSpan={9} className={styles.utmRow}>
                                                        <div className={styles.utmGrid}>
                                                            {utmFields(lead).map(({ label, value }) => (
                                                                <div key={label} className={styles.utmItem}>
                                                                    <span className={styles.utmLabel}>{label}</span>
                                                                    <span className={styles.utmValue}>{value || '—'}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <span className={styles.pageInfo}>
                            {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
                        </span>
                        <div className={styles.pageButtons}>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <ChevronLeft size={16} />
                            </Button>
                            <span className={styles.pageNum}>{page} / {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={page >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}