'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import styles from './AanhuurLeadsDashboard.module.css';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */
export type Stage = 'lead' | 'scheduled' | 'offer' | 'won';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  language: string;
  bedrooms: string;
  budget: string;
  stage: Stage;
  amount: number | null;
  createdAt: string;
  channel: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
}

interface ApiStats {
  total: number;
  today: number;
  thisWeek: number;
  byLanguage: Record<string, number>;
  bySource: Record<string, number>;
}

interface StageDef { key: Stage; rank: number; labelNl: string; labelEn: string; badge?: string; bar?: string; }

/* ------------------------------------------------------------------ */
/* Strings (NL / EN)                                                  */
/* ------------------------------------------------------------------ */
const STRINGS = {
  nl: {
    title: 'Leads Dashboard',
    updated: 'Bijgewerkt',
    refresh: 'Vernieuwen',
    admin: 'Admin',
    month: 'Maand',
    channel: 'Kanaal',
    all: 'Alle',
    totalLeads: 'Totaal leads',
    received: 'binnengekomen',
    viewings: 'Bezichtigingen',
    offerMade: 'Bod uitgebracht',
    dealsWon: 'Deals gewonnen',
    revenue: 'Omzet',
    fromWonDeals: 'uit gewonnen deals',
    conversion: 'Conversie',
    leadToDeal: 'lead naar deal',
    avgDealValue: 'Gem. dealwaarde',
    funnel: 'Funnel',
    dropText: 'uitval t.o.v. vorige stap',
    leadsPerSource: 'Leads per bron',
    noData: 'Geen data',
    leads: 'leads',
    performance: 'Prestatie per kanaal',
    channelCol: 'Kanaal',
    leadsCol: 'Leads',
    dealsCol: 'Deals',
    revenueCol: 'Omzet',
    convCol: 'Conv.',
    leadsTable: 'Leads',
    searchPlaceholder: 'Zoek op naam of telefoon...',
    nameCol: 'Naam',
    phoneCol: 'Telefoon',
    langCol: 'Taal',
    bedroomsCol: 'Slaapk.',
    budgetCol: 'Budget',
    statusCol: 'Status',
    createdCol: 'Binnengekomen',
    noLeads: 'Geen leads gevonden.',
    utmSource: 'UTM Bron',
    utmMedium: 'UTM Medium',
    utmCampaign: 'UTM Campagne',
    utmContent: 'UTM Content',
    utmTerm: 'UTM Term',
    referrer: 'Verwijzer',
    dash: '—',
    exportCsv: 'CSV',
  },
  en: {
    title: 'Leads Dashboard',
    updated: 'Updated',
    refresh: 'Refresh',
    admin: 'Admin',
    month: 'Month',
    channel: 'Channel',
    all: 'All',
    totalLeads: 'Total Leads',
    received: 'received',
    viewings: 'Viewings',
    offerMade: 'Offer Made',
    dealsWon: 'Deals Won',
    revenue: 'Revenue',
    fromWonDeals: 'from won deals',
    conversion: 'Conversion',
    leadToDeal: 'lead to deal',
    avgDealValue: 'Avg. deal value',
    funnel: 'Funnel',
    dropText: 'drop vs. previous step',
    leadsPerSource: 'Leads per source',
    noData: 'No data',
    leads: 'leads',
    performance: 'Performance per channel',
    channelCol: 'Channel',
    leadsCol: 'Leads',
    dealsCol: 'Deals',
    revenueCol: 'Revenue',
    convCol: 'Conv.',
    leadsTable: 'Leads',
    searchPlaceholder: 'Search by name or phone...',
    nameCol: 'Name',
    phoneCol: 'Phone',
    langCol: 'Lang',
    bedroomsCol: 'Beds',
    budgetCol: 'Budget',
    statusCol: 'Status',
    createdCol: 'Created',
    noLeads: 'No leads found.',
    utmSource: 'UTM Source',
    utmMedium: 'UTM Medium',
    utmCampaign: 'UTM Campaign',
    utmContent: 'UTM Content',
    utmTerm: 'UTM Term',
    referrer: 'Referrer',
    dash: '—',
    exportCsv: 'CSV',
  },
};

