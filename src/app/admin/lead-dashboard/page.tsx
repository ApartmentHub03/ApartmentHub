'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  variant?: string;
  secondTenantName?: string;
  secondTenantPhone?: string;
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
  byMonth: Record<string, number>;
  byStage: Record<string, number>;
  totalRevenue: number;
  bySourceWon: Record<string, number>;
  bySourceRevenue: Record<string, number>;
  byVariant?: { A: { leads: number; won: number; revenue: number }; B: { leads: number; won: number; revenue: number } };
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
const asArr = (v: string | string[] | undefined | null): string[] => {
  if (v == null || v === '') return [];
  if (Array.isArray(v)) return v;
  try {
    const p = JSON.parse(v);
    if (Array.isArray(p)) return p;
  } catch {}
  return String(v).split(',').map(s => s.trim()).filter(Boolean);
};
const bedroomsText = (d: Lead) => asArr(d.bedrooms).filter(Boolean).join(', ');

function budgetItems(d: Lead, lang: 'nl' | 'en'): string[] {
  const a = asArr(d.budget).filter(Boolean);
  if (!a.length) return [];
  return a.map((r) => {
    const m = String(r).split('-');
    const x = parseInt(m[0], 10);
    const y = parseInt(m[1] ?? m[0], 10);
    if (isNaN(x)) return String(r);
    return x === y ? `€${x}` : `€${x}–€${y}`;
  });
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
/* Stage Editor                                                        */
/* ------------------------------------------------------------------ */
function StageEditor({ lead, lang, onUpdate }: { lead: Lead; lang: 'nl' | 'en'; onUpdate: () => void }) {
  const [showAmount, setShowAmount] = useState(false);
  const [amountVal, setAmountVal] = useState(lead.amount ? String(lead.amount) : '');
  const [confirmStage, setConfirmStage] = useState<Stage | null>(null);
  const stageLabels: Record<Stage, string> = {
    lead: lang === 'nl' ? 'Lead' : 'Lead',
    scheduled: lang === 'nl' ? 'Bezichtiging' : 'Viewing',
    offer: lang === 'nl' ? 'Bod' : 'Offer',
    won: lang === 'nl' ? 'Gewonnen' : 'Won',
  };
  const stageOrder: Stage[] = ['lead', 'scheduled', 'offer', 'won'];
  const currentRank = stageOrder.indexOf(lead.stage);

  const updateStage = async (newStage: Stage) => {
    const token = sessionStorage.getItem('admin_token') || '';
    const body: Record<string, unknown> = { stage: newStage };
    if (newStage === 'won' && amountVal) body.amount = parseFloat(amountVal);
    try {
      await fetch(`/api/admin/lead-dashboard/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      onUpdate();
    } catch {}
    setShowAmount(false);
    setConfirmStage(null);
  };

  const handleStageClick = (newStage: Stage) => {
    const newRank = stageOrder.indexOf(newStage);
    if (newRank < currentRank) {
      setConfirmStage(newStage);
    } else if (newStage === 'won') {
      setShowAmount(true);
    } else {
      updateStage(newStage);
    }
  };

  return (
    <div className={styles.stageEditor}>
      <div className={styles.stageEditorLabel}>
        {lang === 'nl' ? 'Fase aanpassen' : 'Update stage'}
      </div>
      <div className={styles.stageBtns}>
        {stageOrder.map((st) => (
          <button
            key={st}
            className={cx(styles.stageBtn, lead.stage === st && styles.stageBtnActive)}
            onClick={() => handleStageClick(st)}
          >
            {stageLabels[st]}
          </button>
        ))}
      </div>
      {showAmount && (
        <div className={styles.amountInput}>
          <input
            type="number"
            value={amountVal}
            onChange={(e) => setAmountVal(e.target.value)}
            placeholder={lang === 'nl' ? 'Bedrag (€)' : 'Amount (€)'}
          />
          <button onClick={() => updateStage('won')}>{lang === 'nl' ? 'Opslaan' : 'Save'}</button>
          <button onClick={() => setShowAmount(false)} style={{ background: '#f1f5f9', color: 'var(--grey)' }}>
            {lang === 'nl' ? 'Annuleren' : 'Cancel'}
          </button>
        </div>
      )}
      {confirmStage && (
        <div className={styles.confirmDialog} onClick={() => setConfirmStage(null)}>
          <div className={styles.confirmBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmTitle}>
              {lang === 'nl' ? 'Weet je het zeker?' : 'Are you sure?'}
            </div>
            <div className={styles.confirmText}>
              {lang === 'nl'
                ? `Deze lead teruggaan van "${stageLabels[lead.stage]}" naar "${stageLabels[confirmStage]}"?`
                : `Move this lead back from "${stageLabels[lead.stage]}" to "${stageLabels[confirmStage]}"?`}
            </div>
            <div className={styles.confirmBtns}>
              <button className={styles.confirmCancel} onClick={() => setConfirmStage(null)}>
                {lang === 'nl' ? 'Annuleren' : 'Cancel'}
              </button>
              <button className={styles.confirmYes} onClick={() => updateStage(confirmStage)}>
                {lang === 'nl' ? 'Ja, bevestig' : 'Yes, confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                          */
/* ------------------------------------------------------------------ */
export default function AanhuurLeadsDashboard() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadRef = useRef(true);
  const [lang, setLang] = useState<'nl' | 'en'>('nl');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [variantFilter, setVariantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | Stage>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [updated, setUpdated] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [serverTotal, setServerTotal] = useState(0);
  const [serverStats, setServerStats] = useState<ApiStats | null>(null);

  const s = STRINGS[lang];

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLeads = useCallback(async () => {
    if (initialLoadRef.current) setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      if (channelFilter !== 'all') params.set('source', channelFilter);
      if (variantFilter !== 'all') params.set('variant', variantFilter);
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
          stage: (l.stage as Stage) || 'lead',
          amount: (l.amount as number) || null,
          createdAt: l.created_at as string || '',
          channel: l.source as string || 'meta_ads',
          variant: (l.variant as string) || 'A',
          secondTenantName: (l.second_tenant_name as string) || '',
          secondTenantPhone: (l.second_tenant_phone as string) || '',
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
      initialLoadRef.current = false;
    }
  }, [page, limit, debouncedSearch, channelFilter, variantFilter, router, lang]);

  useEffect(() => {
    const token = sessionStorage.getItem('admin_token');
    if (!token) {
      router.push('/admin');
      return;
    }
    fetchLeads();
  }, [router, fetchLeads]);

  const months = useMemo(() => {
    const src = serverStats?.byMonth ?? {};
    const keys = Object.keys(src).sort().reverse();
    const totalAll = serverStats?.total ?? 0;
    return [
      { key: 'all', label: s.all, count: totalAll },
      ...keys.map((k) => ({ key: k, label: monthLabel(k, lang), count: src[k] })),
    ];
  }, [serverStats, s, lang]);

  const channels = useMemo(() => {
    const src = serverStats?.bySource ?? {};
    const keys = Object.keys(src).sort((a, b) => src[b] - src[a]);
    const totalAll = Object.values(src).reduce((a, b) => a + b, 0) || leads.length;
    return [
      { key: 'all', label: s.all, count: totalAll },
      ...keys.map((k) => ({ key: k, label: chanMeta(k, lang).label, count: src[k] })),
    ];
  }, [serverStats, leads.length, s, lang]);

  const monthScoped = useMemo(
    () => (monthFilter === 'all' ? leads : leads.filter((d) => monthKey(d) === monthFilter)),
    [leads, monthFilter],
  );
  const scoped = useMemo(
    () => (channelFilter === 'all' ? monthScoped : monthScoped.filter((d) => d.channel === channelFilter)),
    [monthScoped, channelFilter],
  );

  const statsTotal = serverStats?.total ?? 0;
  const statsBySource = serverStats?.bySource ?? {};
  const statsByStage = serverStats?.byStage ?? { lead: 0, scheduled: 0, offer: 0, won: 0 };
  const wonCount = statsByStage.won ?? 0;
  const revenue = serverStats?.totalRevenue ?? 0;
  const total = statsTotal;
  const countAtLeast = (k: Stage) => {
    const r = rankOf(k);
    let c = 0;
    for (const [s, n] of Object.entries(statsByStage)) {
      if (rankOf(s as Stage) >= r) c += n;
    }
    return c;
  };
  const conv = total ? Math.round((wonCount / total) * 100) : 0;
  const avgDeal = wonCount ? revenue / wonCount : 0;

  const channelRows = useMemo(() => {
    const src = statsBySource;
    const srcWon = serverStats?.bySourceWon ?? {};
    const srcRev = serverStats?.bySourceRevenue ?? {};
    const keys = Object.keys(src).sort((a, b) => src[b] - src[a]);
    return keys
      .map((k) => ({
        key: k,
        meta: chanMeta(k, lang),
        leads: src[k],
        won: srcWon[k] ?? 0,
        rev: srcRev[k] ?? 0,
        conv: src[k] ? Math.round(((srcWon[k] ?? 0) / src[k]) * 100) : 0,
      }))
      .sort((a, b) => b.leads - a.leads);
  }, [statsBySource, serverStats, lang]);

  const rows = useMemo(() => {
    return scoped
      .filter((d) => (statusFilter === 'all' ? true : d.stage === statusFilter))
      .slice()
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [scoped, statusFilter]);

  const DONUT_R = 54;
  const DONUT_C = 2 * Math.PI * DONUT_R;
  const donutTotal = statsTotal || 1;
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
      lang === 'nl' ? 'Bedrag' : 'Amount', 'Variant',
      s.channelCol, s.utmSource, s.utmMedium, s.utmCampaign, s.utmContent, s.utmTerm, s.referrer, s.createdCol,
    ];
    const csvRows = leads.map(d => [
      d.name, d.phone, (d.language || '').toUpperCase(),
      bedroomsText(d), budgetItems(d, lang).join(', '),
      lang === 'nl' ? stageMeta(d.stage).labelNl : stageMeta(d.stage).labelEn,
      d.amount ? String(d.amount) : '',
      d.variant || 'A',
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



  const statsToday = serverStats?.today ?? 0;
  const statsThisWeek = serverStats?.thisWeek ?? 0;
  const statsByLanguage = serverStats?.byLanguage ?? {};

  return (
    <div className={styles.dashboard}>
      <header className={styles.topbar}>
        <img  src={'/images/site-logo.png'}/>
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
          <div className={styles.chipsGroup}>
            <span className={styles.lbl}>Variant</span>
            <div className={styles.chips}>
              <button className={cx(styles.pill, variantFilter === 'all' && styles.active)} onClick={() => { setVariantFilter('all'); setPage(1); }}>All</button>
              <button className={cx(styles.pill, variantFilter === 'A' && styles.active)} onClick={() => { setVariantFilter('A'); setPage(1); }}>A</button>
              <button className={cx(styles.pill, variantFilter === 'B' && styles.active)} onClick={() => { setVariantFilter('B'); setPage(1); }}>B</button>
            </div>
          </div>
        </section>

        <section className={styles.kpis}>
          <div className={styles.kpi}>
            <div className={styles.kpiLabel}>{s.totalLeads}</div>
            <div className={styles.kpiValue}>{statsTotal}</div>
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
            <div className={styles.kpiValue}>{wonCount}</div>
            <div className={styles.kpiSub}>{pct(wonCount, total)}</div>
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
            <h2 className={styles.cardTitle}>{lang === 'nl' ? 'Omzet uit deals' : 'Revenue from deals'}</h2>
            <div className={styles.revBig}>{eur(revenue, lang)}</div>
            <div className={styles.revSub}>{wonCount} {lang === 'nl' ? 'deals · gemiddeld' : 'deals · avg'} {eur(avgDeal, lang)}</div>
            <div className={styles.revSplit}>
              <div className={styles.revItem}>
                <div className={styles.revItemVal}>{eur(avgDeal, lang)}</div>
                <div className={styles.revItemLbl}>{lang === 'nl' ? 'Gem. dealwaarde' : 'Avg. deal value'}</div>
              </div>
              <div className={styles.revItem}>
                <div className={styles.revItemVal}>{wonCount}</div>
                <div className={styles.revItemLbl}>{lang === 'nl' ? 'Deals gewonnen' : 'Deals won'}</div>
              </div>
              <div className={styles.revItem}>
                <div className={styles.revItemVal}>{conv}%</div>
                <div className={styles.revItemLbl}>{lang === 'nl' ? 'Lead naar deal' : 'Lead to deal'}</div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card} style={{ marginBottom: 18 }}>
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
                  {statsTotal}
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
          <div className={styles.tableWrap} style={{ position: 'relative' }}>
            {loading && !initialLoadRef.current && <div className={styles.tableLoading} />}
            <table>
              <thead>
                <tr>
                  <th>{s.nameCol}</th>
                  <th>{s.phoneCol}</th>
                  <th>{s.langCol}</th>
                  <th>{s.bedroomsCol}</th>
                  <th>{s.budgetCol}</th>
                  <th>{s.statusCol}</th>
                  <th>{lang === 'nl' ? 'Bedrag' : 'Amount'}</th>
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
                        <td>
                          <b>{d.name}</b>
                          {d.secondTenantName && <div className={styles.secondLine}>+ {d.secondTenantName}</div>}
                        </td>
                        <td className={styles.muted}>
                          {d.phone}
                          {d.secondTenantPhone && <div className={styles.secondLine}>{d.secondTenantPhone}</div>}
                        </td>
                        <td>{(d.language || '').toUpperCase()}</td>
                        <td>{bedroomsText(d)}</td>
                        <td className={styles.muted}>
                          {(() => {
                            const items = budgetItems(d, lang);
                            if (items.length <= 1) return items[0] || '';
                            return items.map((b, i) => (
                              <span key={i}>{i > 0 && <br />}{b}</span>
                            ));
                          })()}
                        </td>
                        <td>
                          <div className={styles.badgeStack}>
                            <span className={cx(styles.badge, sm.badge)}>{lang === 'nl' ? sm.labelNl : sm.labelEn}</span>
                            {d.variant && d.variant !== 'A' && (
                              <span className={styles.variantBadge}>{d.variant}</span>
                            )}
                          </div>
                        </td>
                        <td className={styles.amt}>{d.amount ? eur(d.amount, lang) : <span className={styles.muted}>—</span>}</td>
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
                          <td colSpan={10} className={styles.expandedRow}>
                            <div className={styles.utmGrid}>
                              {utmFields(d).map(({ label, value }) => (
                                <div key={label} className={styles.utmItem}>
                                  <span className={styles.utmLabel}>{label}</span>
                                  <span className={styles.utmValue}>{value || s.dash}</span>
                                </div>
                              ))}
                            </div>
                            <StageEditor lead={d} lang={lang} onUpdate={fetchLeads} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className={styles.muted} style={{ textAlign: 'center', padding: 24 }}>
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