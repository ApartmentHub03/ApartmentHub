'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut, Menu, X } from 'lucide-react';
import { toast } from 'sonner';
import styles from './crm.module.css';
import type {
    Me, ViewState, TabId, BusinessLine,
    Apartment, Candidate, CrmAgent, Bookings, TeamMember,
    ListsResponse, TeamResponse, WonDeal, CrmUserOption, RealEstateAgent,
} from './types';
import {
    DashboardView, ApartmentsView, ApartmentRecordView, CreateApartmentView,
    DealsView, CandidatesView, MarketingView, SeoView, AgentsView,
    CollaborationsView, TeamView, DevToolsView, ApplicationDetailView, BusinessPlaceholder,
} from './views';
import {
    MeetingLinksModal, SendSegmentModal, RescheduleModal, DealModal, EditInvoiceModal,
    type ModalState,
} from './modals';

const CITIES = ['Amsterdam · 06 5897 5449', 'Utrecht · 06 2372 0769'];

// --- URL hash ↔ ViewState sync (Bug 3: reload returns to dashboard) ---
function parseHash(hash: string): ViewState {
    const h = hash.replace(/^#/, '');
    if (!h) return { tab: 'dashboard' };
    const parts = h.split('/');
    if (parts[0] === 'create') return { tab: 'create' };
    const validTabs: TabId[] = ['dashboard', 'apartments', 'deals', 'candidates', 'leads', 'seo', 'agents', 'collab', 'team', 'devtools'];
    if (parts[0] === 'apartments' && parts[1]) {
        const aptId = parts[1];
        if (parts[2] === 'application' && parts[3]) {
            const fromParam = new URLSearchParams(h.split('?')[1] || '').get('from');
            const from = (['scheduled', 'canceled', 'making', 'offersin', 'offersout'] as const).includes(fromParam as any)
                ? (fromParam as ViewState['applicationFrom']) : undefined;
            return { tab: 'apartments', apartmentId: aptId, applicationId: parts[3], applicationFrom: from };
        }
        return { tab: 'apartments', apartmentId: aptId };
    }
    if (validTabs.includes(parts[0] as TabId)) return { tab: parts[0] as TabId };
    return { tab: 'dashboard' };
}

function viewToHash(v: ViewState): string {
    if (v.tab === 'create') return 'create';
    if (v.apartmentId) {
        if (v.applicationId) {
            const qs = v.applicationFrom ? `?from=${v.applicationFrom}` : '';
            return `apartments/${v.apartmentId}/application/${v.applicationId}${qs}`;
        }
        return `apartments/${v.apartmentId}`;
    }
    return v.tab;
}

const TABS: { id: TabId; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'apartments', label: 'Apartments' },
    { id: 'deals', label: 'Deals this month' },
    { id: 'candidates', label: 'Candidates' },
    { id: 'leads', label: 'Marketing' },
    { id: 'seo', label: 'SEO' },
    { id: 'agents', label: 'Agents' },
    { id: 'collab', label: 'Collaborations' },
    { id: 'team', label: 'Team' },
    { id: 'devtools', label: 'Dev Tools' },
];

// --- Auth helpers (inline, matching crm-admin/page.jsx) ---
function authHeaders(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const token = sessionStorage.getItem('crm_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function storeSession(data: { token: string; refreshToken?: string; role?: string; name?: string; permissions?: Record<string, boolean> }) {
    sessionStorage.setItem('crm_token', data.token);
    if (data.refreshToken) sessionStorage.setItem('crm_refresh', data.refreshToken);
    sessionStorage.setItem('crm_role', data.role || '');
    sessionStorage.setItem('crm_name', data.name || '');
    sessionStorage.setItem('crm_permissions', JSON.stringify(data.permissions || {}));
}

function readPermissions(): Record<string, boolean> {
    try {
        return JSON.parse(sessionStorage.getItem('crm_permissions') || '{}') || {};
    } catch {
        return {};
    }
}

let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
        const refreshToken = sessionStorage.getItem('crm_refresh');
        if (!refreshToken) return false;
        try {
            const res = await fetch('/api/admin/crm/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok || !data.success) return false;
            storeSession(data);
            return true;
        } catch {
            return false;
        }
    })().finally(() => { refreshInFlight = null; });
    return refreshInFlight;
}

async function api(path: string, opts: RequestInit = {}): Promise<Response> {
    const send = () => fetch(path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
    });
    const res = await send();
    if (res.status !== 401) return res;
    const refreshed = await refreshSession();
    return refreshed ? send() : res;
}