/* ------------------------------------------------------------------ */
/* Config                                                             */
/* ------------------------------------------------------------------ */
const STAGES: StageDef[] = [
  { key: 'lead', rank: 1, labelNl: 'Lead', labelEn: 'Lead', badge: styles.bLead },
  { key: 'scheduled', rank: 2, labelNl: 'Bezichtiging gepland', labelEn: 'Viewing Scheduled', badge: styles.bScheduled, bar: styles.barS2 },
  { key: 'offer', rank: 3, labelNl: 'Bod uitgebracht', labelEn: 'Offer Made', badge: styles.bOffer, bar: styles.barS3 },
  { key: 'won', rank: 4, labelNl: 'Deal gewonnen', labelEn: 'Deal Won', badge: styles.bWon, bar: styles.barS4 },
];

const STATUS_FILTERS: { key: 'all' | Stage; labelNl: string; labelEn: string }[] = [
  { key: 'all', labelNl: 'Alle', labelEn: 'All' },
  { key: 'lead', labelNl: 'Lead', labelEn: 'Lead' },
  { key: 'scheduled', labelNl: 'Bezichtiging', labelEn: 'Viewing' },
  { key: 'offer', labelNl: 'Bod', labelEn: 'Offer' },
  { key: 'won', labelNl: 'Gewonnen', labelEn: 'Won' },
];

const CHANNELS_NL: Record<string, { label: string; cls: string }> = {
  meta_ads: { label: 'Meta Ads', cls: styles.chMeta },
  google_ads: { label: 'Google Ads', cls: styles.chGoogle },
  instagram: { label: 'Instagram', cls: styles.chInstagram },
  organic: { label: 'Organisch', cls: styles.chOrganic },
  referral: { label: 'Doorverwijzing', cls: styles.chReferral },
};

const CHANNELS_EN: Record<string, { label: string; cls: string }> = {
  meta_ads: { label: 'Meta Ads', cls: styles.chMeta },
  google_ads: { label: 'Google Ads', cls: styles.chGoogle },
  instagram: { label: 'Instagram', cls: styles.chInstagram },
  organic: { label: 'Organic', cls: styles.chOrganic },
  referral: { label: 'Referral', cls: styles.chReferral },
};

const CHANNEL_COLOR: Record<string, string> = {
  meta_ads: '#1877F2', google_ads: '#D93025', instagram: '#C13584', organic: '#15803D', referral: '#E66C1A',
};

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */
const cx = (...c: Array<string | false | undefined | null>) => c.filter(Boolean).join(' ');
const eur = (n: number, lang: 'nl' | 'en' = 'nl') =>
  new Intl.NumberFormat(lang === 'nl' ? 'nl-NL' : 'en-US', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);
const pct = (n: number, t: number) => (t ? `${Math.round((n / t) * 100)}%` : '0%');
const asArr = (v: string | string[] | undefined | null): string[] =>
  v == null || v === '' ? [] : Array.isArray(v) ? v : [v];
const bedroomsText = (d: Lead) => asArr(d.bedrooms).filter(Boolean).join(', ');

function budgetText(d: Lead, lang: 'nl' | 'en'): string {
  const a = asArr(d.budget).filter(Boolean);
  if (!a.length) return '';
  let lo = Infinity;
  let hi = -Infinity;
  for (const r of a) {
    const m = String(r).split('-');
    const x = parseInt(m[0], 10);
    const y = parseInt(m[1] ?? m[0], 10);
    if (!isNaN(x) && x < lo) lo = x;
    if (!isNaN(y) && y > hi) hi = y;
  }
  if (lo === Infinity) return a.join(', ');
  return lang === 'nl' ? `€${lo} tot €${hi}` : `€${lo} – €${hi}`;
}

