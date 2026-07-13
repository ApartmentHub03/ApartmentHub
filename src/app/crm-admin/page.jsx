'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { ZOKO_TEMPLATES } from '@/services/zokoTemplates';
import styles from './crm.module.css';

const CITIES = ['Amsterdam · 06 5897 5449', 'Utrecht · 06 2372 0769'];

// Verified templates the CRM can actually send, for the picker.
const SENDABLE = Object.entries(ZOKO_TEMPLATES)
    .filter(([, t]) => t.verified && t.zokoId)
    .map(([key, t]) => ({ key, label: t.label, stage: t.stage, variableCount: t.variableCount, vars: t.vars }));

const isDeal = (s) => !!s && /deal|won|closed/i.test(s);

function authHeaders() {
    if (typeof window === 'undefined') return {};
    const token = sessionStorage.getItem('crm_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function storeSession(data) {
    sessionStorage.setItem('crm_token', data.token);
    if (data.refreshToken) sessionStorage.setItem('crm_refresh', data.refreshToken);
    sessionStorage.setItem('crm_role', data.role || '');
    sessionStorage.setItem('crm_name', data.name || '');
    sessionStorage.setItem('crm_permissions', JSON.stringify(data.permissions || {}));
}

// Supabase access tokens last an hour. Swap the refresh token for a new one
// rather than dumping the user back at the login screen mid-task.
//
// Single-flight: the dashboard fires several requests at once, and the refresh
// token ROTATES on use — parallel refreshes would spend it more than once and
// invalidate the session we are trying to save.
let refreshInFlight = null;

function refreshSession() {
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

async function api(path, opts = {}) {
    const send = () => fetch(path, {
        ...opts,
        headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
    });

    const res = await send();
    if (res.status !== 401) return res;

    // Expired token: refresh once, then replay the request.
    const refreshed = await refreshSession();
    return refreshed ? send() : res;
}

// File uploads: same refresh-and-replay, but the browser must set its own
// multipart Content-Type (with the boundary), so we can't go through api().
async function apiUpload(path, formData) {
    const send = () => fetch(path, { method: 'POST', headers: authHeaders(), body: formData });

    const res = await send();
    if (res.status !== 401) return res;

    const refreshed = await refreshSession();
    return refreshed ? send() : res;
}

function StatusPill({ status }) {
    const map = { Active: styles.pillGreen, CreateLink: styles.pillAmber, Closed: styles.pillGrey, Null: styles.pillGrey };
    return <span className={`${styles.pill} ${map[status] || styles.pillGrey}`}>{status || '—'}</span>;
}

function readPermissions() {
    try {
        return JSON.parse(sessionStorage.getItem('crm_permissions') || '{}') || {};
    } catch {
        return {};
    }
}

export default function CrmPage() {
    const [authed, setAuthed] = useState(false);
    const [ready, setReady] = useState(false);
    const [me, setMe] = useState({ role: '', name: '', permissions: {} });

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

    const onLogin = (data) => {
        storeSession(data);
        setMe({ role: data.role || '', name: data.name || '', permissions: data.permissions || {} });
        setAuthed(true);
    };

    // `expired` distinguishes a session we couldn't refresh from the user
    // clicking Log out — otherwise being ejected looks like an unexplained crash.
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

function LoginOverlay({ onLogin }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
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

function CrmApp({ me, onLogout }) {
    const [tab, setTab] = useState('dashboard');
    const [city, setCity] = useState(CITIES[0]);
    const [loading, setLoading] = useState(true);
    const [lists, setLists] = useState({ apartments: [], candidates: [], agents: [], bookings: { current: [], cancelled: [], rescheduled: [] } });
    const [applications, setApplications] = useState([]);
    const [appsLoading, setAppsLoading] = useState(true);
    const [team, setTeam] = useState([]);
    const [teamLoading, setTeamLoading] = useState(true);
    const [sendCtx, setSendCtx] = useState(null);
    const [aptId, setAptId] = useState(null);
    const [appId, setAppId] = useState(null);
    const [dealAcct, setDealAcct] = useState(null);
    const [newApt, setNewApt] = useState(false);

    const isAdmin = me.role === 'admin' || me.role === 'super_admin';

    // The same permissions the server enforces (requirePermission). Gating the
    // tabs here keeps the UI honest — it is not the security boundary. An admin
    // holds every permission.
    const can = useCallback((key) => {
        if (isAdmin) return true;
        return me.permissions?.[key] !== false;
    }, [isAdmin, me.permissions]);

    const tabs = useMemo(() => [
        { id: 'dashboard', label: 'Dashboard' },
        ...(can('apartments') ? [{ id: 'apartments', label: 'Apartments' }] : []),
        ...(can('candidates') ? [
            { id: 'bookings', label: 'Bookings' },
            { id: 'candidates', label: 'Candidates' },
            { id: 'applications', label: 'Applications' },
        ] : []),
        { id: 'agents', label: 'Agents' },
        ...(can('offers') ? [{ id: 'deals', label: 'Deals' }] : []),
        ...(isAdmin ? [{ id: 'team', label: 'Team' }] : []),
    ], [can, isAdmin]);

    // A 401 means the session is gone and the refresh in api() already failed,
    // so sign out. A 403 ("admin only", "no access to apartments") must not sign
    // anyone out — it flows through to the caller and is shown as a message.
    const handleAuthFail = useCallback((res) => {
        if (res.status === 401) { onLogout(true); return true; }
        return false;
    }, [onLogout]);

    const loadLists = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api('/api/admin/crm/lists');
            if (handleAuthFail(res)) return;
            const data = await res.json();
            if (data.success) {
                setLists({
                    apartments: data.apartments || [], candidates: data.candidates || [], agents: data.agents || [],
                    bookings: data.bookings || { current: [], cancelled: [], rescheduled: [] },
                });
            } else toast.error(data.message || 'Failed to load CRM data');
        } catch { toast.error('Failed to load CRM data'); }
        finally { setLoading(false); }
    }, [handleAuthFail]);

    // These used to swallow their errors, so a failed load rendered as an empty
    // table — "No applications yet" when the request had simply failed.
    const loadApplications = useCallback(async () => {
        setAppsLoading(true);
        try {
            const res = await api('/api/admin/crm/applications');
            if (handleAuthFail(res)) return;
            const data = await res.json();
            if (data.success) setApplications(data.applications || []);
            else toast.error(data.message || 'Failed to load applications');
        } catch { toast.error('Failed to load applications'); }
        finally { setAppsLoading(false); }
    }, [handleAuthFail]);

    const loadTeam = useCallback(async () => {
        setTeamLoading(true);
        try {
            const res = await api('/api/admin/crm/team');
            if (handleAuthFail(res)) return;
            const data = await res.json();
            if (data.success) setTeam(data.members || []);
            else toast.error(data.message || 'Failed to load the team');
        } catch { toast.error('Failed to load the team'); }
        finally { setTeamLoading(false); }
    }, [handleAuthFail]);

    useEffect(() => {
        loadLists();
        loadApplications();
        // The team roster is admin-only on the server now, so only admins ask
        // for it — a non-admin would just collect a 403 toast on every load.
        if (isAdmin) loadTeam();
    }, [loadLists, loadApplications, loadTeam, isAdmin]);

    // Don't strand someone on a tab their permissions no longer allow.
    useEffect(() => {
        if (!tabs.some((t) => t.id === tab)) setTab('dashboard');
    }, [tabs, tab]);

    const deals = lists.candidates.filter((c) => isDeal(c.status));

    return (
        <div className={styles.crm}>
            <div className={styles.topbar}>
                <div className={styles.logo}><div className={styles.brandDot}>A</div> ApartmentHub CRM</div>
                <div className={styles.topRight}>
                    <select className={styles.city} value={city} onChange={(e) => setCity(e.target.value)}>
                        {CITIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <div className={styles.avatar}>{(me.name || 'A').slice(0, 1).toUpperCase()}</div>
                    {/* Wrapped: passing onLogout directly hands it the click event, which
                        would read as `expired` and claim the session died. */}
                    <button className={styles.logout} onClick={() => onLogout()}><LogOut size={15} /> Logout</button>
                </div>
            </div>

            <div className={styles.tabs}>
                {tabs.map((t) => (
                    <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
            </div>

            <div className={styles.content}>
                {tab === 'dashboard' && <DashboardTab lists={lists} applications={applications} team={team} deals={deals} loading={loading || appsLoading} city={city} showTeam={isAdmin} />}
                {tab === 'apartments' && <ApartmentsTab rows={lists.apartments} loading={loading} onOpen={setAptId} onNew={() => setNewApt(true)} />}
                {tab === 'bookings' && <BookingsTab bookings={lists.bookings} loading={loading} onSend={setSendCtx} onAction={loadLists} handleAuthFail={handleAuthFail} />}
                {tab === 'candidates' && <CandidatesTab rows={lists.candidates} loading={loading} onSend={setSendCtx} />}
                {tab === 'applications' && <ApplicationsTab rows={applications} loading={appsLoading} onOpen={setAppId} />}
                {tab === 'agents' && <AgentsTab rows={lists.agents} loading={loading} reload={loadLists} handleAuthFail={handleAuthFail} />}
                {tab === 'deals' && <DealsTab rows={deals} loading={loading} onSend={setSendCtx} onOpen={setDealAcct} />}
                {tab === 'team' && isAdmin && <TeamTab team={team} loading={teamLoading} reload={loadTeam} handleAuthFail={handleAuthFail} />}
            </div>

            {sendCtx && <SendTemplateModal ctx={sendCtx} onClose={() => setSendCtx(null)} onAuthFail={handleAuthFail} />}
            {aptId && <ApartmentDrawer id={aptId} bookings={lists.bookings} onClose={() => setAptId(null)} onAuthFail={handleAuthFail} onSend={setSendCtx} reload={loadLists} />}
            {appId && <ApplicationDrawer id={appId} onClose={() => setAppId(null)} onAuthFail={handleAuthFail} onSend={setSendCtx} />}
            {newApt && <ApartmentForm onClose={() => setNewApt(false)} onSaved={() => { setNewApt(false); loadLists(); }} handleAuthFail={handleAuthFail} />}
            {dealAcct && <DealDrawer account={dealAcct} onClose={() => setDealAcct(null)} onAuthFail={handleAuthFail} onSend={setSendCtx} />}
        </div>
    );
}

function DashboardTab({ lists, applications, team, deals, loading, city, showTeam }) {
    const activeApts = lists.apartments.filter((a) => a.status === 'Active').length;
    const kpis = [
        { val: lists.apartments.length, label: 'Apartments' },
        { val: activeApts, label: 'Active listings' },
        { val: lists.bookings.current.length, label: 'Viewings booked' },
        { val: lists.candidates.length, label: 'Candidates' },
        { val: applications.length, label: 'Applications' },
        { val: deals.length, label: 'Deals' },
        // Only admins load the roster, so only they get a meaningful count.
        ...(showTeam ? [{ val: team.length, label: 'Team' }] : []),
    ];
    return (
        <>
            <h2 className={styles.page}>Dashboard</h2>
            <p className={styles.sub}>{city.split(' · ')[0]} · full company overview.</p>
            <div className={styles.kpis}>
                {kpis.map((k) => (
                    <div className={styles.kpi} key={k.label}>
                        <div className={styles.kpiVal}>{loading ? '—' : k.val}</div>
                        <div className={styles.kpiLabel}>{k.label}</div>
                    </div>
                ))}
            </div>
        </>
    );
}

function ApartmentsTab({ rows, loading, onOpen, onNew }) {
    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                    <h2 className={styles.page}>Apartments</h2>
                    <p className={styles.sub}>Listings from the live <code>apartments</code> table — click a row for details.</p>
                </div>
                <button className={styles.btn} onClick={onNew}>+ New apartment</button>
            </div>
            <Table loading={loading} rows={rows} empty="No apartments yet."
                head={['Address', 'Area', 'Price', 'Beds', 'm²', 'Status']}
                render={(a) => (
                    <tr key={a.id} className={styles.linkRow} onClick={() => onOpen(a.id)}>
                        <td><b>{a['Full Address'] || a.street || '—'}</b></td>
                        <td>{a.area || '—'}</td>
                        <td>{a.rental_price != null ? `€ ${a.rental_price}` : '—'}</td>
                        <td>{a.bedrooms || '—'}</td>
                        <td>{a.square_meters || '—'}</td>
                        <td><StatusPill status={a.status} /></td>
                    </tr>
                )} />
        </>
    );
}

function BookingsTab({ bookings, loading, onSend, onAction, handleAuthFail }) {
    const [sub, setSub] = useState('current');
    const [busy, setBusy] = useState(null);
    const subs = [
        { id: 'current', label: 'Viewing Scheduled', cls: styles.pillGrey },
        { id: 'cancelled', label: 'Cancelled', cls: styles.pillRed },
        { id: 'rescheduled', label: 'Rescheduled', cls: styles.pillAmber },
    ];
    const rows = bookings[sub] || [];

    const act = async (action, b, i) => {
        setBusy(`${action}-${i}`);
        try {
            const res = await api('/api/admin/crm/booking-action', {
                method: 'POST',
                body: JSON.stringify({ action, apartmentId: b.apartmentId, phone: b.whatsapp, name: b.name }),
            });
            if (handleAuthFail(res)) return;
            const data = await res.json();
            if (data.success) {
                const wa = data.whatsapp?.sent ? ' · WhatsApp sent' : ' · WhatsApp pending template ID';
                toast.success(`${action === 'cancel' ? 'Cancelled' : 'Moved to reschedule'}${wa}`);
                onAction();
            } else toast.error(data.message || 'Action failed');
        } catch { toast.error('Action failed'); }
        finally { setBusy(null); }
    };

    return (
        <>
            <h2 className={styles.page}>Bookings</h2>
            <p className={styles.sub}>Viewings matched to candidates by phone number, pulled from the apartment records.</p>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {subs.map((s) => (
                    <button key={s.id} className={`${styles.btn} ${sub === s.id ? '' : styles.btnGhost}`} onClick={() => setSub(s.id)}>
                        {s.label} <span className={`${styles.pill} ${s.cls}`} style={{ marginLeft: 4 }}>{(bookings[s.id] || []).length}</span>
                    </button>
                ))}
            </div>
            <Table loading={loading} rows={rows} empty="Nothing here."
                head={['Candidate', 'Phone', 'Apartment', sub === 'rescheduled' ? 'New link' : 'When', 'Actions']}
                render={(b, i) => (
                    <tr key={`${b.apartmentId}-${i}`}>
                        <td><b>{b.name}</b></td>
                        <td>{b.whatsapp || '—'}</td>
                        <td>{b.apartment}</td>
                        <td>
                            {sub === 'rescheduled' && b.eventUrl
                                ? <a href={b.eventUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)' }}>Open link</a>
                                : (b.when ? new Date(b.when).toLocaleDateString() : '—')}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {b.whatsapp && <button className={styles.rowBtn} onClick={() => onSend({ name: b.name, phone: b.whatsapp, apartment: b.apartment })}>Send</button>}
                            {sub === 'current' && (
                                <>
                                    <button className={`${styles.rowBtn} ${styles.btnGhost}`} style={{ marginLeft: 6 }} disabled={busy} onClick={() => act('reschedule', b, i)}>Reschedule</button>
                                    <button className={styles.rowBtn} style={{ marginLeft: 6, background: 'var(--red)' }} disabled={busy} onClick={() => act('cancel', b, i)}>Cancel</button>
                                </>
                            )}
                        </td>
                    </tr>
                )} />
        </>
    );
}

function CandidatesTab({ rows, loading, onSend }) {
    return (
        <>
            <h2 className={styles.page}>Candidates</h2>
            <p className={styles.sub}>Accounts created from WhatsApp — matched by phone number.</p>
            <Table loading={loading} rows={rows} empty="No candidates yet."
                head={['Name', 'Phone', 'Preferred location', 'Move-in', 'Status', '']}
                render={(c) => (
                    <tr key={c.id}>
                        <td><b>{c.tenant_name || '—'}</b></td>
                        <td>{c.whatsapp_number || '—'}</td>
                        <td>{c.preferred_location || '—'}</td>
                        <td>{c.move_in_date || '—'}</td>
                        <td>{c.status ? <span className={`${styles.pill} ${styles.pillTeal}`}>{c.status}</span> : '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                            {c.whatsapp_number && <button className={styles.rowBtn} onClick={() => onSend({ name: c.tenant_name, phone: c.whatsapp_number })}>Send WhatsApp</button>}
                        </td>
                    </tr>
                )} />
        </>
    );
}

function ApplicationsTab({ rows, loading, onOpen }) {
    return (
        <>
            <h2 className={styles.page}>Applications</h2>
            <p className={styles.sub}>A mirror of the website <code>/aanvraag</code> form — tenant details, offer, and uploaded documents.</p>
            <Table loading={loading} rows={rows} empty="No applications yet."
                head={['Name', 'Phone', 'Work', 'Income', 'Docs', 'Co-tenants', 'Doc status']}
                render={(a) => (
                    <tr key={a.id} className={styles.linkRow} onClick={() => onOpen(a.id)}>
                        <td><b>{a.tenant_name || '—'}</b></td>
                        <td>{a.whatsapp_number || '—'}</td>
                        <td>{a.work_status || '—'}</td>
                        <td>{a.monthly_income != null ? `€ ${a.monthly_income}` : '—'}</td>
                        <td><span className={`${styles.pill} ${styles.pillTeal}`}>{a.docCount}</span></td>
                        <td>{a.coTenantCount || 0}</td>
                        <td>{a.documentation_status || '—'}</td>
                    </tr>
                )} />
        </>
    );
}

function AgentsTab({ rows, loading, reload, handleAuthFail }) {
    const [editing, setEditing] = useState(null); // 'new' | agent object

    const del = async (id) => {
        if (!confirm('Delete this agent?')) return;
        try {
            const res = await api(`/api/admin/crm/agents/${id}`, { method: 'DELETE' });
            if (handleAuthFail(res)) return;
            const data = await res.json();
            if (data.success) { toast.success('Agent deleted'); reload(); }
            else toast.error(data.message || 'Could not delete');
        } catch { toast.error('Could not delete the agent. Please try again.'); }
    };

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1 }}>
                    <h2 className={styles.page}>Agents</h2>
                    <p className={styles.sub}>Agents assigned to apartments and shown on offers.</p>
                </div>
                <button className={styles.btn} onClick={() => setEditing('new')}>+ New agent</button>
            </div>
            <Table loading={loading} rows={rows} empty="No agents yet."
                head={['Name', 'Phone', 'Email', '']}
                render={(a) => (
                    <tr key={a.id}>
                        <td><b>{a.name}</b></td>
                        <td>{a.whatsapp_number || '—'}</td>
                        <td>{a.email || '—'}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <button className={`${styles.rowBtn} ${styles.btnGhost}`} onClick={() => setEditing(a)}>Edit</button>
                            <button className={styles.rowBtn} style={{ marginLeft: 6, background: 'var(--red)' }} onClick={() => del(a.id)}>Delete</button>
                        </td>
                    </tr>
                )} />
            {editing && <AgentForm agent={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} handleAuthFail={handleAuthFail} />}
        </>
    );
}

function DealsTab({ rows, loading, onSend, onOpen }) {
    return (
        <>
            <h2 className={styles.page}>Deals</h2>
            <p className={styles.sub}>Won / in-progress deals — click a row for the contract &amp; invoicing phase.</p>
            <Table loading={loading} rows={rows} empty="No deals yet."
                head={['Name', 'Phone', 'Status', 'Contract start', 'Contract end', '']}
                render={(c) => (
                    <tr key={c.id} className={styles.linkRow} onClick={() => onOpen(c)}>
                        <td><b>{c.tenant_name || '—'}</b></td>
                        <td>{c.whatsapp_number || '—'}</td>
                        <td><span className={`${styles.pill} ${styles.pillGreen}`}>{c.status}</span></td>
                        <td>{c.contract_start_date || '—'}</td>
                        <td>{c.contract_end_date || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                            {c.whatsapp_number && <button className={styles.rowBtn} onClick={(e) => { e.stopPropagation(); onSend({ name: c.tenant_name, phone: c.whatsapp_number }); }}>Send</button>}
                        </td>
                    </tr>
                )} />
        </>
    );
}

function DealDrawer({ account, onClose, onAuthFail, onSend }) {
    const [invoices, setInvoices] = useState(null);
    const [form, setForm] = useState({ amount: '', description: '', due_date: '', invoice_number: '' });
    const [saving, setSaving] = useState(false);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

    const load = useCallback(async () => {
        try {
            const res = await api(`/api/admin/crm/invoices?account_id=${account.id}`);
            if (onAuthFail(res)) { setInvoices([]); return; }
            const data = await res.json();
            if (data.success) setInvoices(data.invoices || []);
            else { toast.error(data.message || 'Could not load invoices'); setInvoices([]); }
        } catch {
            // Without this, a network blip left `invoices` null and the card
            // spun on "Loading…" forever.
            toast.error('Could not load invoices');
            setInvoices([]);
        }
    }, [account.id, onAuthFail]);

    useEffect(() => { load(); }, [load]);

    const create = async () => {
        if (!form.amount) { toast.error('Amount is required'); return; }
        setSaving(true);
        try {
            const res = await api('/api/admin/crm/invoices', { method: 'POST', body: JSON.stringify({ ...form, account_id: account.id }) });
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success) { toast.success('Invoice created'); setForm({ amount: '', description: '', due_date: '', invoice_number: '' }); load(); }
            else toast.error(data.message || 'Could not create invoice');
        } catch { toast.error('Could not create invoice'); }
        finally { setSaving(false); }
    };

    const setStatus = async (inv, status) => {
        try {
            const res = await api(`/api/admin/crm/invoices/${inv.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success) load(); else toast.error(data.message || 'Could not update');
        } catch { toast.error('Could not update the invoice. Please try again.'); }
    };

    const statusCls = { draft: styles.pillGrey, sent: styles.pillAmber, paid: styles.pillGreen, cancelled: styles.pillRed };

    return (
        <div className={styles.drawerOverlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.drawerHead}>
                    <div className={styles.brandDot}>€</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{account.tenant_name || 'Deal'}</div>
                        <div className={styles.hint}>{account.status} · {account.whatsapp_number || ''}</div>
                    </div>
                    {account.whatsapp_number && <button className={styles.rowBtn} onClick={() => onSend({ name: account.tenant_name, phone: account.whatsapp_number })}>Send</button>}
                    <button className={styles.modalClose} style={{ marginLeft: 8 }} onClick={onClose}>×</button>
                </div>
                <div className={styles.drawerBody}>
                    <div className={styles.card}>
                        <div className={styles.cardHead}><h3>Contract</h3></div>
                        <div className={styles.cardBody}>
                            <dl className={styles.kv}>
                                <FieldRow k="Status" v={account.status} />
                                <FieldRow k="Contract start" v={account.contract_start_date || '—'} />
                                <FieldRow k="Contract end" v={account.contract_end_date || '—'} />
                            </dl>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHead}><h3>New invoice</h3></div>
                        <div className={styles.cardBody}>
                            <div className={styles.formRow}>
                                <div className={styles.field}><label>Amount (€)</label><input type="number" value={form.amount} onChange={set('amount')} placeholder="2600" /></div>
                                <div className={styles.field}><label>Invoice #</label><input value={form.invoice_number} onChange={set('invoice_number')} placeholder="2026-001" /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.field}><label>Due date</label><input type="date" value={form.due_date} onChange={set('due_date')} /></div>
                                <div className={styles.field}><label>Description</label><input value={form.description} onChange={set('description')} placeholder="Commission" /></div>
                            </div>
                            <button className={styles.btn} onClick={create} disabled={saving}>{saving ? 'Creating…' : 'Create invoice'}</button>
                            <div className={styles.hint} style={{ marginTop: 8 }}>PDF rendering activates once David&apos;s invoice template is in.</div>
                        </div>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.cardHead}><h3>Invoices</h3><span className={styles.hint}>{invoices?.length || 0}</span></div>
                        {invoices === null ? <div className={styles.loading}>Loading…</div>
                            : invoices.length === 0 ? <div className={styles.empty}>No invoices yet.</div>
                                : (
                                    <table className={styles.table}>
                                        <thead><tr><th>#</th><th>Amount</th><th>Status</th><th>Due</th><th></th></tr></thead>
                                        <tbody>
                                            {invoices.map((inv) => (
                                                <tr key={inv.id}>
                                                    <td>{inv.invoice_number || '—'}</td>
                                                    <td>{inv.amount != null ? `€ ${inv.amount}` : '—'}</td>
                                                    <td><span className={`${styles.pill} ${statusCls[inv.status] || styles.pillGrey}`}>{inv.status}</span></td>
                                                    <td>{inv.due_date || '—'}</td>
                                                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                        {inv.status !== 'sent' && <button className={`${styles.rowBtn} ${styles.btnGhost}`} onClick={() => setStatus(inv, 'sent')}>Mark sent</button>}
                                                        {inv.status !== 'paid' && <button className={styles.rowBtn} style={{ marginLeft: 6 }} onClick={() => setStatus(inv, 'paid')}>Mark paid</button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Table({ loading, rows, empty, head, render }) {
    return (
        <div className={styles.card}>
            {loading ? <div className={styles.loading}>Loading…</div>
                : rows.length === 0 ? <div className={styles.empty}>{empty}</div>
                    : (
                        <table className={styles.table}>
                            <thead><tr>{head.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>
                            <tbody>{rows.map(render)}</tbody>
                        </table>
                    )}
        </div>
    );
}

// ---------- Modals & drawers ----------

function SendTemplateModal({ ctx, onClose, onAuthFail }) {
    const firstSendable = SENDABLE[0]?.key || '';
    const [templateId, setTemplateId] = useState(firstSendable);
    const tpl = ZOKO_TEMPLATES[templateId];
    const [args, setArgs] = useState(() => initArgs(tpl?.variableCount || 0, ctx));
    const [sending, setSending] = useState(false);

    const onPick = (key) => { setTemplateId(key); setArgs(initArgs(ZOKO_TEMPLATES[key]?.variableCount || 0, ctx)); };

    const send = async () => {
        setSending(true);
        try {
            const res = await api('/api/admin/crm/send-template', {
                method: 'POST',
                body: JSON.stringify({ templateId, recipient: ctx.phone, templateArgs: args }),
            });
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success) { toast.success(`WhatsApp sent to ${ctx.name || ctx.phone}`); onClose(); }
            else toast.error(data.message || 'Could not send');
        } catch { toast.error('Could not send'); }
        finally { setSending(false); }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}><h3>Send WhatsApp</h3><button className={styles.modalClose} onClick={onClose}>×</button></div>
                <div className={styles.modalBody}>
                    <p className={styles.hint} style={{ marginTop: 0 }}>To {ctx.name ? `${ctx.name} · ` : ''}{ctx.phone}</p>
                    <div className={styles.field} style={{ marginBottom: 14 }}>
                        <label>Template</label>
                        <select value={templateId} onChange={(e) => onPick(e.target.value)}>
                            {SENDABLE.map((t) => <option key={t.key} value={t.key}>{t.stage} — {t.label}</option>)}
                        </select>
                    </div>
                    {Array.from({ length: tpl?.variableCount || 0 }).map((_, i) => {
                        const varName = tpl?.vars?.[i];
                        return (
                            <div className={styles.field} style={{ marginBottom: 10 }} key={i}>
                                <label>{varName ? `${varName} · {{${i + 1}}}` : `Variable {{${i + 1}}}`}</label>
                                <input value={args[i] ?? ''} onChange={(e) => setArgs((a) => { const n = [...a]; n[i] = e.target.value; return n; })} placeholder={varName || `{{${i + 1}}}`} />
                            </div>
                        );
                    })}
                    {SENDABLE.length === 0 && <p className={styles.hint}>No verified templates are available to send yet.</p>}
                </div>
                <div className={styles.modalFoot}>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={styles.btn} onClick={send} disabled={sending || !templateId}>{sending ? 'Sending…' : 'Send'}</button>
                </div>
            </div>
        </div>
    );
}

function initArgs(count, ctx) {
    const a = Array.from({ length: count }, () => '');
    if (count > 0 && ctx?.name) a[0] = ctx.name;
    if (count > 1 && ctx?.apartment) a[1] = ctx.apartment;
    return a;
}

function ApartmentDrawer({ id, bookings, onClose, onAuthFail, onSend, reload }) {
    const [apt, setApt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await api(`/api/admin/crm/apartment/${id}`);
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success) setApt(data.apartment);
            else toast.error(data.message || 'Could not load this apartment');
        } catch {
            toast.error('Could not load this apartment');
        } finally {
            // In `finally`, so a thrown request can't strand the drawer on "Loading…".
            setLoading(false);
        }
    }, [id, onAuthFail]);

    useEffect(() => { load(); }, [load]);

    const del = async () => {
        if (!confirm('Delete this apartment? This cannot be undone.')) return;
        try {
            const res = await api(`/api/admin/crm/apartment/${id}`, { method: 'DELETE' });
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success) { toast.success('Apartment deleted'); reload(); onClose(); }
            else toast.error(data.message || 'Could not delete');
        } catch { toast.error('Could not delete the apartment. Please try again.'); }
    };

    const aptBookings = [...(bookings.current || []), ...(bookings.cancelled || []), ...(bookings.rescheduled || [])].filter((b) => b.apartmentId === id);

    const fields = apt ? [
        ['Address', apt['Full Address'] || apt.street], ['Area', apt.area], ['Zip', apt.zip_code],
        ['Rental price', apt.rental_price != null ? `€ ${apt.rental_price}` : null],
        ['Bedrooms', apt.bedrooms], ['Square meters', apt.square_meters], ['Status', apt.status],
        ['Duration (min)', apt.lengthInMins], ['Slot interval', apt.slotInterval],
        ['Salesforce ID', apt.salesforce_apartment_id || apt.salesforce_id], ['Notes', apt.additional_notes],
    ] : [];

    return (
        <div className={styles.drawerOverlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.drawerHead}>
                    <div className={styles.brandDot}>▤</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{apt ? (apt['Full Address'] || apt.street || 'Apartment') : 'Loading…'}</div>
                        {apt && <div className={styles.hint}>{apt.area || ''}</div>}
                    </div>
                    <button className={styles.modalClose} onClick={onClose}>×</button>
                </div>
                <div className={styles.drawerBody}>
                    {loading ? <div className={styles.loading}>Loading…</div>
                        : !apt ? <div className={styles.empty}>Apartment not found.</div>
                            : editing ? (
                                <ApartmentForm apt={apt} inline onClose={() => setEditing(false)} onSaved={(updated) => { setApt(updated); setEditing(false); reload(); }} handleAuthFail={onAuthFail} />
                            ) : (
                                <>
                                    <div className={styles.card}>
                                        <div className={styles.cardHead}>
                                            <h3>Details</h3><StatusPill status={apt.status} />
                                            <span className={styles.spacer} />
                                            <button className={`${styles.rowBtn} ${styles.btnGhost}`} onClick={() => setEditing(true)}>Edit</button>
                                            <button className={styles.rowBtn} style={{ marginLeft: 6, background: 'var(--red)' }} onClick={del}>Delete</button>
                                        </div>
                                        <div className={styles.cardBody}>
                                            <dl className={styles.kv}>
                                                {fields.filter(([, v]) => v != null && v !== '').map(([k, v]) => <FieldRow key={k} k={k} v={v} />)}
                                            </dl>
                                        </div>
                                    </div>
                                    <SlotManager apt={apt} onUpdated={(u) => { setApt(u); reload(); }} onAuthFail={onAuthFail} />
                                    <PdfManager aptId={id} apt={apt} onAuthFail={onAuthFail} />
                                    <div className={styles.card}>
                                        <div className={styles.cardHead}><h3>Viewings</h3><span className={styles.hint}>{aptBookings.length}</span></div>
                                        {aptBookings.length === 0 ? <div className={styles.empty}>No viewings recorded.</div> : (
                                            <table className={styles.table}>
                                                <thead><tr><th>Candidate</th><th>Phone</th><th></th></tr></thead>
                                                <tbody>
                                                    {aptBookings.map((b, i) => (
                                                        <tr key={i}>
                                                            <td><b>{b.name}</b></td>
                                                            <td>{b.whatsapp || '—'}</td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                {b.whatsapp && <button className={styles.rowBtn} onClick={() => onSend({ name: b.name, phone: b.whatsapp, apartment: apt['Full Address'] || apt.street })}>Send</button>}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            )}
                </div>
            </div>
        </div>
    );
}

function ApplicationDrawer({ id, onClose, onAuthFail, onSend }) {
    const [acc, setAcc] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const res = await api(`/api/admin/crm/application/${id}`);
                if (onAuthFail(res)) return;
                const data = await res.json();
                if (!active) return;
                if (data.success) setAcc(data.account);
                else toast.error(data.message || 'Could not load this application');
            } catch {
                if (active) toast.error('Could not load this application');
            } finally {
                if (active) setLoading(false);
            }
        })();
        return () => { active = false; };
    }, [id, onAuthFail]);

    const fields = acc ? [
        ['Phone', acc.whatsapp_number], ['Email', acc.email], ['Nationality', acc.nationality],
        ['Work status', acc.work_status], ['Monthly income', acc.monthly_income != null ? `€ ${acc.monthly_income}` : null],
        ['Current address', acc.current_address], ['Current zip', acc.current_zipcode],
        ['Preferred location', acc.preferred_location], ['Move-in', acc.move_in_date],
        ['Doc status', acc.documentation_status], ['Notes', acc.negotiation_notes],
    ] : [];

    return (
        <div className={styles.drawerOverlay} onClick={onClose}>
            <div className={styles.drawer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.drawerHead}>
                    <div className={styles.brandDot}>📝</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{acc ? (acc.tenant_name || 'Application') : 'Loading…'}</div>
                        {acc && <div className={styles.hint}>{acc.whatsapp_number || ''}</div>}
                    </div>
                    {acc?.whatsapp_number && <button className={styles.rowBtn} onClick={() => onSend({ name: acc.tenant_name, phone: acc.whatsapp_number })}>Send</button>}
                    <button className={styles.modalClose} style={{ marginLeft: 8 }} onClick={onClose}>×</button>
                </div>
                <div className={styles.drawerBody}>
                    {loading ? <div className={styles.loading}>Loading…</div>
                        : !acc ? <div className={styles.empty}>Application not found.</div>
                            : (
                                <>
                                    <div className={styles.card}>
                                        <div className={styles.cardHead}><h3>Applicant</h3></div>
                                        <div className={styles.cardBody}>
                                            <dl className={styles.kv}>{fields.filter(([, v]) => v != null && v !== '').map(([k, v]) => <FieldRow key={k} k={k} v={v} />)}</dl>
                                        </div>
                                    </div>
                                    {Array.isArray(acc.co_tenants) && acc.co_tenants.length > 0 && (
                                        <div className={styles.card}>
                                            <div className={styles.cardHead}><h3>Co-tenants</h3><span className={styles.hint}>{acc.co_tenants.length}</span></div>
                                            <div className={styles.cardBody}>
                                                {acc.co_tenants.map((ct, i) => <div key={i} style={{ fontSize: 13.5, padding: '4px 0' }}>{ct.name || ct.tenant_name || JSON.stringify(ct)}</div>)}
                                            </div>
                                        </div>
                                    )}
                                    <div className={styles.card}>
                                        <div className={styles.cardHead}><h3>Documents</h3><span className={styles.hint}>{acc.documents?.length || 0}</span></div>
                                        {(!acc.documents || acc.documents.length === 0) ? <div className={styles.empty}>No documents uploaded.</div> : (
                                            <table className={styles.table}>
                                                <thead><tr><th>Type</th><th>File</th><th>Status</th><th></th></tr></thead>
                                                <tbody>
                                                    {acc.documents.map((d, i) => (
                                                        <tr key={i}>
                                                            <td>{d.type || '—'}</td>
                                                            <td>{d.file_name || '—'}</td>
                                                            <td>{d.status || '—'}</td>
                                                            <td style={{ textAlign: 'right' }}>
                                                                {d.url ? <a className={styles.rowBtn} href={d.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Download</a> : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        )}
                                    </div>
                                </>
                            )}
                </div>
            </div>
        </div>
    );
}

function FieldRow({ k, v }) { return (<><dt>{k}</dt><dd>{String(v)}</dd></>); }

function LinkRow({ label, url }) {
    if (!url) return null;
    return (
        <div style={{ marginBottom: 8 }}>
            <div className={styles.hint}>{label}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontSize: 13, wordBreak: 'break-all', flex: 1 }}>{url}</a>
                <button className={`${styles.rowBtn} ${styles.btnGhost}`} onClick={() => { navigator.clipboard.writeText(url); toast.success('Copied'); }}>Copy</button>
            </div>
        </div>
    );
}

function SlotManager({ apt, onUpdated, onAuthFail }) {
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [len, setLen] = useState(apt.lengthInMins || 30);
    const [busy, setBusy] = useState(false);
    const latest = apt.booking_details?.latest_slot || (Array.isArray(apt.slot_dates) && apt.slot_dates.length ? apt.slot_dates[apt.slot_dates.length - 1] : null);

    const generate = async (viewingType) => {
        if (!start || !end) { toast.error('Pick a start and end time'); return; }
        setBusy(true);
        try {
            const res = await api(`/api/admin/crm/apartment/${apt.id}/generate-slot`, {
                method: 'POST',
                body: JSON.stringify({ start: new Date(start).toISOString(), end: new Date(end).toISOString(), slotLengthMinutes: Number(len), viewingType }),
            });
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success) { toast.success('Bookable link generated'); onUpdated(data.apartment); }
            else toast.error(data.message || 'Could not generate link');
        } catch { toast.error('Could not generate link'); }
        finally { setBusy(false); }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHead}><h3>Viewing slot &amp; bookable link</h3></div>
            <div className={styles.cardBody}>
                <div className={styles.formRow}>
                    <div className={styles.field}><label>Start</label><input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></div>
                    <div className={styles.field}><label>End</label><input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></div>
                </div>
                <div className={styles.formRow}>
                    <div className={styles.field}><label>Slot length (min)</label><input type="number" value={len} onChange={(e) => setLen(e.target.value)} /></div>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                        <button className={styles.btn} style={{ background: '#8B4513' }} onClick={() => generate('inPerson')} disabled={busy}>{busy ? 'In-person…' : 'In Person'}</button>
                        <button className={styles.btn} style={{ background: '#2563EB' }} onClick={() => generate('video')} disabled={busy}>{busy ? 'Video…' : 'Video Call'}</button>
                    </div>
                </div>
                {latest && (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
                        <LinkRow label="In-person bookable link" url={latest.eventlink} />
                        <LinkRow label="Video (Facetime) link" url={latest.eventlink_video} />
                        {Array.isArray(apt.slot_dates) && apt.slot_dates.length > 1 && <div className={styles.hint}>{apt.slot_dates.length} slots generated for this apartment.</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

function PdfManager({ aptId, apt, onAuthFail }) {
    const [pdf, setPdf] = useState(apt.booking_details?.brochure_pdf || null);
    const [busy, setBusy] = useState(false);

    const upload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type !== 'application/pdf') { toast.error('Only PDF files'); return; }
        setBusy(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await apiUpload(`/api/admin/crm/apartment/${aptId}/pdf`, fd);
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success) { toast.success('Brochure PDF uploaded'); setPdf(data.pdf); }
            else toast.error(data.message || 'Upload failed');
        } catch { toast.error('Upload failed'); }
        finally { setBusy(false); }
    };

    const view = async () => {
        try {
            const res = await api(`/api/admin/crm/apartment/${aptId}/pdf`);
            if (onAuthFail(res)) return;
            const data = await res.json();
            if (data.success && data.pdf?.url) window.open(data.pdf.url, '_blank');
            else toast.error('No PDF available');
        } catch { toast.error('Could not open the PDF. Please try again.'); }
    };

    return (
        <div className={styles.card}>
            <div className={styles.cardHead}><h3>Apartment brochure (PDF)</h3><span className={styles.hint}>shared via pdf_apartment_utility</span></div>
            <div className={styles.cardBody}>
                {pdf ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ flex: 1, fontSize: 13.5 }}>📄 {pdf.name}</span>
                        <button className={`${styles.rowBtn} ${styles.btnGhost}`} onClick={view}>View</button>
                        <label className={styles.rowBtn} style={{ cursor: 'pointer' }}>
                            Replace<input type="file" accept="application/pdf" hidden onChange={upload} disabled={busy} />
                        </label>
                    </div>
                ) : (
                    <label className={styles.btn} style={{ cursor: 'pointer', display: 'inline-flex' }}>
                        {busy ? 'Uploading…' : 'Upload PDF'}
                        <input type="file" accept="application/pdf" hidden onChange={upload} disabled={busy} />
                    </label>
                )}
                <div className={styles.hint} style={{ marginTop: 8 }}>One PDF · max 20 MB. Stored in Supabase Storage.</div>
            </div>
        </div>
    );
}

// ---------- Forms ----------

function ApartmentForm({ apt, inline, onClose, onSaved, handleAuthFail }) {
    const editing = !!apt;
    const [f, setF] = useState({
        name: apt?.name || apt?.['Full Address'] || '',
        fullAddress: apt?.['Full Address'] || '',
        area: apt?.area || '',
        zip_code: apt?.zip_code || '',
        rental_price: apt?.rental_price ?? '',
        bedrooms: apt?.bedrooms ?? '',
        square_meters: apt?.square_meters ?? '',
        lengthInMins: apt?.lengthInMins ?? '',
        slotInterval: apt?.slotInterval ?? '',
        status: apt?.status || 'Null',
        additional_notes: apt?.additional_notes || '',
    });
    const [saving, setSaving] = useState(false);
    const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

    const save = async () => {
        if (!f.name.trim()) { toast.error('Apartment name is required'); return; }
        setSaving(true);
        try {
            const res = editing
                ? await api(`/api/admin/crm/apartment/${apt.id}`, { method: 'PATCH', body: JSON.stringify(f) })
                : await api('/api/admin/crm/apartment', { method: 'POST', body: JSON.stringify(f) });
            if (handleAuthFail?.(res)) return;
            const data = await res.json();
            if (data.success) { toast.success(editing ? 'Apartment updated' : 'Apartment created'); onSaved(data.apartment); }
            else toast.error(data.message || 'Could not save');
        } catch { toast.error('Could not save'); }
        finally { setSaving(false); }
    };

    const body = (
        <>
            <div className={styles.field} style={{ marginBottom: 12 }}><label>Apartment name *</label><input value={f.name} onChange={set('name')} placeholder="Govert Flinckstraat 357-H" /></div>
            <div className={styles.field} style={{ marginBottom: 12 }}><label>Full address</label><input value={f.fullAddress} onChange={set('fullAddress')} placeholder="Street, city" /></div>
            <div className={styles.formRow}>
                <div className={styles.field}><label>Area / city</label><input value={f.area} onChange={set('area')} placeholder="Amsterdam" /></div>
                <div className={styles.field}><label>Zip code</label><input value={f.zip_code} onChange={set('zip_code')} placeholder="1074 CD" /></div>
            </div>
            <div className={styles.formRow}>
                <div className={styles.field}><label>Rental price (€)</label><input type="number" value={f.rental_price} onChange={set('rental_price')} placeholder="2600" /></div>
                <div className={styles.field}><label>Bedrooms</label><input value={f.bedrooms} onChange={set('bedrooms')} placeholder="2" /></div>
            </div>
            <div className={styles.formRow}>
                <div className={styles.field}><label>Square meters</label><input type="number" value={f.square_meters} onChange={set('square_meters')} placeholder="51" /></div>
                <div className={styles.field}>
                    <label>Status</label>
                    <select value={f.status} onChange={set('status')}>
                        {['Null', 'CreateLink', 'Active', 'Closed'].map((s) => <option key={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            <div className={styles.formRow}>
                <div className={styles.field}><label>Duration (min)</label><input type="number" value={f.lengthInMins} onChange={set('lengthInMins')} placeholder="30" /></div>
                <div className={styles.field}><label>Slot interval (min)</label><input type="number" value={f.slotInterval} onChange={set('slotInterval')} placeholder="5" /></div>
            </div>
            <div className={styles.field}><label>Notes</label><input value={f.additional_notes} onChange={set('additional_notes')} /></div>
        </>
    );

    if (inline) {
        return (
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>Edit apartment</h3></div>
                <div className={styles.cardBody}>{body}
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 14 }}>
                        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                        <button className={styles.btn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}><h3>New apartment</h3><button className={styles.modalClose} onClick={onClose}>×</button></div>
                <div className={styles.modalBody}>{body}</div>
                <div className={styles.modalFoot}>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={styles.btn} onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</button>
                </div>
            </div>
        </div>
    );
}

function AgentForm({ agent, onClose, onSaved, handleAuthFail }) {
    const editing = !!agent;
    const [f, setF] = useState({ name: agent?.name || '', whatsapp_number: agent?.whatsapp_number || '', email: agent?.email || '' });
    const [saving, setSaving] = useState(false);
    const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

    const save = async () => {
        if (!f.name.trim()) { toast.error('Agent name is required'); return; }
        setSaving(true);
        try {
            const res = editing
                ? await api(`/api/admin/crm/agents/${agent.id}`, { method: 'PATCH', body: JSON.stringify(f) })
                : await api('/api/admin/crm/agents', { method: 'POST', body: JSON.stringify(f) });
            if (handleAuthFail(res)) return;
            const data = await res.json();
            if (data.success) { toast.success(editing ? 'Agent updated' : 'Agent added'); onSaved(); }
            else toast.error(data.message || 'Could not save');
        } catch { toast.error('Could not save'); }
        finally { setSaving(false); }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}><h3>{editing ? 'Edit agent' : 'New agent'}</h3><button className={styles.modalClose} onClick={onClose}>×</button></div>
                <div className={styles.modalBody}>
                    <div className={styles.field} style={{ marginBottom: 12 }}><label>Name *</label><input value={f.name} onChange={set('name')} placeholder="David" /></div>
                    <div className={styles.field} style={{ marginBottom: 12 }}><label>Phone</label><input value={f.whatsapp_number} onChange={set('whatsapp_number')} placeholder="06 …" /></div>
                    <div className={styles.field}><label>Email</label><input value={f.email} onChange={set('email')} placeholder="david@apartmenthub.nl" /></div>
                </div>
                <div className={styles.modalFoot}>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={styles.btn} onClick={save} disabled={saving}>{saving ? 'Saving…' : (editing ? 'Save' : 'Add')}</button>
                </div>
            </div>
        </div>
    );
}

const DEFAULT_PERMS = { apartments: true, candidates: true, offers: false, team: false };

function TeamTab({ team, loading, reload, handleAuthFail }) {
    const [form, setForm] = useState({ name: '', email: '', phone: '', start_date: '', role: 'agent' });
    const [perms, setPerms] = useState(DEFAULT_PERMS);
    const [saving, setSaving] = useState(false);
    // The temp password is shown exactly once and cannot be recovered, so it
    // gets a dismissable panel rather than a toast that times out.
    const [newCredentials, setNewCredentials] = useState(null);

    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const togglePerm = (k) => setPerms((p) => ({ ...p, [k]: !p[k] }));

    const submit = async () => {
        if (!form.name || !form.email) { toast.error('Name and email are required'); return; }
        setSaving(true);
        try {
            const res = await api('/api/admin/crm/team', { method: 'POST', body: JSON.stringify({ ...form, permissions: perms }) });
            if (handleAuthFail?.(res)) return;
            const data = await res.json();
            if (data.success) {
                toast.success(`${form.name} added.`);
                setNewCredentials({ name: form.name, email: form.email, password: data.tempPassword });
                setForm({ name: '', email: '', phone: '', start_date: '', role: 'agent' });
                setPerms(DEFAULT_PERMS);
                reload();
            } else toast.error(data.message || 'Could not add employee');
        } catch { toast.error('Could not add employee'); }
        finally { setSaving(false); }
    };

    const setActive = async (member, is_active) => {
        const verb = is_active ? 'Reactivate' : 'Deactivate';
        if (!confirm(`${verb} ${member.name}?`)) return;
        try {
            const res = await api('/api/admin/crm/team', { method: 'PATCH', body: JSON.stringify({ id: member.id, is_active }) });
            if (handleAuthFail?.(res)) return;
            const data = await res.json();
            if (data.success) { toast.success(`${member.name} ${is_active ? 'reactivated' : 'deactivated'}`); reload(); }
            else toast.error(data.message || `Could not ${verb.toLowerCase()} this member`);
        } catch { toast.error(`Could not ${verb.toLowerCase()} this member`); }
    };

    return (
        <>
            <h2 className={styles.page}>Team</h2>
            <p className={styles.sub}>Add employees and manage access. Roles: Super Admin · Admin · Agent — stored in <code>crm_users</code>, per-user login via Supabase Auth.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 18, alignItems: 'start' }}>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Add employee</h3></div>
                    <div className={styles.cardBody}>
                        <div className={styles.field} style={{ marginBottom: 12 }}><label>Name</label><input value={form.name} onChange={set('name')} placeholder="Lander de Vries" /></div>
                        <div className={styles.formRow}>
                            <div className={styles.field}><label>Email</label><input value={form.email} onChange={set('email')} placeholder="lander@apartmenthub.nl" /></div>
                            <div className={styles.field}><label>Phone</label><input value={form.phone} onChange={set('phone')} placeholder="06 …" /></div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.field}><label>Start date</label><input type="date" value={form.start_date} onChange={set('start_date')} /></div>
                            <div className={styles.field}>
                                <label>Role</label>
                                <select value={form.role} onChange={set('role')}>
                                    <option value="agent">Agent</option><option value="admin">Admin</option><option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                        </div>
                        <label className={styles.field} style={{ display: 'block', marginTop: 4 }}><span style={{ fontSize: 12, fontWeight: 600, color: '#44524f' }}>Access</span></label>
                        {[['apartments', 'Apartments'], ['candidates', 'Candidates & viewings'], ['offers', 'Offers'], ['team', 'Team (admin)']].map(([k, lbl]) => (
                            <label className={styles.perm} key={k}><input type="checkbox" checked={perms[k]} onChange={() => togglePerm(k)} /> {lbl}</label>
                        ))}
                        <button className={styles.btn} style={{ marginTop: 14 }} onClick={submit} disabled={saving}>{saving ? 'Adding…' : 'Add employee'}</button>

                        {newCredentials && (
                            <div className={styles.credentials}>
                                <div className={styles.credentialsHead}>
                                    <b>Share these with {newCredentials.name}</b>
                                    <button className={styles.modalClose} onClick={() => setNewCredentials(null)}>×</button>
                                </div>
                                <div className={styles.hint}>Shown once — it cannot be retrieved later.</div>
                                <dl className={styles.kv}>
                                    <dt>Email</dt><dd>{newCredentials.email}</dd>
                                    <dt>Temp password</dt><dd><code>{newCredentials.password}</code></dd>
                                </dl>
                                <button
                                    className={`${styles.rowBtn} ${styles.btnGhost}`}
                                    onClick={() => {
                                        navigator.clipboard?.writeText(`Email: ${newCredentials.email}\nPassword: ${newCredentials.password}`)
                                            .then(() => toast.success('Copied'))
                                            .catch(() => toast.error('Could not copy — select the text instead'));
                                    }}
                                >Copy</button>
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Team members</h3></div>
                    {loading ? <div className={styles.empty}>Loading…</div>
                        : team.length === 0 ? <div className={styles.empty}>No team members yet — add the first one.</div> : (
                            <table className={styles.table}>
                                <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Since</th><th></th></tr></thead>
                                <tbody>
                                    {team.map((m) => (
                                        <tr key={m.id} style={m.is_active === false ? { opacity: 0.55 } : undefined}>
                                            <td><b>{m.name}</b>{m.is_active === false && <span className={styles.hint}> · inactive</span>}</td>
                                            <td>{m.email}</td>
                                            <td><span className={`${styles.pill} ${m.role === 'agent' ? styles.pillGrey : styles.pillTeal}`}>{m.role.replace('_', ' ')}</span></td>
                                            <td>{m.start_date || (m.created_at ? m.created_at.slice(0, 10) : '—')}</td>
                                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                                <button
                                                    className={`${styles.rowBtn} ${styles.btnGhost}`}
                                                    onClick={() => setActive(m, m.is_active === false)}
                                                >{m.is_active === false ? 'Reactivate' : 'Deactivate'}</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                </div>
            </div>
        </>
    );
}