// --- Page ---
export default function CrmAdmin2Page() {
    const [authed, setAuthed] = useState(false);
    const [ready, setReady] = useState(false);
    const [me, setMe] = useState<Me>({ role: '', name: '', permissions: {} });

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (sessionStorage.getItem('crm_token')) {
            setMe({
                role: sessionStorage.getItem('crm_role') || '',
                name: sessionStorage.getItem('crm_name') || '',
                permissions: readPermissions(),
            });
            setAuthed(true);
        }
        setReady(true);
    }, []);

    const onLogin = (data: { token: string; refreshToken?: string; role?: string; name?: string; permissions?: Record<string, boolean> }) => {
        storeSession(data);
        setMe({ role: data.role || '', name: data.name || '', permissions: data.permissions || {} });
        setAuthed(true);
    };

    const onLogout = useCallback((expired = false) => {
        ['crm_token', 'crm_refresh', 'crm_role', 'crm_name', 'crm_permissions'].forEach((k) => sessionStorage.removeItem(k));
        setAuthed(false);
        setMe({ role: '', name: '', permissions: {} });
        if (expired) toast.error('Your session expired — please sign in again.');
    }, []);

    if (!ready) return <div className={styles.crm} />;
    if (!authed) return <LoginOverlay onLogin={onLogin} />;
    return <CrmApp me={me} onLogout={onLogout} />;
}

// --- Login ---
function LoginOverlay({ onLogin }: { onLogin: (data: { token: string; refreshToken?: string; role?: string; name?: string; permissions?: Record<string, boolean> }) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (res.ok && data.success) onLogin(data);
            else setError(data.message || 'Invalid credentials');
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.login}>
            <form className={styles.loginCard} onSubmit={submit}>
                <div className={styles.brandDot}>A</div>
                <h1>ApartmentHub CRM</h1>
                <p>Team login · per-user access</p>
                <label>Email</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@apartmenthub.nl" autoComplete="email" />
                <label>Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
                {error && <p className={styles.loginError}>{error}</p>}
                <button className={styles.loginBtn} type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
            </form>
        </div>
    );
}