const monthKey = (d: Lead) => (d.createdAt || '').slice(0, 7);
function monthLabel(key: string, lang: 'nl' | 'en'): string {
  const [y, m] = key.split('-').map(Number);
  const locale = lang === 'nl' ? 'nl-NL' : 'en-US';
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short', year: 'numeric' });
}
function fmtDate(s: string, lang: 'nl' | 'en'): string {
  if (!s) return '';
  const d = new Date(s);
  const locale = lang === 'nl' ? 'nl-NL' : 'en-US';
  return isNaN(d.getTime()) ? s : d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}
const rankOf = (s: Stage) => STAGES.find((x) => x.key === s)?.rank ?? 1;
const stageMeta = (k: Stage) => STAGES.find((x) => x.key === k) ?? STAGES[0];
const chanMeta = (k: string, lang: 'nl' | 'en') => (lang === 'nl' ? CHANNELS_NL : CHANNELS_EN)[k] ?? { label: k || '', cls: styles.chOrganic };

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function AanhuurLeadsDashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'nl' | 'en'>('nl');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Stage>('all');
  const [search, setSearch] = useState('');
  const [updated, setUpdated] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverStats, setServerStats] = useState<ApiStats | null>(null);

  const s = STRINGS[lang];

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search.trim()) params.set('search', search.trim());
      if (channelFilter !== 'all') params.set('source', channelFilter);
      const res = await fetch(`/api/admin/lead-dashboard?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        sessionStorage.removeItem('admin_token');
        router.push('/admin');
        return;
      }
      const data = await res.json();
      if (data.success) {
        const mapped: Lead[] = (data.leads || []).map((l: Record<string, unknown>) => ({
          id: l.id as string,
          name: l.full_name as string || '',
          phone: l.phone as string || '',
          email: l.email as string || '',
          language: l.language as string || 'nl',
          bedrooms: l.bedrooms as string || '',
          budget: l.budget as string || '',
          stage: 'lead' as Stage,
          amount: null,
          createdAt: l.created_at as string || '',
          channel: l.source as string || 'meta_ads',
          utm_source: l.utm_source as string || '',
          utm_medium: l.utm_medium as string || '',
          utm_campaign: l.utm_campaign as string || '',
          utm_content: l.utm_content as string || '',
          utm_term: l.utm_term as string || '',
          referrer: l.referrer as string || '',
        }));
        setLeads(mapped);
        setServerTotal(data.total || 0);
        setServerStats(data.stats || null);
        setUpdated(new Date().toLocaleTimeString(lang === 'nl' ? 'nl-NL' : 'en-US', { hour: '2-digit', minute: '2-digit' }));
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, channelFilter, router, lang]);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchLeads();
  }, [router, fetchLeads]);

  const months = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of leads) {
      const k = monthKey(d);
      if (k) counts[k] = (counts[k] || 0) + 1;
    }
    const keys = Object.keys(counts).sort().reverse();
    return [
      { key: 'all', label: s.all, count: leads.length },
      ...keys.map((k) => ({ key: k, label: monthLabel(k, lang), count: counts[k] })),
    ];
  }, [leads, s]);

  const channels = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of leads) {
      const k = d.channel;
      if (k) counts[k] = (counts[k] || 0) + 1;
    }
    const keys = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    return [
      { key: 'all', label: s.all, count: leads.length },
      ...keys.map((k) => ({ key: k, label: chanMeta(k, lang).label, count: counts[k] })),
    ];
  }, [leads, s]);

  const monthScoped = useMemo(
    () => (monthFilter === 'all' ? leads : leads.filter((d) => monthKey(d) === monthFilter)),
    [leads, monthFilter],
  );
  const scoped = useMemo(
    () => (channelFilter === 'all' ? monthScoped : monthScoped.filter((d) => d.channel === channelFilter)),
    [monthScoped, channelFilter],
  );

  const total = serverStats?.total ?? scoped.length;
  const countAtLeast = (k: Stage) => scoped.filter((d) => rankOf(d.stage) >= rankOf(k)).length;
  const won = scoped.filter((d) => d.stage === 'won');
  const revenue = won.reduce((acc, d) => acc + (d.amount || 0), 0);
  const conv = total ? Math.round((won.length / total) * 100) : 0;

  const channelRows = useMemo(() => {
    const keys = Array.from(new Set(monthScoped.map((d) => d.channel).filter(Boolean)));
    return keys
      .map((k) => {
        const arr = monthScoped.filter((d) => d.channel === k);
        const w = arr.filter((d) => d.stage === 'won');
        const rev = w.reduce((acc, d) => acc + (d.amount || 0), 0);
        return { key: k, meta: chanMeta(k, lang), leads: arr.length, won: w.length, rev, conv: arr.length ? Math.round((w.length / arr.length) * 100) : 0 };
      })
      .sort((a, b) => b.leads - a.leads);
  }, [monthScoped, lang]);

  const rows = useMemo(() => {
    return scoped
      .filter((d) => (statusFilter === 'all' ? true : d.stage === statusFilter))
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [scoped, statusFilter]);

  const DONUT_R = 54;
  const DONUT_C = 2 * Math.PI * DONUT_R;
  const donutTotal = monthScoped.length || 1;
  let donutOffset = 0;
  const donutSegments = channelRows.map((r) => {
    const len = (r.leads / donutTotal) * DONUT_C;
    const seg = {
      key: r.key,
      color: CHANNEL_COLOR[r.key] ?? '#718096',
      label: r.meta.label,
      leads: r.leads,
      pc: Math.round((r.leads / donutTotal) * 100),
      len,
      offset: donutOffset,
    };
    donutOffset += len;
    return seg;
  });

  const utmFields = (d: Lead) => [
    { label: s.utmSource, value: d.utm_source },
    { label: s.utmMedium, value: d.utm_medium },
    { label: s.utmCampaign, value: d.utm_campaign },
    { label: s.utmContent, value: d.utm_content },
    { label: s.utmTerm, value: d.utm_term },
    { label: s.referrer, value: d.referrer },
  ];

  const toggleRow = (id: string) => setExpandedId(prev => prev === id ? null : id);

  const totalPages = Math.ceil(serverTotal / limit);

  const handleExport = () => {
    if (leads.length === 0) return;
    const headers = [
      s.nameCol, s.phoneCol, s.langCol, s.bedroomsCol, s.budgetCol, s.statusCol,
      s.channelCol, s.utmSource, s.utmMedium, s.utmCampaign, s.utmContent, s.utmTerm, s.referrer, s.createdCol,
    ];
    const csvRows = leads.map(d => [
      d.name, d.phone, (d.language || '').toUpperCase(),
      bedroomsText(d), budgetText(d, lang),
      lang === 'nl' ? stageMeta(d.stage).labelNl : stageMeta(d.stage).labelEn,
      chanMeta(d.channel, lang).label,
      d.utm_source || '', d.utm_medium || '', d.utm_campaign || '',
      d.utm_content || '', d.utm_term || '', d.referrer || '',
      fmtDate(d.createdAt, lang),
    ]);
    const csv = [headers, ...csvRows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lead-dashboard-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.dashboard}>
        <div className={styles.main} style={{ textAlign: 'center', padding: '3rem' }}>
          Loading leads...
        </div>
      </div>
    );
  }

  const statsToday = serverStats?.today ?? 0;
  const statsThisWeek = serverStats?.thisWeek ?? 0;
  const statsBySource = serverStats?.bySource ?? {};
  const statsByLanguage = serverStats?.byLanguage ?? {};

  return (
    <div className={styles.dashboard}>
      <header className={styles.topbar}>
        <img  src={'/images/horizontal-logo.png'}/>
        <span className={styles.ttl}>{s.title}</span>
        <div className={styles.right}>
          <div className={styles.langToggle}>
            <button className={cx(styles.langBtn, lang === 'nl' && styles.active)} onClick={() => setLang('nl')}>NL</button>
            <button className={cx(styles.langBtn, lang === 'en' && styles.active)} onClick={() => setLang('en')}>EN</button>
          </div>
          {updated && <span>{s.updated} {updated}</span>}
          <button className={styles.refresh} onClick={fetchLeads}>{s.refresh}</button>
          <button className={styles.refresh} onClick={handleExport} disabled={leads.length === 0} style={{ opacity: leads.length === 0 ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <Download size={14} /> CSV
          </button>
          <a href="/admin/dashboard" className={styles.backBtn}>{s.admin}</a>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.toolbar}>
          <div className={styles.chipsGroup}>
            <span className={styles.lbl}>{s.month}</span>
            <div className={styles.chips}>
              {months.map((m) => (
                <button key={m.key} className={cx(styles.pill, monthFilter === m.key && styles.active)} onClick={() => setMonthFilter(m.key)}>
                  {m.label}
                  <span className={styles.mc}>{m.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className={styles.chipsGroup}>
            <span className={styles.lbl}>{s.channel}</span>
            <div className={styles.chips}>
              {channels.map((c) => (
                <button key={c.key} className={cx(styles.pill, channelFilter === c.key && styles.active)} onClick={() => { setChannelFilter(c.key); setPage(1); }}>
                  {c.label}
                  <span className={styles.mc}>{c.count}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{s.totalLeads}</div>
            <div className={styles.kpiValue}>{serverStats?.total ?? 0}</div>
            <div className={styles.kpiSub}>{s.received}</div>
          </div>
          <div className={cx(styles.kpi, styles.accent)}>
            <div className={styles.kpiLabel}>{s.viewings}</div>
            <div className={styles.kpiValue}>{countAtLeast('scheduled')}</div>
            <div className={styles.kpiSub}>{pct(countAtLeast('scheduled'), total)}</div>
          </div>
          <div className={cx(styles.kpi, styles.accent)}>
            <div className={styles.kpiLabel}>{s.offerMade}</div>
            <div className={styles.kpiValue}>{countAtLeast('offer')}</div>
            <div className={styles.kpiSub}>{pct(countAtLeast('offer'), total)}</div>
          </div>
          <div className={cx(styles.kpi, styles.accent)}>
            <div className={styles.kpiLabel}>{s.dealsWon}</div>
            <div className={styles.kpiValue}>{won.length}</div>
            <div className={styles.kpiSub}>{pct(won.length, total)}</div>
          </div>
          <div className={cx(styles.kpi, styles.money)}>
            <div className={styles.kpiLabel}>{s.revenue}</div>
            <div className={styles.kpiValue}>{eur(revenue, lang)}</div>
            <div className={styles.kpiSub}>{s.fromWonDeals}</div>
          </div>
          <div className={cx(styles.kpi, styles.money)}>
            <div className={styles.kpiLabel}>{s.conversion}</div>
            <div className={styles.kpiValue}>{conv}%</div>
            <div className={styles.kpiSub}>{s.leadToDeal}</div>
          </div>
        </section>

        <section className={styles.grid2}>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{s.funnel}</h2>
            {STAGES.map((st, i) => {
              const cnt = countAtLeast(st.key);
              const wPct = total ? Math.max(4, Math.round((cnt / total) * 100)) : 0;
              const prev = i > 0 ? countAtLeast(STAGES[i - 1].key) : cnt;
              const drop = i > 0 && prev ? Math.round((1 - cnt / prev) * 100) : 0;
              return (
                <div key={st.key} className={styles.funnelRow}>
                  <div className={styles.funnelTop}>
                    <span className={styles.funnelName}>{lang === 'nl' ? st.labelNl : st.labelEn}</span>
                    <span className={styles.funnelCnt}>
                      <b>{cnt}</b> · {pct(cnt, total)}
                    </span>
                  </div>
                  <div className={cx(styles.bar, st.bar)}>
                    <span className={styles.barFill} style={{ width: `${wPct}%` }} />
                  </div>
                  {i > 0 && <div className={styles.drop}>{drop}% {s.dropText}</div>}
                </div>
              );
            })}
          </div>
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>{s.leadsPerSource}</h2>
            <div className={styles.srcChart}>
              <div className={styles.donutWrap}>
                <svg width="140" height="140" viewBox="0 0 140 140">
                  {donutSegments.length === 0 && (
                    <circle cx="70" cy="70" r={DONUT_R} fill="none" stroke="#E2E8F0" strokeWidth="22" />
                  )}
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.key}
                      cx="70"
                      cy="70"
                      r={DONUT_R}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="22"
                      strokeDasharray={`${seg.len} ${DONUT_C - seg.len}`}
                      strokeDashoffset={-seg.offset}
                      transform="rotate(-90 70 70)"
                    />
                  ))}
                  <text x="70" y="68" textAnchor="middle" fontSize="27" fontWeight="800" fill="#1A202C">
                    {monthScoped.length}
                  </text>
                  <text x="70" y="85" textAnchor="middle" fontSize="11" fill="#718096">
                    {s.leads}
                  </text>
                </svg>
              </div>
              <div className={styles.srcLegend}>
                {donutSegments.map((seg) => (
                  <div key={seg.key} className={styles.legRow}>
                    <span className={styles.legDot} style={{ background: seg.color }} />
                    <span className={styles.legName}>{seg.label}</span>
                    <span className={styles.legVal}>
                      <b>{seg.leads}</b> · {seg.pc}%
                    </span>
                  </div>
                ))}
                {donutSegments.length === 0 && <div className={styles.muted}>{s.noData}</div>}
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card} style={{ marginBottom: 30 }}>
          <div className={styles.tableHead}>
            <h2 className={styles.cardTitle}>{s.leadsTable}</h2>
            <input
              className={styles.search}
              type="search"
              placeholder={s.searchPlaceholder}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <div className={styles.filters}>
              {STATUS_FILTERS.map((f) => (
                <button key={f.key} className={cx(styles.pill, statusFilter === f.key && styles.active)} onClick={() => setStatusFilter(f.key)}>
                  {lang === 'nl' ? f.labelNl : f.labelEn}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>{s.nameCol}</th>
                  <th>{s.phoneCol}</th>
                  <th>{s.langCol}</th>
                  <th>{s.bedroomsCol}</th>
                  <th>{s.budgetCol}</th>
                  <th>{s.statusCol}</th>
                  <th>{s.channelCol}</th>
                  <th>{s.createdCol}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => {
                  const sm = stageMeta(d.stage);
                  const cm = chanMeta(d.channel, lang);
                  const isExpanded = expandedId === d.id;
                  return (
                    <Fragment key={d.id}>
                      <tr className={isExpanded ? styles.expandedParent : undefined}>
                        <td><b>{d.name}</b></td>
                        <td className={styles.muted}>{d.phone}</td>
                        <td>{(d.language || '').toUpperCase()}</td>
                        <td>{bedroomsText(d)}</td>
                        <td className={styles.muted}>{budgetText(d, lang)}</td>
                        <td>
                          <span className={cx(styles.badge, sm.badge)}>{lang === 'nl' ? sm.labelNl : sm.labelEn}</span>
                        </td>
                        <td>
                          <span className={cx(styles.chan, cm.cls)}>{cm.label}</span>
                        </td>
                        <td className={styles.muted}>{fmtDate(d.createdAt, lang)}</td>
                        <td>
                          <button className={styles.expandBtn} onClick={() => toggleRow(d.id)} title="UTM data">
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${d.id}-utm`}>
                          <td colSpan={9} className={styles.expandedRow}>
                            <div className={styles.utmGrid}>
                              {utmFields(d).map(({ label, value }) => (
                                <div key={label} className={styles.utmItem}>
                                  <span className={styles.utmLabel}>{label}</span>
                                  <span className={styles.utmValue}>{value || s.dash}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className={styles.muted} style={{ textAlign: 'center', padding: 24 }}>
                      {s.noLeads}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {totalPages > 1 && (
          <section className={styles.card} style={{ marginTop: 16, padding: '12px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 13, color: 'var(--grey-soft)' }}>
                {((page - 1) * limit) + 1}–{Math.min(page * limit, serverTotal)} / {serverTotal}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13, fontFamily: 'inherit' }}
                >
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
                <button className={styles.refresh} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={{ opacity: page <= 1 ? 0.5 : 1 }}>
                  ‹
                </button>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{page} / {totalPages}</span>
                <button className={styles.refresh} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={{ opacity: page >= totalPages ? 0.5 : 1 }}>
                  ›
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}