// --- Main app shell ---
function CrmApp({ me, onLogout }: { me: Me; onLogout: (expired?: boolean) => void }) {
    const [view, setView] = useState<ViewState>(() => parseHash(typeof window !== 'undefined' ? window.location.hash : ''));
    const [city, setCity] = useState(CITIES[0]);
    const [biz, setBiz] = useState<BusinessLine>('aanhuur');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [modal, setModal] = useState<ModalState | null>(null);
    const [toastMsg, setToastMsg] = useState('');
    const toastTimer = useMemo(() => ({ current: null as ReturnType<typeof setTimeout> | null }), []);
    const [reloadSignal, setReloadSignal] = useState(0);
    const bumpReload = useCallback(() => setReloadSignal((s) => s + 1), []);

    // Data
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState<{ apartments: Apartment[]; candidates: Candidate[]; agents: CrmAgent[]; realEstateAgents: RealEstateAgent[]; bookings: Bookings; wonDeals: WonDeal[]; crmUsers: CrmUserOption[] }>({
        apartments: [], candidates: [], agents: [], realEstateAgents: [], bookings: { current: [], cancelled: [], rescheduled: [] }, wonDeals: [], crmUsers: [],
    });
    const [team, setTeam] = useState<TeamMember[]>([]);
    const [teamLoading, setTeamLoading] = useState(true);

    const isAdmin = me.role === 'admin' || me.role === 'super_admin';

    const can = useCallback((key: string) => {
        if (isAdmin) return true;
        return me.permissions?.[key] !== false;
    }, [isAdmin, me.permissions]);

    const handleAuthFail = useCallback((res: Response) => {
        if (res.status === 401) { onLogout(true); return true; }
        return false;
    }, [onLogout]);

    const showToast = useCallback((msg: string) => {
        setToastMsg(msg);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMsg(''), 2400);
    }, [toastTimer]);

    const loadLists = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api('/api/admin/crm/lists');
            if (handleAuthFail(res)) return;
            const data: ListsResponse = await res.json();
            if (data.success) {
                setLists({
                    apartments: data.apartments || [],
                    candidates: data.candidates || [],
                    agents: data.agents || [],
                    realEstateAgents: data.real_estate_agents || [],
                    bookings: data.bookings || { current: [], cancelled: [], rescheduled: [] },
                    wonDeals: data.won_deals || [],
                    crmUsers: data.crm_users || [],
                });
            } else toast.error(data.message || 'Failed to load CRM data');
        } catch { toast.error('Failed to load CRM data'); }
        finally { setLoading(false); }
    }, [handleAuthFail]);

    const loadTeam = useCallback(async () => {
        setTeamLoading(true);
        try {
            const res = await api('/api/admin/crm/team');
            if (handleAuthFail(res)) return;
            const data: TeamResponse = await res.json();
            if (data.success) setTeam(data.members || []);
            else toast.error(data.message || 'Failed to load the team');
        } catch { toast.error('Failed to load the team'); }
        finally { setTeamLoading(false); }
    }, [handleAuthFail]);

    useEffect(() => {
        loadLists();
        if (isAdmin) loadTeam();
    }, [loadLists, loadTeam, isAdmin]);

    // Reload lists when a modal action completes (deal confirmed, links generated, invoice sent)
    useEffect(() => {
        if (reloadSignal > 0) loadLists();
    }, [reloadSignal, loadLists]);

    const tabs = useMemo(() => {
        return TABS.filter((t) => {
            if (t.id === 'team' && !isAdmin) return false;
            if (t.id === 'collab' && !isAdmin) return false;
            if (t.id === 'devtools' && !isAdmin) return false;
            return true;
        });
    }, [isAdmin]);

    const navigate = useCallback((v: Partial<ViewState>) => {
        setView((prev) => {
            const next = { ...prev, ...v, apartmentId: undefined, applicationId: undefined, applicationFrom: undefined, ...v };
            if (typeof window !== 'undefined') window.history.pushState(null, '', `#${viewToHash(next)}`);
            return next;
        });
        window.scrollTo(0, 0);
    }, []);

    const openRecord = useCallback((aptId: string) => {
        setView((prev) => {
            const next = { ...prev, apartmentId: aptId };
            if (typeof window !== 'undefined') window.history.pushState(null, '', `#${viewToHash(next)}`);
            return next;
        });
        window.scrollTo(0, 0);
    }, []);

    const openApplication = useCallback((accountId: string, name: string, from: 'scheduled' | 'canceled' | 'making' | 'offersin' | 'offersout') => {
        setView((prev) => {
            const next = { ...prev, applicationId: accountId, applicationName: name, applicationFrom: from };
            if (typeof window !== 'undefined') window.history.pushState(null, '', `#${viewToHash(next)}`);
            return next;
        });
        window.scrollTo(0, 0);
    }, []);

    const backToApartments = useCallback(() => {
        setView((prev) => {
            const next = { ...prev, apartmentId: undefined, applicationId: undefined, applicationFrom: undefined };
            if (typeof window !== 'undefined') window.history.pushState(null, '', `#${viewToHash(next)}`);
            return next;
        });
        window.scrollTo(0, 0);
    }, []);

    const backToRecord = useCallback(() => {
        setView((prev) => {
            const next = { ...prev, applicationId: undefined, applicationFrom: undefined };
            if (typeof window !== 'undefined') window.history.pushState(null, '', `#${viewToHash(next)}`);
            return next;
        });
        window.scrollTo(0, 0);
    }, []);

    // Restore view on browser back/forward
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onPopState = () => setView(parseHash(window.location.hash));
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const renderContent = () => {
        if (biz !== 'aanhuur') {
            return <BusinessPlaceholder biz={biz} onBack={() => setBiz('aanhuur')} />;
        }

        if (view.apartmentId && view.applicationId) {
            return <ApplicationDetailView
                name={view.applicationName || view.applicationId}
                accountId={view.applicationId}
                apartmentId={view.apartmentId}
                from={view.applicationFrom || 'offersin'}
                onBack={backToRecord}
                onToast={showToast}
                onModal={setModal}
            />;
        }

        if (view.apartmentId) {
            // Build phone→accountId lookup from candidates for scheduled row clicks
            const phoneToAccountId = new Map<string, string>();
            for (const c of lists.candidates) {
                if (c.whatsapp_number) {
                    const digits = String(c.whatsapp_number).replace(/\D/g, '');
                    if (digits.length >= 9) phoneToAccountId.set(digits.slice(-9), c.id);
                }
            }
            return <ApartmentRecordView
                aptId={view.apartmentId}
                onBack={backToApartments}
                onOpenApplication={openApplication}
                onToast={showToast}
                onModal={setModal}
                isAdmin={isAdmin}
                phoneToAccountId={phoneToAccountId}
                reloadSignal={reloadSignal}
            />;
        }

        if (view.tab === 'create') {
            return <CreateApartmentView onBack={() => navigate({ tab: 'apartments' })} onToast={showToast} onCreated={(newId) => { loadLists(); openRecord(newId); }} realEstateAgents={lists.realEstateAgents} crmUsers={lists.crmUsers} />;
        }

        switch (view.tab) {
            case 'dashboard':
                return <DashboardView me={me} lists={lists} loading={loading} />;
            case 'apartments':
                return <ApartmentsView apartments={lists.apartments} loading={loading} onOpenRecord={openRecord} onCreate={() => navigate({ tab: 'create' })} />;
            case 'deals':
                return <DealsView wonDeals={lists.wonDeals} onToast={showToast} onModal={setModal} onSaved={bumpReload} />;
            case 'candidates':
                return <CandidatesView candidates={lists.candidates} />;
            case 'leads':
                return <MarketingView />;
            case 'seo':
                return <SeoView />;
            case 'agents':
                return <AgentsView agents={lists.agents} />;
            case 'collab':
                return <CollaborationsView agents={lists.realEstateAgents} onToast={showToast} onSaved={loadLists} isAdmin={isAdmin} />;
            case 'team':
                return <TeamView team={team} loading={teamLoading} isAdmin={isAdmin} onToast={showToast} onAdded={loadTeam} />;
            case 'devtools':
                return <DevToolsView onToast={showToast} onSaved={loadLists} />;
            default:
                return <DashboardView me={me} lists={lists} loading={loading} />;
        }
    };

    const activeTabId: TabId = (view.apartmentId || view.tab === 'create') ? 'apartments' : view.tab;

    return (
        <div className={styles.crm}>
            {/* Topbar */}
            <div className={styles.topbar}>
                <button className={styles.hamb} onClick={() => setDrawerOpen(true)} title="Business lines">
                    <Menu size={20} />
                </button>
                <div className={styles.logo}>
                    <div className={styles.brandDotSm}>A</div>
                    ApartmentHub CRM
                </div>
                <div className={styles.topRight}>
                    <select className={styles.city} value={city} onChange={(e) => setCity(e.target.value)}>
                        {CITIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <div className={styles.avatar}>{(me.name || 'A').slice(0, 1).toUpperCase()}</div>
                    <button className={styles.logout} onClick={() => onLogout()}>
                        <LogOut size={15} /> Logout
                    </button>
                </div>
            </div>

            {/* Business drawer */}
            {drawerOpen && (
                <div className={styles.bizDrawerOverlay}>
                    <div className={styles.bizDrawerBackdrop} onClick={() => setDrawerOpen(false)} />
                    <div className={styles.bizDrawer}>
                        <div className={styles.bizDrawerHeader}>
                            <div className={styles.brandDotSm}>A</div>
                            ApartmentHub
                        </div>
                        <div className={styles.bizDrawerLabel}>Business lines</div>
                        <button className={`${styles.bizItem} ${biz === 'aanhuur' ? styles.bizItemActive : ''}`} onClick={() => { setBiz('aanhuur'); setDrawerOpen(false); navigate({ tab: 'dashboard' }); }}>
                            Rentals (tenant)
                            <span className={styles.bizItemTag}>this CRM</span>
                        </button>
                        <button className={`${styles.bizItem} ${biz === 'verhuur' ? styles.bizItemActive : ''}`} onClick={() => { setBiz('verhuur'); setDrawerOpen(false); }}>
                            Letting (landlord)
                        </button>
                        <button className={`${styles.bizItem} ${biz === 'aankoop' ? styles.bizItemActive : ''}`} onClick={() => { setBiz('aankoop'); setDrawerOpen(false); }}>
                            Buying
                        </button>
                        <button className={`${styles.bizItem} ${biz === 'verkoop' ? styles.bizItemActive : ''}`} onClick={() => { setBiz('verkoop'); setDrawerOpen(false); }}>
                            Selling
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            {biz === 'aanhuur' && (
                <div className={styles.tabs}>
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            className={`${styles.tab} ${activeTabId === t.id ? styles.tabActive : ''}`}
                            onClick={() => navigate({ tab: t.id })}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className={styles.content}>
                {renderContent()}
            </div>

            {/* Modals */}
            {modal && renderModal(modal, setModal, showToast, lists.crmUsers, bumpReload)}

            {/* Toast */}
            {toastMsg && (
                <div className={`${styles.toast} ${styles.toastShow}`}>{toastMsg}</div>
            )}
        </div>
    );
}

function renderModal(modal: ModalState, setModal: (m: ModalState | null) => void, showToast: (msg: string) => void, crmUsers: CrmUserOption[], onSaved?: () => void) {
    const close = () => setModal(null);
    switch (modal.type) {
        case 'meetingLinks':
            return <MeetingLinksModal aptId={modal.aptId} onClose={close} onToast={showToast} onSaved={onSaved} />;
        case 'sendSegment':
            return <SendSegmentModal aptId={modal.aptId} rentalPrice={modal.rentalPrice} bedrooms={modal.bedrooms} onClose={close} onToast={showToast} />;
        case 'reschedule':
            return <RescheduleModal onClose={close} onToast={showToast} />;
        case 'deal':
            return <DealModal aptId={modal.aptId} accountId={modal.accountId} rentPrice={modal.rentPrice} crmUsers={crmUsers} onClose={close} onToast={showToast} onSaved={onSaved} />;
        case 'editInvoice':
            return <EditInvoiceModal invoiceId={modal.invoiceId} onClose={close} onToast={showToast} onSaved={onSaved} />;
        default:
            return null;
    }
}