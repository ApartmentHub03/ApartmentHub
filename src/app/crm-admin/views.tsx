'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './crm.module.css';
import type { Me, Apartment, Candidate, CrmAgent, Bookings, TeamMember, BusinessLine, ApplicationDetail, ApplicationResponse, PersoonEntry, DocumentEntry, PipelineStage, ViewingEntry, OfferInEntry, OfferSentEntry, DealEntry, ApartmentRecord, ApartmentRecordResponse, WonDeal, RealEstateAgent, CrmUserOption } from './types';
import type { ModalState } from './modals';

type ToastFn = (msg: string) => void;
type ModalFn = (m: ModalState | null) => void;

// ============================================================
// Dashboard — wired to /api/admin/crm/lists
// ============================================================
export function DashboardView({ me, lists, loading }: { me: Me; lists: { apartments: Apartment[]; candidates: Candidate[]; agents: CrmAgent[]; bookings: Bookings }; loading: boolean }) {
    const [role, setRole] = useState<'admin' | 'agent'>(me.role === 'admin' || me.role === 'super_admin' ? 'admin' : 'agent');
    const A = role === 'admin';

    if (loading) return <div className={styles.loading}>Loading dashboard…</div>;

    const activeApts = lists.apartments.filter((a) => a.status === 'Active').length;
    const viewings = lists.bookings.current.length;
    const candidates = lists.candidates.length;

    return (
        <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2 className={styles.pageTitle} style={{ margin: 0 }}>Dashboard</h2>
                <span className={styles.hint}>View as</span>
                <select className={styles.inp} style={{ width: 'auto', padding: '6px 9px' }} value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}>
                    <option value="admin">Admin ({me.name || 'David'})</option>
                    <option value="agent">Agent (Lander)</option>
                </select>
            </div>
            <p className={styles.sub}>
                Amsterdam · {A ? 'admin view · full company overview' : 'agent view · your own work only · company financials are hidden'}.
            </p>

            <div className={styles.kpis}>
                {A ? (
                    <>
                        {kpi(String(activeApts), 'Active apartments')}
                        {kpi(String(candidates), 'Candidates', '+9 today')}
                        {kpi(String(viewings), 'Viewings this week')}
                        {kpi('3', 'Offers out', '1 awaiting deal')}
                    </>
                ) : (
                    <>
                        {kpi('3', 'My apartments')}
                        {kpi('2', 'My viewings this week')}
                        {kpi('2', 'My offers in')}
                        {kpi('1', 'My offers out')}
                    </>
                )}
            </div>

            <div className={styles.grid2Wide}>
                {A ? (
                    <div className={styles.card}>
                        <div className={styles.cardHead}>
                            <h3>Forecast &amp; earnings</h3>
                            <span className={`${styles.pill} ${styles.pillTeal} ${styles.cardHeadSp}`}>Admin only</span>
                        </div>
                        <div className={styles.cardBody}>
                            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-end' }}>
                                <div style={{ flex: 1 }}>
                                    <div className={styles.hint}>Forecast (next months)</div>
                                    <div className={styles.bars}>
                                        <div style={{ height: '45%' }} />
                                        <div style={{ height: '60%' }} />
                                        <div style={{ height: '78%' }} />
                                        <div style={{ height: '92%' }} />
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div className={styles.hint}>Earned this month</div>
                                    <div style={{ fontSize: 30, fontWeight: 800 }}>€ 9.400</div>
                                    <div className={styles.hint}>€ 48.250 this year · 7 deals</div>
                                </div>
                            </div>
                            <div className={styles.hint} style={{ marginTop: 10 }}>
                                Financial dashboard · <b>admins only</b>. Not part of the current build to connect (later).
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className={styles.card}>
                        <div className={styles.cardHead}><h3>My bids &amp; offers</h3></div>
                        <div className={styles.cardBody} style={{ padding: '8px 18px' }}>
                            {rel('Sara &amp; Tom · Keizersgracht 12', 'Offers In · Bid #2', <button className={`${styles.btn} ${styles.btnSm}`}>Generate offer</button>)}
                            {rel('A. Yilmaz · Keizersgracht 12', 'Offers Out · sent 2 days ago', <span className={`${styles.pill} ${styles.pillAmber}`}>Awaiting</span>)}
                            <div className={styles.hint} style={{ marginTop: 8 }}>As an agent you handle the bids that come in · company financials are hidden.</div>
                        </div>
                    </div>
                )}

                <div className={styles.card}>
                    <div className={styles.cardHead}>
                        <h3>Notifications</h3>
                        <span className={styles.ref}>point 19</span>
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.notif}>
                            <span className={`${styles.pill} ${styles.pillOrange}`}>●</span>
                            <div className={styles.notifText}><b>New bid received</b><div className={styles.hint}>Lukas Norman · Keizersgracht 12</div></div>
                        </div>
                        <div className={styles.notif}>
                            <span className={`${styles.pill} ${styles.pillTeal}`}>●</span>
                            <div className={styles.notifText}>New booking · facetime viewing<div className={styles.hint}>Today 16:00</div></div>
                        </div>
                        <div className={styles.notif}>
                            <span className={`${styles.pill} ${styles.pillGreen}`}>●</span>
                            <div className={styles.notifText}>Application complete · ready to generate offer<div className={styles.hint}>Sara &amp; Tom</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.grid2}>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Offers awaiting response</h3></div>
                    <div className={styles.cardBody} style={{ padding: '6px 18px 10px' }}>
                        {rel('A. Yilmaz · Keizersgracht 12', 'Sent 2 days ago · € 1.700', <span className={`${styles.pill} ${styles.pillAmber}`}>Awaiting</span>)}
                        {rel('R. Visser · Da Costakade 21', 'Sent 1 day ago · € 1.850', <span className={`${styles.pill} ${styles.pillAmber}`}>Awaiting</span>)}
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Upcoming viewings</h3></div>
                    <div className={styles.cardBody} style={{ padding: '6px 18px 10px' }}>
                        {rel('Lukas Norman · Keizersgracht 12', 'In-person', <b>Tue 14:00</b>)}
                        {rel('Sara &amp; Tom · Prinsengracht 88', 'Facetime', <b>Today 16:00</b>)}
                    </div>
                </div>
            </div>
        </>
    );
}

function kpi(n: string, l: string, d?: string) {
    return (
        <div className={styles.kpi}>
            <div className={styles.kpiVal}>{n}</div>
            <div className={styles.kpiLabel}>{l}</div>
            {d && <div className={styles.kpiDelta}>{d}</div>}
        </div>
    );
}

function rel(name: React.ReactNode, meta: string, right: React.ReactNode, key?: React.Key) {
    return (
        <div className={styles.rel} key={key}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.relName}>{name}</div>
                <div className={styles.relMeta}>{meta}</div>
            </div>
            <div className={styles.relRight}>{right}</div>
        </div>
    );
}

// ============================================================
// Apartments — pipeline-grouped list wired to lists.apartments
// ============================================================
const PIPELINE_GROUPS: { stage: PipelineStage; label: string; pillClass: string }[] = [
    { stage: 'active', label: 'Active — viewing just went (past week)', pillClass: 'pillGreen' },
    { stage: 'waiting', label: 'Waiting for offers', pillClass: 'pillAmber' },
    { stage: 'offers_out', label: 'Offers out', pillClass: 'pillTeal' },
    { stage: 'deals', label: 'Deals — won / failed (mixed)', pillClass: 'pillTeal' },
    { stage: 'not_active', label: 'Not active — viewing was 2+ weeks ago, nothing more to do (low priority)', pillClass: 'pillGrey' },
];

export function ApartmentsView({ apartments, loading, onOpenRecord, onCreate }: {
    apartments: Apartment[];
    loading: boolean;
    onOpenRecord: (id: string) => void;
    onCreate: () => void;
}) {
    return (
        <>
            <h2 className={styles.pageTitle}>Apartments</h2>
            <p className={styles.sub}>
                Grouped as a pipeline: viewing just went (past week) → waiting for offers → offers out → deals (won/failed). The <b>neighborhood</b> is auto-generated from the address. Apartments drop to <b>Not active</b> automatically 2 weeks after the viewing if nothing more happened. Click an apartment for the full record.
            </p>
            <div className={styles.card}>
                <div className={styles.cardHead}>
                    <h3>Apartments</h3>
                    <span className={`${styles.hint} ${styles.cardHeadSp}`}>{apartments.length} items</span>
                    <button className={`${styles.btn} ${styles.btnSm}`} style={{ marginLeft: 12 }} onClick={onCreate}>+ New apartment</button>
                </div>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                    {loading ? (
                        <div className={styles.loading}>Loading apartments…</div>
                    ) : apartments.length === 0 ? (
                        <div className={styles.empty}>No apartments yet. Click "+ New apartment" to create one.</div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Apartment</th><th>Neighborhood</th><th>Viewing moment</th><th>Price</th><th>Realtor</th><th>Agent</th><th>Joined</th><th>Offers in</th><th>Offers out</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {PIPELINE_GROUPS.flatMap((group) => {
                                    const items = apartments.filter((a) => a.pipeline_stage === group.stage);
                                    if (items.length === 0) return [];
                                    return [
                                        <tr key={`hd-${group.stage}`} className={styles.groupHdRow}>
                                            <td colSpan={10}>{group.label}</td>
                                        </tr>,
                                        ...items.map((a) => (
                                            <tr key={a.id} className={styles.rowClickable} onClick={() => onOpenRecord(a.id)}>
                                                <td><a style={{ color: 'var(--teal)', fontWeight: 600 }}>{a['Full Address'] || a.street || '—'}</a></td>
                                                <td>{a.area || '—'}</td>
                                                <td>{a.viewing_moment || '—'}</td>
                                                <td>{a.rental_price ? `€${a.rental_price}` : '—'}</td>
                                                <td>{a.real_estate_agent_name || '—'}</td>
                                                <td>—</td>
                                                <td>{a.joined_count || 0}</td>
                                                <td>{a.offers_in_count || 0}</td>
                                                <td>{a.offers_out_count || 0}</td>
                                                <td><PipelineStatusPill stage={a.pipeline_stage} status={a.status} /></td>
                                            </tr>
                                        )),
                                    ];
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </>
    );
}

function PipelineStatusPill({ stage, status }: { stage: PipelineStage; status: string | null }) {
    const stageLabels: Record<PipelineStage, string> = {
        active: 'Active',
        waiting: 'Waiting',
        offers_out: 'Offers out',
        deals: 'Deals',
        not_active: 'Not active',
    };
    const label = stageLabels[stage] || status || '—';
    if (stage === 'active') return <span className={`${styles.pill} ${styles.pillGreen}`}>{label}</span>;
    if (stage === 'waiting') return <span className={`${styles.pill} ${styles.pillAmber}`}>{label}</span>;
    if (stage === 'offers_out') return <span className={`${styles.pill} ${styles.pillTeal}`}>{label}</span>;
    if (stage === 'deals') return <span className={`${styles.pill} ${styles.pillTeal}`}>{label}</span>;
    return <span className={`${styles.pill} ${styles.pillGrey}`}>{label}</span>;
}

// ============================================================
// Apartment Record — wired to /api/admin/crm/apartment/[id]
// ============================================================
export function ApartmentRecordView({ aptId, onBack, onOpenApplication, onToast, onModal, isAdmin, phoneToAccountId, reloadSignal }: {
    aptId: string;
    onBack: () => void;
    onOpenApplication: (accountId: string, name: string, from: 'scheduled' | 'canceled' | 'making' | 'offersin' | 'offersout') => void;
    onToast: ToastFn;
    onModal: ModalFn;
    isAdmin: boolean;
    phoneToAccountId: Map<string, string>;
    reloadSignal: number;
}) {
    const [subtab, setSubtab] = useState<'scheduled' | 'canceled' | 'making' | 'offersin' | 'offersout'>('scheduled');
    const [apt, setApt] = useState<ApartmentRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [offerLoading, setOfferLoading] = useState<string | null>(null); // account_id being offered
    const [noDealLoading, setNoDealLoading] = useState<string | null>(null); // account_id being declined
    const [sendLoading, setSendLoading] = useState<string | null>(null); // account_id being sent to Offers Out
    const [pdf, setPdf] = useState<{ name: string; path: string; uploaded_at: string; url?: string } | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

    const loadApt = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
            });
            const data: ApartmentRecordResponse = await res.json();
            if (data.success && data.apartment) {
                setApt(data.apartment);
            } else {
                setError(data.message || 'Failed to load apartment');
            }
        } catch (e) {
            setError('Failed to load apartment');
            console.error('ApartmentRecordView fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [aptId]);

    useEffect(() => {
        loadApt();
    }, [loadApt, reloadSignal]);

    const loadPdf = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/pdf`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
            });
            const data = await res.json();
            if (data.success && data.pdf) setPdf(data.pdf);
            else setPdf(null);
        } catch { /* no pdf yet */ }
    }, [aptId]);

    useEffect(() => { loadPdf(); }, [loadPdf, reloadSignal]);

    async function uploadPdf(file: File) {
        if (file.type !== 'application/pdf') { onToast('Only PDF files'); return; }
        setPdfLoading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/pdf`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: fd,
            });
            const data = await res.json();
            if (data.success) { setPdf(data.pdf); onToast('Brochure PDF uploaded'); }
            else onToast(data.message || 'Upload failed');
        } catch { onToast('Upload failed'); }
        finally { setPdfLoading(false); }
    }

    async function viewPdf() {
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/pdf`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
            });
            const data = await res.json();
            if (data.success && data.pdf?.url) window.open(data.pdf.url, '_blank');
            else onToast('No PDF available');
        } catch { onToast('Could not open the PDF'); }
    }

    const [closing, setClosing] = useState(false);

    async function closeListing() {
        if (!apt) return;
        if (!confirm(`Close "${apt['Full Address'] || apt.street || aptId}"?\n\nThis tears down the Cal.com viewing links and marks the apartment as Closed. Tenants will no longer be able to book viewings.`)) return;
        setClosing(true);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
            });
            const data = await res.json();
            if (data.success) {
                onToast(data.cal_warnings?.length ? `Closed — Cal.com cleanup had issues` : 'Listing closed — Cal.com links removed');
                loadApt();
            } else {
                onToast(data.message || 'Failed to close listing');
            }
        } catch (e) {
            onToast('Failed to close listing — check console');
            console.error('close-listing error:', e);
        } finally {
            setClosing(false);
        }
    }

    async function generateOffer(accountId: string, tenantName: string) {
        setOfferLoading(accountId);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/generate-offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ account_id: accountId }),
            });
            const data = await res.json();
            if (data.success) {
                onToast(`Offer triggered for ${tenantName} — n8n is drafting`);
            } else {
                onToast(data.message || 'Generate offer failed');
            }
        } catch (e) {
            onToast('Generate offer failed — check console');
            console.error('generate-offer error:', e);
        } finally {
            setOfferLoading(null);
        }
    }

    // Send offer — moves an entry from offers_in to offers_sent so it shows
    // up in the Offers Out subtab with Deal / No Deal buttons. This is the
    // pipeline step between "tenant submitted offer" and "agent responds to
    // offer". See /api/admin/crm/apartment/[id]/send-offer/route.js.
    async function sendOffer(accountId: string, tenantName: string) {
        if (!confirm(`Send the offer from ${tenantName} to Offers Out?\n\nThis moves the offer to the next pipeline stage so you can mark Deal / No Deal. The tenant's entry disappears from Offers In.`)) return;
        setSendLoading(accountId);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/send-offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ account_id: accountId }),
            });
            const data = await res.json();
            if (data.success) {
                onToast(data.already_sent
                    ? `${tenantName}'s offer was already in Offers Out`
                    : `Offer from ${tenantName} sent to Offers Out`);
                loadApt();
            } else {
                onToast(data.message || 'Failed to send offer');
            }
        } catch (e) {
            onToast('Failed to send offer — check console');
            console.error('send-offer error:', e);
        } finally {
            setSendLoading(null);
        }
    }

    async function noDeal(accountId: string, tenantName: string) {
        if (!confirm(`Decline the offer from ${tenantName}?\n\nThis will mark the offer as declined and notify the tenant via n8n.`)) return;
        setNoDealLoading(accountId);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/no-deal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ account_id: accountId }),
            });
            const data = await res.json();
            if (data.success) {
                onToast(`Offer from ${tenantName} declined — n8n notified`);
                loadApt();
            } else {
                onToast(data.message || 'Failed to decline offer');
            }
        } catch (e) {
            onToast('Failed to decline offer — check console');
            console.error('no-deal error:', e);
        } finally {
            setNoDealLoading(null);
        }
    }

    function copyViewingLink() {
        if (!apt?.event_link) { onToast('No viewing link set for this apartment'); return; }
        navigator.clipboard.writeText(apt.event_link).then(() => onToast('Viewing link copied')).catch(() => onToast('Could not copy — copy manually: ' + apt.event_link));
    }

    if (loading) {
        return (
            <>
                <div style={{ marginBottom: 10 }}>
                    <button className={styles.backLink} onClick={onBack}>‹ Apartments</button>
                </div>
                <div className={styles.loading}>Loading apartment…</div>
            </>
        );
    }

    if (error || !apt) {
        return (
            <>
                <div style={{ marginBottom: 10 }}>
                    <button className={styles.backLink} onClick={onBack}>‹ Apartments</button>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardBody}>
                        <p style={{ color: 'var(--red)' }}>{error || 'Apartment not found'}</p>
                        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={loadApt}>Retry</button>
                    </div>
                </div>
            </>
        );
    }

    // Map JSONB arrays to subtab data
    const scheduled: ViewingEntry[] = Array.isArray(apt.viewing_participants) ? apt.viewing_participants : [];
    const canceled: ViewingEntry[] = Array.isArray(apt.viewing_cancellations) ? apt.viewing_cancellations : [];
    const rescheduled: ViewingEntry[] = Array.isArray(apt.booking_reschedules) ? apt.booking_reschedules : [];
    const making: unknown[] = Array.isArray(apt.people_making_offer) ? apt.people_making_offer : [];
    const offersIn: OfferInEntry[] = Array.isArray(apt.offers_in) ? apt.offers_in : [];
    const offersOut: OfferSentEntry[] = Array.isArray(apt.offers_sent) ? apt.offers_sent : [];

    const address = apt['Full Address'] || apt.street || '—';
    const latestSlot = apt.booking_details?.latest_slot as { start?: string; end?: string } | undefined;
    const slotDates = Array.isArray(apt.slot_dates) ? apt.slot_dates : [];
    const lastSlot = (slotDates.length > 0 ? slotDates[slotDates.length - 1] : null) as { start?: string; end?: string } | null;
    const viewingDateRaw = latestSlot?.start
        || lastSlot?.start
        || apt.booking_details?.date
        || apt.booking_details?.start_date
        || apt.booking_details?.when
        || null;
    const viewingDate = viewingDateRaw ? String(viewingDateRaw) : null;
    const viewingEndRaw = latestSlot?.end
        || lastSlot?.end
        || apt.booking_details?.end_date
        || apt.booking_details?.ends
        || null;
    const viewingEnd = viewingEndRaw ? String(viewingEndRaw) : null;

    const sections: Record<string, React.ReactNode> = {
        scheduled: (
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>People Joining Viewing</h3></div>
                <div className={styles.cardBody} style={{ padding: '6px 18px 10px' }}>
                    {scheduled.length === 0 ? (
                        <div className={styles.empty}>No one has joined the viewing yet.</div>
                    ) : scheduled.map((p, i) => {
                        // Name resolution priority:
                        //   1. p.name (from tenants.name via build_tenant_participant) — the
                        //      real candidate name for genuine bookings.
                        //   2. p.whatsapp_number — better than showing "ApartmentHub", which
                        //      is what tenants.name carries for Cal.com organizer/test slots
                        //      (sampletest-video, etc.) that never had a real booker.
                        //   3. '—' last resort.
                        const phoneDigits = (p.whatsapp_number || '').replace(/\D/g, '');
                        const acctId = phoneDigits.length >= 9 ? phoneToAccountId.get(phoneDigits.slice(-9)) : null;
                        const fallbackName = (p.name && p.name !== 'ApartmentHub') ? p.name : (p.whatsapp_number || '—');
                        const name = fallbackName;
                        const nameEl = acctId
                            ? <button style={{ color: 'var(--teal)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', fontWeight: 600 }} onClick={() => onOpenApplication(acctId, name, 'scheduled')}>{name}</button>
                            : <span style={{ fontWeight: 600 }}>{name}</span>;
                        return rel(nameEl, p.event_url || p.whatsapp_number || '', <span className={`${styles.pill} ${styles.pillGreen}`}>Joined</span>, i);
                    })}
                </div>
            </div>
        ),
        canceled: (
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>Viewing Canceled / Rescheduled</h3></div>
                <div className={styles.cardBody} style={{ padding: '6px 18px 10px' }}>
                    {canceled.length === 0 && rescheduled.length === 0 ? (
                        <div className={styles.empty}>No cancellations or reschedules.</div>
                    ) : (
                        <>
                            {canceled.map((p, i) => (
                                rel(p.name || '—', p.event_url || p.whatsapp_number || '', <span className={`${styles.pill} ${styles.pillRed}`}>Canceled</span>, `c${i}`)
                            ))}
                            {rescheduled.map((p, i) => (
                                rel(p.name || '—', 'Moved to new time', <span className={`${styles.pill} ${styles.pillAmber}`}>Rescheduled</span>, `r${i}`)
                            ))}
                        </>
                    )}
                </div>
            </div>
        ),
        making: (
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>People Making an Offer</h3><span className={`${styles.hint} ${styles.cardHeadSp}`}>busy · not submitted yet</span></div>
                <div className={styles.cardBody} style={{ padding: '6px 18px 10px' }}>
                    {making.length === 0 ? (
                        <div className={styles.empty}>No one is making an offer yet.</div>
                    ) : (
                        making.map((m, i) => {
                            const entry = m as Record<string, unknown>;
                            return rel(String(entry.name || entry.tenant_name || '—'), String(entry.notes || ''), (
                                <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                    <span className={`${styles.pill} ${styles.pillAmber}`}>In progress</span>
                                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onOpenApplication(String(entry.account_id || ''), String(entry.tenant_name || entry.name || ''), 'making')}>Adjust Offer</button>
                                </span>
                            ), i);
                        })
                    )}
                </div>
            </div>
        ),
        offersin: (
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>Offers In</h3><span className={`${styles.hint} ${styles.cardHeadSp}`}>bid submitted</span></div>
                <div className={styles.cardBody} style={{ padding: '6px 18px 10px' }}>
                    {offersIn.length === 0 ? (
                        <div className={styles.empty}>No offers submitted yet.</div>
                    ) : offersIn.map((o, i) => {
                        const meta = [
                            o.bid_amount ? `Bid €${o.bid_amount}` : null,
                            o.submitted_at ? `came in ${new Date(o.submitted_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : null,
                            o.start_date ? `start ${o.start_date}` : null,
                            o.motivation ? `· ${o.motivation}` : null,
                        ].filter(Boolean).join(' · ');
                        return rel(o.tenant_name || '—', meta, (
                            <span style={{ display: 'flex', gap: 6 }}>
                                <button className={`${styles.btn} ${styles.btnSm}`} disabled={sendLoading === o.account_id} onClick={() => sendOffer(o.account_id, o.tenant_name || '—')} title="Move this offer to Offers Out so you can mark Deal / No Deal">
                                    {sendLoading === o.account_id ? '…' : 'Send offer'}
                                </button>
                                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onOpenApplication(o.account_id, o.tenant_name || '—', 'offersin')}>Adjust Offer</button>
                                <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} disabled={offerLoading === o.account_id} onClick={() => generateOffer(o.account_id, o.tenant_name || '—')} title="Fire n8n webhook — drafts offer email for the agent to review">
                                    {offerLoading === o.account_id ? '…' : 'Generate offer'}
                                </button>
                            </span>
                        ), i);
                    })}
                </div>
            </div>
        ),
        offersout: (
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>Offers Out</h3><span className={`${styles.hint} ${styles.cardHeadSp}`}>offer sent · mark deal / no deal</span></div>
                <div className={styles.cardBody} style={{ padding: '6px 18px 10px' }}>
                    {offersOut.length === 0 ? (
                        <div className={styles.empty}>No offers sent out yet.</div>
                    ) : offersOut.map((o, i) => {
                        const name = o.tenant_name || o.name || '—';
                        const status = String(o.status || '').toUpperCase().trim();
                        const meta = [
                            o.sent_at ? `Sent ${new Date(o.sent_at).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}` : null,
                            o.offer_type || null,
                            o.bid_amount ? `bid €${o.bid_amount}` : null,
                            o.start_date ? `start ${o.start_date}` : null,
                            status === 'DEAL_ACCEPTED' ? '· accepted' : status === 'OFFER_DECLINED' ? '· declined' : '· awaiting',
                        ].filter(Boolean).join(' · ');

                        const isDone = status === 'DEAL_ACCEPTED' || status === 'OFFER_DECLINED';
                        const rightPill = isDone
                            ? <span className={`${styles.pill} ${status === 'DEAL_ACCEPTED' ? styles.pillGreen : styles.pillRed}`}>{status === 'DEAL_ACCEPTED' ? 'Deal won' : 'Declined'}</span>
                            : (
                                <span style={{ display: 'flex', gap: 5 }}>
                                    <button className={`${styles.btn} ${styles.btnSm}`} onClick={() => onModal({ type: 'deal', aptId: aptId, accountId: o.account_id || '', rentPrice: apt.rental_price })}>Deal</button>
                                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} disabled={noDealLoading === (o.account_id || '')} onClick={() => noDeal(o.account_id || '', name)}>
                                        {noDealLoading === (o.account_id || '') ? '…' : 'No deal'}
                                    </button>
                                </span>
                            );

                        return rel(name, meta, rightPill, i);
                    })}
                </div>
            </div>
        ),
    };

    const deposit = apt.rental_price ? apt.rental_price * 2 : null;

    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <button className={styles.backLink} onClick={onBack}>‹ Apartments</button>
            </div>
            <div className={styles.recHead}>
                <div className={styles.recHeadIco}>▤</div>
                <div>
                    <div className={styles.recHeadT}>Apartment</div>
                    <div className={styles.recHeadH}>{address}</div>
                    <div className={styles.hint}>{viewingDate ? `Viewing · ${new Date(viewingDate).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` : 'No viewing date set'}</div>
                </div>
                <div className={styles.recHeadActs}>
                    {(() => {
                        const slots = Array.isArray(apt.slot_dates) ? apt.slot_dates as Array<Record<string, unknown>> : [];
                        const hasLinks = apt.event_link || (slots.length > 0 && slots.some((s) => s?.eventlink)) || (apt.eventlink_video as string | null) || (slots.length > 0 && slots.some((s) => s?.eventlink_video));
                        return !hasLinks ? (
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => onModal({ type: 'meetingLinks', aptId: aptId })}>Generate Meeting Links</button>
                        ) : null;
                    })()}
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={copyViewingLink}>Copy viewing link</button>
                    <button className={`${styles.btn} ${styles.btnOrange}`} onClick={() => onModal({ type: 'sendSegment', aptId, rentalPrice: apt?.rental_price ?? null, bedrooms: apt?.bedrooms ?? null })}>Send via WhatsApp</button>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => onModal({ type: 'reschedule' })}>Reschedule</button>
                    {isAdmin && (
                        <button
                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                            onClick={closeListing}
                            disabled={closing || apt?.status === 'Closed'}
                            title={apt?.status === 'Closed' ? 'Already closed' : 'Tear down Cal.com links and mark as closed'}
                        >
                            {closing ? 'Closing…' : 'Close listing'}
                        </button>
                    )}
                </div>
            </div>

            {/* Meeting Links card — shown after Generate Meeting Links has run */}
            {(() => {
                const slots = Array.isArray(apt.slot_dates) ? apt.slot_dates as Array<Record<string, unknown>> : [];
                const latestSlot = slots.length > 0 ? slots[slots.length - 1] : null;
                const inPersonLink = apt.event_link || (latestSlot?.eventlink as string) || null;
                const videoLink = (apt.eventlink_video as string | null) || (latestSlot?.eventlink_video as string) || null;
                if (!inPersonLink && !videoLink) return null;
                const copyLink = (url: string, label: string) => {
                    navigator.clipboard.writeText(url).then(() => onToast(`${label} link copied`)).catch(() => onToast('Could not copy — copy manually'));
                };
                return (
                    <div className={styles.card} style={{ marginBottom: 10 }}>
                        <div className={styles.cardHead}><h3>Meeting Links</h3></div>
                        <div className={styles.cardBody}>
                            {inPersonLink && (
                                <div className={styles.fieldRow}>
                                    <div className={styles.fieldLab}>In-Person</div>
                                    <div className={styles.fieldVal} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <a href={inPersonLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>{inPersonLink}</a>
                                    </div>
                                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => copyLink(inPersonLink, 'In-person')}>Copy</button>
                                </div>
                            )}
                            {videoLink && (
                                <div className={styles.fieldRow}>
                                    <div className={styles.fieldLab}>Facetime (Virtual)</div>
                                    <div className={styles.fieldVal} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <a href={videoLink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>{videoLink}</a>
                                    </div>
                                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => copyLink(videoLink, 'Video')}>Copy</button>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            <div className={styles.subtabs}>
                {([
                    ['scheduled', 'Viewing Scheduled', scheduled.length],
                    ['canceled', 'Viewing Canceled', canceled.length + rescheduled.length],
                    ['making', 'People Making an Offer', making.length],
                    ['offersin', 'Offers In', offersIn.length],
                    ['offersout', 'Offers Out', offersOut.length],
                ] as const).map(([id, label, count]) => (
                    <button
                        key={id}
                        className={`${styles.subtab} ${subtab === id ? styles.subtabActive : ''}`}
                        onClick={() => setSubtab(id)}
                    >
                        {label}
                        <span className={`${styles.pill} ${id === 'canceled' ? styles.pillRed : id === 'making' ? styles.pillAmber : id === 'offersin' ? styles.pillGreen : id === 'offersout' ? styles.pillTeal : styles.pillGrey}`}>{count}</span>
                    </button>
                ))}
            </div>

            {sections[subtab]}

            {/* Information card */}
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>Information</h3></div>
                <div className={styles.fields}>
                    <div>
                        {field('Apartment Name', address)}
                        {field('Square Meters', apt.square_meters ? String(apt.square_meters) : '—')}
                        {field('Rental Price', apt.rental_price ? `€${apt.rental_price}` : '—')}
                        {field('Deposit', deposit ? `€${deposit}` : '—')}
                        {field('Bedrooms', apt.bedrooms || '—')}
                        {field('Neighborhood', apt.area ? `${apt.area} (auto)` : '—')}
                    </div>
                    <div>
                        {field('City', apt.area || '—')}
                        {field('Zip Code', apt.zip_code || '—')}
                        {field('Realtor', '—')}
                        {field('Status', <span className={`${styles.pill} ${styles.pillTeal}`}>{apt.status || '—'}</span>)}
                        {field('Viewing date', viewingDate ? new Date(viewingDate).toLocaleString('nl-NL') : '—')}
                        {field('Viewing ends', viewingEnd ? new Date(viewingEnd).toLocaleString('nl-NL') : '—')}
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHead}>
                    <h3>Apartment Brochure (PDF)</h3>
                    <span className={styles.hint}>shared via pdf_apartment_utility</span>
                </div>
                <div className={styles.cardBody}>
                    {pdf ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ flex: 1, fontSize: 13.5 }}>📄 {pdf.name}</span>
                            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={viewPdf}>View</button>
                            <label className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} style={{ cursor: 'pointer' }}>
                                Replace
                                <input type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); }} disabled={pdfLoading} />
                            </label>
                        </div>
                    ) : (
                        <div
                            className={styles.drop}
                            style={{ cursor: pdfLoading ? 'wait' : 'pointer' }}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--teal)'; }}
                            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.borderColor = 'var(--line)';
                                const f = e.dataTransfer.files?.[0];
                                if (f) uploadPdf(f);
                            }}
                            onClick={() => document.getElementById(`pdf-input-${aptId}`)?.click()}
                        >
                            <b>{pdfLoading ? 'Uploading…' : 'Upload Files'}</b> — one PDF with extra info
                            <span style={{ marginLeft: 'auto', color: '#bbb' }}>max 20 MB</span>
                            <input
                                id={`pdf-input-${aptId}`}
                                type="file"
                                accept="application/pdf"
                                hidden
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPdf(f); }}
                                disabled={pdfLoading}
                            />
                        </div>
                    )}
                    <div className={styles.hint} style={{ marginTop: 8 }}>One PDF · max 20 MB. Stored in Supabase Storage.</div>
                </div>
            </div>
        </>
    );
}

function field(label: string, value: React.ReactNode) {
    return (
        <div className={styles.fieldRow}>
            <div className={styles.fieldLab}>{label}</div>
            <div className={styles.fieldVal}>{value}</div>
        </div>
    );
}

// ============================================================
// Create Apartment — one-flow page
// Steps: 1) Fill fields → 2) Generate Meeting Links (auto-saves apt) → 3) Upload PDF → 4) Save → record view
// ============================================================
export function CreateApartmentView({ onBack, onToast, onCreated, realEstateAgents, crmUsers }: {
    onBack: () => void;
    onToast: ToastFn;
    onCreated: (aptId: string) => void;
    realEstateAgents: RealEstateAgent[];
    crmUsers: CrmUserOption[];
}) {
    const [form, setForm] = useState({
        name: '',
        city: '',
        rentalPrice: '',
        deposit: '',
        bedrooms: '',
        squareMeters: '',
        zipCode: '',
        additionalNotes: '',
        realEstateAgentId: '',
        assignedCrmUserId: '',
    });
    const [pdokStatus, setPdokStatus] = useState<'idle' | 'searching' | 'found' | 'notfound'>('idle');
    const [saving, setSaving] = useState(false);

    // Step 2: viewing + meeting links
    const [viewingStart, setViewingStart] = useState('');
    const [duration, setDuration] = useState('30'); // total viewing window in minutes
    const [slotLength, setSlotLength] = useState('5'); // per-booking slot length
    const [generatingLinks, setGeneratingLinks] = useState(false);
    const [links, setLinks] = useState<{ eventlink?: string | null; eventlinkVideo?: string | null } | null>(null);
    const [aptId, setAptId] = useState<string | null>(null);

    // Step 3: PDF
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUploading, setPdfUploading] = useState(false);
    const [pdfUploaded, setPdfUploaded] = useState(false);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((s) => ({ ...s, [k]: e.target.value }));
        if (k === 'rentalPrice') {
            const rent = parseFloat(e.target.value) || 0;
            setForm((s) => ({ ...s, rentalPrice: e.target.value, deposit: String(rent * 2) }));
        }
    };

    const setVal = (k: keyof typeof form) => (v: string) => setForm((s) => ({ ...s, [k]: v }));

    async function pdokLookup() {
        if (!form.name.trim() || form.name.trim().length < 5) return;
        setPdokStatus('searching');
        try {
            const res = await fetch('/api/admin/crm/pdok-lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ query: form.name }),
            });
            const data = await res.json();
            if (data.success && data.found) {
                setForm((s) => ({
                    ...s,
                    zipCode: data.address.postcode || s.zipCode,
                    squareMeters: data.building.oppervlakte ? String(data.building.oppervlakte) : s.squareMeters,
                    city: data.address.woonplaats || s.city,
                }));
                setPdokStatus('found');
            } else {
                setPdokStatus('notfound');
            }
        } catch {
            setPdokStatus('notfound');
        }
    }

    // Creates the apartment if not yet saved, returns the apt ID
    async function ensureSaved(): Promise<string | null> {
        if (aptId) return aptId;
        if (!form.name.trim()) { onToast('Apartment name / address is required'); return null; }
        setSaving(true);
        try {
            const res = await fetch('/api/admin/crm/apartment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({
                    name: form.name,
                    area: form.city,
                    rental_price: form.rentalPrice || null,
                    bedrooms: form.bedrooms || null,
                    square_meters: form.squareMeters || null,
                    zip_code: form.zipCode || null,
                    additional_notes: form.additionalNotes || null,
                    real_estate_agent_id: form.realEstateAgentId || null,
                    assigned_crm_user_id: form.assignedCrmUserId || null,
                    lengthInMins: Number(duration) || null,
                    slotInterval: Number(slotLength) || null,
                    status: 'Null',
                }),
            });
            const data = await res.json();
            if (data.success && data.apartment) {
                setAptId(data.apartment.id);
                return data.apartment.id;
            }
            onToast(data.message || 'Failed to save apartment');
            return null;
        } catch (e) {
            onToast('Failed to save — check console');
            console.error('create apartment error:', e);
            return null;
        } finally {
            setSaving(false);
        }
    }

    // Auto-compute viewing end from start + duration
    const viewingEnd = (() => {
        if (!viewingStart) return '';
        const d = new Date(viewingStart);
        if (isNaN(d.getTime())) return '';
        d.setMinutes(d.getMinutes() + Number(duration) || 0);
        // Format as datetime-local: YYYY-MM-DDTHH:mm
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    })();

    const numSlots = Number(duration) > 0 && Number(slotLength) > 0 ? Math.floor(Number(duration) / Number(slotLength)) : 0;

    async function generateLinks() {
        if (!viewingStart) { onToast('Fill in the viewing date & time'); return; }
        if (!viewingEnd) { onToast('Could not compute end time — check duration'); return; }
        const id = await ensureSaved();
        if (!id) return;
        setGeneratingLinks(true);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${id}/generate-slot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ start: viewingStart, end: viewingEnd, slotLengthMinutes: Number(slotLength) }),
            });
            const data = await res.json();
            if (data.success) {
                setLinks({
                    eventlink: data.slot?.eventlink || null,
                    eventlinkVideo: data.slot?.eventlink_video || null,
                });
                onToast('Meeting links generated');
            } else {
                onToast(data.message || 'Failed to generate links');
            }
        } catch (e) {
            onToast('Failed to generate links — check console');
            console.error('generate-slot error:', e);
        } finally {
            setGeneratingLinks(false);
        }
    }

    async function uploadPdf() {
        if (!pdfFile) return;
        const id = await ensureSaved();
        if (!id) return;
        setPdfUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', pdfFile);
            const res = await fetch(`/api/admin/crm/apartment/${id}/pdf`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: fd,
            });
            const data = await res.json();
            if (data.success) {
                setPdfUploaded(true);
                onToast('Brochure PDF uploaded');
            } else {
                onToast(data.message || 'Upload failed');
            }
        } catch {
            onToast('Upload failed');
        } finally {
            setPdfUploading(false);
        }
    }

    function copyLink(url: string, label: string) {
        navigator.clipboard.writeText(url).then(() => onToast(`${label} link copied`)).catch(() => onToast('Could not copy'));
    }

    async function save() {
        const id = await ensureSaved();
        if (!id) return;
        onToast('Apartment saved');
        onCreated(id);
    }

    const stepDone = (n: number) => {
        if (n === 1) return form.name.trim() !== '';
        if (n === 2) return links !== null;
        if (n === 3) return pdfUploaded;
        return false;
    };

    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <button className={styles.backLink} onClick={onBack}>‹ Apartments</button>
            </div>
            <h2 className={styles.pageTitle}>New apartment</h2>
            <p className={styles.sub}>
                Fill the fields, generate the meeting links, upload the PDF and save.
            </p>

            {/* Status strip */}
            <div className={styles.statusStrip}>
                <div className={`${styles.step} ${stepDone(1) ? styles.stepDone : ''}`}><span className={styles.stepNum}>1</span> Fill in</div>
                <span className={styles.stepArrow}>›</span>
                <div className={`${styles.step} ${stepDone(2) ? styles.stepDone : ''}`}><span className={styles.stepNum}>2</span> Generate Meeting Links</div>
                <span className={styles.stepArrow}>›</span>
                <div className={`${styles.step} ${stepDone(3) ? styles.stepDone : ''}`}><span className={styles.stepNum}>3</span> Upload PDF</div>
                <span className={styles.stepArrow}>›</span>
                <div className={`${styles.step} ${stepDone(4) ? styles.stepDone : ''}`}><span className={styles.stepNum}>4</span> Save</div>
            </div>

            {/* Step 1: Fill in */}
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>1. Fill in</h3>{aptId && <span className={styles.hint} style={{ color: 'var(--teal-d)' }}>✓ Saved</span>}</div>
                <div className={styles.cardBody}>
                    <div className={styles.formRow}>
                        <div>
                            <label className={styles.fLabel}>Apartment Name / Address</label>
                            <input className={styles.inp} placeholder="Govert Flinckstraat 357-H" value={form.name} onChange={set('name')} onBlur={pdokLookup} disabled={!!aptId} />
                            {pdokStatus === 'searching' && <div className={styles.hint}>Looking up address…</div>}
                            {pdokStatus === 'found' && <div className={styles.hint} style={{ color: 'var(--teal-d)' }}>✓ PDOK verified — zip code + m² auto-filled</div>}
                            {pdokStatus === 'notfound' && <div className={styles.hint}>Address not found in PDOK — fill zip code manually</div>}
                        </div>
                        <div>
                            <label className={styles.fLabel}>City</label>
                            <input className={styles.inp} placeholder="Amsterdam" value={form.city} onChange={set('city')} disabled={!!aptId} />
                        </div>
                    </div>
                    <div className={styles.formRow3}>
                        <div>
                            <label className={styles.fLabel}>Rental Price (€)</label>
                            <input className={styles.inp} type="number" placeholder="2600" value={form.rentalPrice} onChange={set('rentalPrice')} disabled={!!aptId} />
                        </div>
                        <div>
                            <label className={styles.fLabel}>Deposit (€)</label>
                            <input className={styles.inp} type="number" placeholder="5200" value={form.deposit} onChange={set('deposit')} disabled={!!aptId} />
                            <div className={styles.hint}>Auto · 2× rent · editable</div>
                        </div>
                        <div>
                            <label className={styles.fLabel}>Bedrooms</label>
                            <input className={styles.inp} type="number" placeholder="1" value={form.bedrooms} onChange={set('bedrooms')} disabled={!!aptId} />
                        </div>
                    </div>
                    <div className={styles.formRow3}>
                        <div>
                            <label className={styles.fLabel}>Square Meters</label>
                            <input className={styles.inp} type="number" placeholder="51" value={form.squareMeters} onChange={set('squareMeters')} disabled={!!aptId} />
                        </div>
                        <div>
                            <label className={styles.fLabel}>Zip Code</label>
                            <input className={styles.inp} placeholder="1074 CD" value={form.zipCode} onChange={set('zipCode')} disabled={!!aptId} />
                            {pdokStatus === 'found' && <div className={styles.hint} style={{ color: 'var(--teal-d)' }}>PDOK auto-filled</div>}
                        </div>
                        <div>
                            <label className={styles.fLabel}>Additional Notes</label>
                            <input className={styles.inp} value={form.additionalNotes} onChange={set('additionalNotes')} disabled={!!aptId} />
                        </div>
                    </div>
                    <div className={styles.formRow}>
                        <div>
                            <label className={styles.fLabel}>Collaboration (realtor)</label>
                            <select className={styles.inp} value={form.realEstateAgentId} onChange={(e) => setVal('realEstateAgentId')(e.target.value)} disabled={!!aptId}>
                                <option value="">None</option>
                                {realEstateAgents.map((r) => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <div className={styles.hint}>Select one, or add a new realtor via Collaborations tab.</div>
                        </div>
                        <div>
                            <label className={styles.fLabel}>Agent</label>
                            <select className={styles.inp} value={form.assignedCrmUserId} onChange={(e) => setVal('assignedCrmUserId')(e.target.value)} disabled={!!aptId}>
                                <option value="">—</option>
                                {crmUsers.map((u) => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                            <div className={styles.hint}>Internal team member assigned to this apartment.</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 2: Viewing + Meeting Links */}
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>2. Viewing Date & Meeting Links</h3>{links && <span className={styles.hint} style={{ color: 'var(--teal-d)' }}>✓ Links generated</span>}</div>
                <div className={styles.cardBody}>
                    <div className={styles.formRow}>
                        <div>
                            <label className={styles.fLabel}>Viewing date & time</label>
                            <input className={styles.inp} type="datetime-local" value={viewingStart} onChange={(e) => setViewingStart(e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.fLabel}>Duration (min)</label>
                            <select className={styles.inp} value={duration} onChange={(e) => setDuration(e.target.value)}>
                                <option value="30">30</option>
                                <option value="20">20</option>
                                <option value="45">45</option>
                                <option value="60">60</option>
                            </select>
                        </div>
                    </div>
                    <div className={styles.formRow3}>
                        <div>
                            <label className={styles.fLabel}>Slot Duration (min)</label>
                            <select className={styles.inp} value={slotLength} onChange={(e) => setSlotLength(e.target.value)}>
                                <option value="5">5</option>
                                <option value="10">10</option>
                            </select>
                            <div className={styles.hint}>Per-booking slot length sent to Cal.com</div>
                        </div>
                        <div>
                            <label className={styles.fLabel}>No. of slots</label>
                            <input className={styles.inp} value={numSlots > 0 ? String(numSlots) : '—'} readOnly style={{ color: 'var(--muted)' }} />
                            <div className={styles.hint}>Auto · duration ÷ slot duration</div>
                        </div>
                        <div>
                            <label className={styles.fLabel}>Viewing ends</label>
                            <input className={styles.inp} value={viewingEnd || '—'} readOnly style={{ color: 'var(--muted)' }} />
                            <div className={styles.hint}>Auto · start + duration</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                        <button className={`${styles.btn} ${styles.btnGhost}`} disabled={generatingLinks || saving} onClick={generateLinks}>
                            {generatingLinks ? 'Generating…' : saving ? 'Saving apartment…' : 'Generate Meeting Links'}
                        </button>
                    </div>
                    {links && (
                        <div style={{ marginTop: 12 }}>
                            {links.eventlink && (
                                <div className={styles.fieldRow}>
                                    <div className={styles.fieldLab}>In-Person</div>
                                    <div className={styles.fieldVal} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <a href={links.eventlink} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>{links.eventlink}</a>
                                    </div>
                                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => copyLink(links.eventlink!, 'In-person')}>Copy</button>
                                </div>
                            )}
                            {links.eventlinkVideo && (
                                <div className={styles.fieldRow}>
                                    <div className={styles.fieldLab}>Facetime (Virtual)</div>
                                    <div className={styles.fieldVal} style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <a href={links.eventlinkVideo} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>{links.eventlinkVideo}</a>
                                    </div>
                                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => copyLink(links.eventlinkVideo!, 'Video')}>Copy</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Step 3: Brochure PDF */}
            <div className={styles.card}>
                <div className={styles.cardHead}><h3>3. Brochure PDF</h3>{pdfUploaded && <span className={styles.hint} style={{ color: 'var(--teal-d)' }}>✓ Uploaded</span>}</div>
                <div className={styles.cardBody}>
                    {pdfUploaded ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ flex: 1, fontSize: 13.5 }}>📄 {pdfFile?.name || 'Brochure PDF'}</span>
                            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={() => { setPdfUploaded(false); setPdfFile(null); }}>Replace</button>
                        </div>
                    ) : (
                        <div
                            className={styles.drop}
                            style={{ cursor: pdfUploading ? 'wait' : 'pointer' }}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--teal)'; }}
                            onDragLeave={(e) => { e.currentTarget.style.borderColor = 'var(--line)'; }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.style.borderColor = 'var(--line)';
                                const f = e.dataTransfer.files?.[0];
                                if (f) { setPdfFile(f); }
                            }}
                            onClick={() => document.getElementById('create-pdf-input')?.click()}
                        >
                            <b>{pdfUploading ? 'Uploading…' : 'Upload Files'}</b> — one PDF with extra info
                            <span style={{ marginLeft: 'auto', color: '#bbb' }}>max 20 MB</span>
                            <input
                                id="create-pdf-input"
                                type="file"
                                accept="application/pdf"
                                hidden
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) setPdfFile(f); }}
                            />
                        </div>
                    )}
                    {pdfFile && !pdfUploaded && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                            <span style={{ flex: 1, fontSize: 13.5 }}>📄 {pdfFile.name}</span>
                            <button className={styles.btn} disabled={pdfUploading} onClick={uploadPdf}>
                                {pdfUploading ? 'Uploading…' : 'Upload PDF'}
                            </button>
                        </div>
                    )}
                    <div className={styles.hint} style={{ marginTop: 8 }}>One PDF · max 20 MB. Stored in Supabase Storage.</div>
                </div>
            </div>

            {/* Step 4: Save */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button className={styles.btn} disabled={saving || generatingLinks} onClick={save}>
                    {saving ? 'Saving…' : aptId ? 'Save' : 'Save'}
                </button>
            </div>
        </>
    );
}

// ============================================================
// Application Detail — stub with mock per-person data
// TODO: Phase 3 — wire to /api/admin/crm/application/[id]
// ============================================================
export function ApplicationDetailView({ name, accountId, apartmentId, from, onBack, onToast, onModal }: {
    name: string;
    accountId: string;
    apartmentId: string;
    from: 'scheduled' | 'canceled' | 'making' | 'offersin' | 'offersout';
    onBack: () => void;
    onToast: ToastFn;
    onModal: ModalFn;
}) {
    const [editing, setEditing] = useState(false);
    const [offerLoading, setOfferLoading] = useState(false);
    const [sendLoading, setSendLoading] = useState(false);
    const [removingId, setRemovingId] = useState<string | null>(null);
    const [app, setApp] = useState<ApplicationDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const fromLabel: Record<string, string> = { making: 'People Making an Offer', offersin: 'Offers In', offersout: 'Offers Out' };

    const loadApp = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/admin/crm/application/${accountId}`, {
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
            });
            const data: ApplicationResponse = await res.json();
            if (data.success && data.account) {
                setApp(data.account);
            } else {
                setError(data.message || 'Failed to load application');
            }
        } catch (e) {
            setError('Failed to load application');
            console.error('ApplicationDetailView fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, [accountId]);

    useEffect(() => {
        loadApp();
    }, [loadApp]);

    async function generateOffer(offerType: 'normal' | 'hausing' | 'grand') {
        if (!apartmentId) { onToast('No apartment selected'); return; }
        const tenantPhone = app?.whatsapp_number || '';
        if (!tenantPhone) { onToast('No tenant phone found for this application'); return; }
        setOfferLoading(true);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${apartmentId}/generate-offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ tenant_phone: tenantPhone }),
            });
            const data = await res.json();
            if (data.success) {
                onToast(`${offerType === 'normal' ? 'Normal' : offerType === 'hausing' ? 'Hausing' : 'Grand relocation'} offer triggered — n8n is drafting`);
            } else {
                onToast(data.message || 'Generate offer failed');
            }
        } catch (e) {
            onToast('Generate offer failed — check console');
            console.error('generate-offer error:', e);
        } finally {
            setOfferLoading(false);
        }
    }

    // Send offer — moves this application's offer from offers_in to offers_sent
    // on the apartment. Mirrors the sendOffer() helper in ApartmentRecordView
    // but driven from the Application Detail view. After a successful send,
    // navigate back via onBack() so the user lands on the apartment's Offers
    // Out subtab showing their freshly-sent offer. See
    // /api/admin/crm/apartment/[id]/send-offer/route.js.
    async function sendOffer() {
        if (!apartmentId || !accountId) { onToast('No apartment or account selected'); return; }
        const tenantName = app?.tenant_name || name || 'this tenant';
        if (!confirm(`Send ${tenantName}'s offer to Offers Out?\n\nThis moves the offer to the next pipeline stage. You'll be taken back to the apartment record where you can mark Deal / No Deal.`)) return;
        setSendLoading(true);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${apartmentId}/send-offer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ account_id: accountId }),
            });
            const data = await res.json();
            if (data.success) {
                onToast(data.already_sent
                    ? `${tenantName}'s offer was already in Offers Out`
                    : `Offer from ${tenantName} sent to Offers Out`);
                onBack();
            } else {
                onToast(data.message || 'Failed to send offer');
            }
        } catch (e) {
            onToast('Failed to send offer — check console');
            console.error('send-offer error:', e);
        } finally {
            setSendLoading(false);
        }
    }

    async function removePerson(personId: string, personName: string) {
        if (!confirm(`Remove ${personName} from this dossier?\n\nThis will delete their documents and cannot be undone.`)) return;
        setRemovingId(personId);
        try {
            const res = await fetch(`/api/admin/crm/person/${personId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
            });
            const data = await res.json();
            if (data.success) {
                onToast(`${personName} removed from dossier`);
                loadApp();
            } else {
                onToast(data.message || 'Failed to remove person');
            }
        } catch (e) {
            onToast('Failed to remove person — check console');
            console.error('remove-person error:', e);
        } finally {
            setRemovingId(null);
        }
    }

    // Trigger a browser download of the ZIP for this application. Pass
    // ?personId=... to restrict to one person's documents. Uses fetch() so
    // we can attach the Bearer token from sessionStorage — window.location.href
    // can't set headers, and the route is gated by requirePermission.
    async function downloadZip(personId?: string) {
        if (!accountId) { onToast('No account'); return; }
        const params = new URLSearchParams();
        if (apartmentId) params.set('apartmentId', apartmentId);
        if (personId) params.set('personId', personId);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const token = sessionStorage.getItem('crm_token');
        try {
            const res = await fetch(`/api/admin/crm/application/${accountId}/zip${qs}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.message || `HTTP ${res.status}`);
            }
            const blob = await res.blob();
            const cd = res.headers.get('Content-Disposition') || '';
            const m = cd.match(/filename="([^"]+)"/);
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = m ? m[1] : `application-${accountId.slice(0, 8)}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(a.href);
        } catch (e) {
            onToast(`ZIP failed: ${e instanceof Error ? e.message : String(e)}`);
            console.error('[ApplicationDetailView] zip download error:', e);
        }
    }

    if (loading) {
        return (
            <>
                <div style={{ marginBottom: 10 }}>
                    <button className={styles.backLink} onClick={onBack}>‹ Back to {fromLabel[from] || 'list'}</button>
                </div>
                <div className={styles.loading}>Loading application…</div>
            </>
        );
    }

    if (error || !app) {
        return (
            <>
                <div style={{ marginBottom: 10 }}>
                    <button className={styles.backLink} onClick={onBack}>‹ Back to {fromLabel[from] || 'list'}</button>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardBody}>
                        <p style={{ color: 'var(--red)' }}>{error || 'Application not found'}</p>
                        <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} onClick={loadApp}>Retry</button>
                    </div>
                </div>
            </>
        );
    }

    // Build person groups from real personen data
    const personen = app.personen || [];
    const mainTenant = personen.find((p) => p.rol === 'Hoofdhuurder' || p.type === 'tenant');
    const coTenants = personen.filter((p) => p.rol === 'Medehuurder' || p.type === 'co_tenant');
    const guarantors = personen.filter((p) => p.rol === 'Garantsteller' || p.type === 'guarantor');

    // Map documents to per-person arrays
    const docsByPerson = new Map<string, DocumentEntry[]>();
    for (const d of app.documents || []) {
        // Find the person this doc belongs to by matching person name
        const person = personen.find((p) => {
            const pn = [p.voornaam, p.achternaam].filter(Boolean).join(' ').trim() || p.naam || '';
            return pn === d.person;
        });
        const pid = person?.id || '_unknown';
        if (!docsByPerson.has(pid)) docsByPerson.set(pid, []);
        docsByPerson.get(pid)!.push(d);
    }

    // Check if any docs are missing. The banner must match what the per-person
    // rows actually render: personDocsSection falls back to placeholder docs
    // (status 'ontbreekt') whenever docsForPerson(pid) is empty. So we mirror
    // that logic here — any group that will render "Missing" pills must force
    // amber, otherwise the green "All required documents are in" banner lies.
    const realDocMissing = (app.documents || []).some((d) => d.status === 'ontbreekt' || d.status === 'pending');
    // A group is "missing" if docsForPerson(pid) is empty (placeholders render)
    // OR any real doc for that pid is flagged ontbreekt/pending. Mirrors
    // personDocsSection(pid, fallbackDocs) exactly.
    const groupMissing = (pid: string | undefined): boolean => {
        const realDocs = docsForPerson(pid);
        if (realDocs.length === 0) return true;
        return realDocs.some((d) => d.status === 'ontbreekt' || d.status === 'pending');
    };
    // Main tenant group is rendered if either mainTenant exists OR app.tenant_name
    // provides a fallback name. Co-tenant / guarantor groups only render if their
    // personen entry exists. Bid & contract group is generated downstream, excluded.
    const mainTenantRendered = !!mainTenant || !!app.tenant_name;
    const mainTenantMissing = mainTenantRendered && groupMissing(mainTenant?.id);
    const coTenantMissing = coTenants.some((p) => groupMissing(p.id));
    const guarantorMissing = guarantors.some((p) => groupMissing(p.id));
    const hasMissing = realDocMissing || mainTenantMissing || coTenantMissing || guarantorMissing;
    const showAmber = from === 'making' || hasMissing;

    // Bid details
    const bid = app.bid;
    const bidFields: [string, string][] = bid
        ? [
            ['Offered rent (€)', String(bid.amount || '')],
            ['Deposit (€)', String(bid.deposit || '')],
            ['Start date', bid.start_date || '—'],
            ['Total income (€/mo)', app.monthly_income ? String(app.monthly_income) : '—'],
            ['Candidate type', app.work_status || '—'],
        ]
        : [
            ['Total income (€/mo)', app.monthly_income ? String(app.monthly_income) : '—'],
            ['Candidate type', app.work_status || '—'],
            ['Move-in date', app.move_in_date || '—'],
        ];

    function personFields(p: PersoonEntry | undefined, isMain: boolean): [string, string][] {
        if (!p) return [];
        const fields: [string, string][] = [];
        if (isMain && app) {
            if (app.work_status) fields.push(['Work status', app.work_status]);
            if (app.monthly_income) fields.push(['Income (€/mo)', String(app.monthly_income)]);
            if (app.nationality) fields.push(['Nationality', app.nationality]);
            if (app.current_address) fields.push(['Current address', app.current_address]);
        }
        if (p.telefoon) fields.push(['Phone', p.telefoon]);
        return fields;
    }

    function docsForPerson(pid: string | undefined): { name: string; status: string; url: string | null }[] {
        if (!pid) return [];
        const docs = docsByPerson.get(pid) || [];
        return docs.map((d) => ({
            name: d.file_name || d.type || 'Document',
            status: d.status,
            url: d.url,
        }));
    }

    function personDocsSection(pid: string | undefined, fallbackDocs: string[]): { name: string; status: string; url: string | null }[] {
        const realDocs = docsForPerson(pid);
        if (realDocs.length > 0) return realDocs;
        // Fallback to placeholder doc names if no real docs exist
        return fallbackDocs.map((name) => ({ name, status: 'ontbreekt', url: null }));
    }

    const mainTenantName = mainTenant
        ? [mainTenant.voornaam, mainTenant.achternaam].filter(Boolean).join(' ').trim() || mainTenant.naam || 'Main Tenant'
        : app.tenant_name || 'Main Tenant';

    return (
        <>
            <div style={{ marginBottom: 10 }}>
                <button className={styles.backLink} onClick={onBack}>‹ Back to {fromLabel[from] || 'list'}</button>
            </div>
            <div className={styles.card}>
                <div className={styles.cardHead}>
                    <h3>Application · {name}</h3>
                    <span className={styles.ref}>{app.whatsapp_number || '—'} · dossier {app.dossierId ? app.dossierId.slice(0, 8) : '—'}</span>
                    <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} style={{ marginLeft: 'auto' }} onClick={() => setEditing(!editing)}>
                        {editing ? '✓ Done' : 'Adjust Offer'}
                    </button>
                </div>
                <div className={styles.cardBody}>
                    <div className={editing ? styles.potEditing : styles.potNotEditing}>
                        <div className={styles.hint} style={{ marginBottom: 10 }}>
                            {app.documentation_status ? `Docs: ${app.documentation_status}` : 'Application details'} · read-only until you click <b>Adjust Offer</b>
                        </div>

                        {showAmber ? (
                            <div style={{ background: 'var(--amber-l)', border: '1px solid #f3dca6', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: '#8a5a12', marginBottom: 14 }}>
                                <span className={`${styles.dot} ${styles.dotAmber}`} />
                                <b>Some required documents are still missing</b> · see the orange "Missing" items per person below.
                            </div>
                        ) : (
                            <div style={{ background: 'var(--green-l)', border: '1px solid #c6ecd3', borderRadius: 9, padding: '9px 12px', fontSize: 12.5, color: '#157a3f', marginBottom: 14 }}>
                                <span className={`${styles.dot} ${styles.dotGreen}`} />
                                <b>All required documents are in.</b>
                            </div>
                        )}

                        {/* Generate offer buttons */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'var(--teal-l)', border: '1px solid #cfe9e5', borderRadius: 10, padding: '10px 13px', marginBottom: 14 }}>
                            <b style={{ fontSize: 13 }}>Generate offer:</b>
                            <button className={`${styles.btn} ${styles.btnSm}`} disabled={offerLoading} onClick={() => generateOffer('normal')}>
                                {offerLoading ? 'Sending…' : 'Normal'}
                            </button>
                            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} disabled={offerLoading} onClick={() => generateOffer('hausing')}>Hausing</button>
                            <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`} disabled={offerLoading} onClick={() => generateOffer('grand')}>Grand relocation</button>
                            <div className={styles.hint} style={{ flexBasis: '100%', marginTop: 4 }}>
                                Writes tenant phone ({app.whatsapp_number || '—'}) to generate_offer → DB trigger fires n8n → AI drafts offer email.
                            </div>
                        </div>

                        {/* Send offer — moves this application's offer from Offers In
                            to Offers Out on the apartment so the Deal / No Deal
                            buttons become reachable. This is the pipeline step the
                            "Generate offer" buttons above do NOT perform —
                            Generate only fires the n8n email-draft webhook. */}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', background: 'var(--green-l)', border: '1px solid #c6ecd3', borderRadius: 10, padding: '10px 13px', marginBottom: 14 }}>
                            <b style={{ fontSize: 13 }}>Send to Offers Out:</b>
                            <button className={`${styles.btn} ${styles.btnSm}`} disabled={sendLoading} onClick={sendOffer} title="Move this offer to the Offers Out subtab so you can mark Deal / No Deal">
                                {sendLoading ? 'Sending…' : 'Send offer'}
                            </button>
                            <div className={styles.hint} style={{ flexBasis: '100%', marginTop: 4 }}>
                                Moves this application's offer from Offers In to Offers Out on the apartment. After sending, you'll be taken back to the apartment record where you can mark Deal / No Deal.
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                            <button
                                className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                                disabled={!accountId}
                                title={!accountId ? 'No account' : 'Download every uploaded document for this application as a ZIP'}
                                onClick={() => downloadZip()}
                            >Download all (ZIP)</button>
                        </div>

                        {/* Bid details */}
                        <div className={styles.grp}>
                            <div className={styles.grpHead}><b>Bid details</b><span className={styles.hint}>{bid ? '· from latest bid' : '· applicant info'}</span></div>
                            <div className={styles.grpBody}>
                                {bidFields.map(([l, v]) => potField(l, v, editing))}
                                {bid && (
                                    <>
                                        <label className={styles.fLabel} style={{ marginTop: 6 }}>Motivation</label>
                                        <textarea className={styles.potFld} readOnly={!editing} defaultValue={bid.motivation} />
                                    </>
                                )}
                                {!bid && app.negotiation_notes && (
                                    <>
                                        <label className={styles.fLabel} style={{ marginTop: 6 }}>Notes</label>
                                        <textarea className={styles.potFld} readOnly={!editing} defaultValue={app.negotiation_notes} />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Bid & contract section */}
                        {personGroup('Bid & contract', 'Bid', 'tenant', [], personDocsSection(undefined, ['Signed Letter of Intent', 'Generated Offer (PDF)']), showAmber)}

                        {/* Main tenant */}
                        {personGroup(mainTenantName, 'Main Tenant', 'tenant',
                            personFields(mainTenant, true),
                            personDocsSection(mainTenant?.id, ['ID Document (passport / ID)', 'Employment contract', 'Salary slips (last 3)']),
                            showAmber,
                            undefined,
                            mainTenant?.id ? () => downloadZip(mainTenant.id) : undefined)}

                        {/* Co-tenants */}
                        {coTenants.map((p) => {
                            const pname = [p.voornaam, p.achternaam].filter(Boolean).join(' ').trim() || p.naam || 'Co-tenant';
                            return personGroup(pname, 'Co-Tenant', 'tenant',
                                personFields(p, false),
                                personDocsSection(p.id, ['ID Document (passport / ID)', 'Annual statements (last 1-2 years)']),
                                showAmber,
                                removingId === p.id ? undefined : () => removePerson(p.id, pname),
                                () => downloadZip(p.id));
                        })}

                        {/* Guarantors */}
                        {guarantors.map((p) => {
                            const pname = [p.voornaam, p.achternaam].filter(Boolean).join(' ').trim() || p.naam || 'Guarantor';
                            return personGroup(pname, 'Guarantor', 'guarantor',
                                personFields(p, false),
                                personDocsSection(p.id, ['ID Document (passport / ID)', 'Employment contract', 'Salary slips (last 3)']),
                                showAmber,
                                removingId === p.id ? undefined : () => removePerson(p.id, pname),
                                () => downloadZip(p.id));
                        })}

                        {/* Linked-account co-tenants not in personen */}
                        {(app.co_tenants || []).filter((ct) => ct.accountId).map((ct) => {
                            return personGroup(ct.name, ct.role || 'Co-tenant', 'tenant',
                                ct.email ? [['Email', ct.email]] : [],
                                personDocsSection(undefined, []),
                                showAmber,
                                undefined);
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

function potField(label: string, value: string, editing: boolean) {
    return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '5px 0' }}>
            <div style={{ width: 150, color: 'var(--muted)', fontSize: 12.5 }}>{label}</div>
            <input className={styles.potFld} readOnly={!editing} defaultValue={value} />
        </div>
    );
}

function personGroup(name: string, role: string, roleClass: 'tenant' | 'guarantor', fields: [string, string][], docs: { name: string; status: string; url: string | null }[], incomplete: boolean, onRemove?: () => void, onZip?: () => void) {
    const canRemove = onRemove && role !== 'Main Tenant' && role !== 'Bid';
    const realDocCount = docs.filter((d) => d.url).length;
    return (
        <div className={styles.grp}>
            <div className={styles.grpHead}>
                <b>{name}</b>
                <span className={`${styles.role} ${roleClass === 'tenant' ? styles.roleTenant : styles.roleGuarantor}`}>{role}</span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {canRemove && (
                        <button
                            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                            style={{ color: 'var(--red)' }}
                            onClick={onRemove}
                            title="Remove this person from the dossier"
                        >
                            Remove
                        </button>
                    )}
                    <button
                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                        disabled={!onZip || realDocCount === 0}
                        title={!onZip
                            ? 'No documents for this person'
                            : realDocCount === 0
                                ? 'No files uploaded yet'
                                : `Download this person's ${realDocCount} document${realDocCount === 1 ? '' : 's'} as ZIP`}
                        onClick={onZip}
                    >ZIP</button>
                </span>
            </div>
            <div className={styles.grpBody}>
                {fields.length > 0 && (
                    <>
                        {fields.map(([l, v]) => potField(l, v, false))}
                        <div className={styles.hint} style={{ margin: '8px 0 4px' }}>Documents</div>
                    </>
                )}
                {docs.map((d, i) => {
                    const isMissing = d.status === 'ontbreekt' || d.status === 'pending';
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0', borderBottom: '1px solid #f1f4f4' }}>
                            <span className={`${styles.dot} ${isMissing ? styles.dotAmber : styles.dotGreen}`} />
                            {d.url ? (
                                <a href={d.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, color: isMissing ? '#8a6f6c' : 'inherit', textDecoration: 'none' }}>{d.name}</a>
                            ) : (
                                <span style={{ flex: 1, fontSize: 13, color: isMissing ? '#8a6f6c' : 'inherit' }}>{d.name}</span>
                            )}
                            {isMissing ? (
                                <span className={`${styles.pill} ${styles.pillAmber}`}>Missing</span>
                            ) : (
                                <span className={`${styles.pill} ${styles.pillGreen}`}>Uploaded</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================================
// Deals — wired to lists.won_deals
// ============================================================
export function DealsView({ wonDeals, onToast, onModal }: {
    wonDeals: WonDeal[];
    onToast: ToastFn;
    onModal: ModalFn;
}) {
    const [sending, setSending] = useState<string | null>(null);

    async function sendInvoice(invoiceId: string) {
        setSending(invoiceId);
        try {
            const res = await fetch(`/api/admin/crm/invoices/${invoiceId}/send`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
            });
            const data = await res.json();
            if (data.success) {
                onToast(data.message || 'Invoice sent');
            } else {
                onToast(data.message || 'Failed to send invoice');
            }
        } catch (e) {
            onToast('Failed to send invoice — check console');
            console.error('send-invoice error:', e);
        } finally {
            setSending(null);
        }
    }

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const dealsThisMonth = wonDeals.filter((d) => {
        if (!d.responded_at) return false;
        const dt = new Date(d.responded_at);
        return dt.getMonth() === thisMonth && dt.getFullYear() === thisYear;
    });

    const earnedThisYear = wonDeals.reduce((sum, d) => {
        if (!d.responded_at) return sum;
        const dt = new Date(d.responded_at);
        if (dt.getFullYear() !== thisYear) return sum;
        return sum + (d.invoice_amount_inc_vat || 0);
    }, 0);

    const awaitingInvoice = wonDeals.filter((d) => !d.invoice_id).length;

    return (
        <>
            <h2 className={styles.pageTitle}>Deals this month <span className={styles.ref}>won</span></h2>
            <p className={styles.sub}>Closed deals this month · added automatically when an offer is marked as a deal.</p>
            <div className={styles.kpis} style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                {kpi(String(dealsThisMonth.length), 'Deals this month', '')}
                {kpi(`€ ${earnedThisYear.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`, 'Earned this year')}
                {kpi(String(awaitingInvoice), 'Awaiting invoice')}
            </div>
            <div className={styles.card}>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                    {wonDeals.length === 0 ? (
                        <div className={styles.empty}>No deals won yet. When you mark an offer as a deal from the apartment record, it appears here.</div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Apartment</th><th>Tenant</th><th>Closed by</th><th>Rent</th><th>Contractual start</th><th>Invoice</th></tr>
                            </thead>
                            <tbody>
                                {wonDeals.map((d, i) => (
                                    <tr key={`${d.apartment_id}-${d.account_id}-${i}`}>
                                        <td><b>{d.apartment_address}</b></td>
                                        <td>{d.tenant_name}</td>
                                        <td>{d.closer_name}</td>
                                        <td>{d.rent_price ? `€${d.rent_price}` : '—'}</td>
                                        <td>{d.contract_start_date ? new Date(d.contract_start_date).toLocaleDateString('nl-NL') : '—'}</td>
                                        <td>
                                            {!d.invoice_id ? (
                                                <span className={`${styles.pill} ${styles.pillGrey}`}>No invoice</span>
                                            ) : d.invoice_status === 'draft' ? (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                                                        onClick={() => onModal({ type: 'editInvoice', invoiceId: d.invoice_id! })}
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        className={`${styles.btn} ${styles.btnOrange} ${styles.btnSm}`}
                                                        disabled={sending === d.invoice_id}
                                                        onClick={() => sendInvoice(d.invoice_id!)}
                                                    >
                                                        {sending === d.invoice_id ? 'Sending…' : 'Send invoice'}
                                                    </button>
                                                </div>
                                            ) : d.invoice_status === 'sent' ? (
                                                <span className={`${styles.pill} ${styles.pillGreen}`}>Sent</span>
                                            ) : d.invoice_status === 'paid' ? (
                                                <span className={`${styles.pill} ${styles.pillGreen}`}>Paid</span>
                                            ) : (
                                                <span className={`${styles.pill} ${styles.pillGrey}`}>{d.invoice_status}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: 12 }}>
                        Invoice = branded PDF (attached) + email sent via Resend from finance@apartmenthub.nl. Click Edit to fill in recipient city/country before sending — these aren&apos;t captured anywhere upstream.
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================
// Candidates — wired to lists.candidates
// ============================================================
export function CandidatesView({ candidates }: { candidates: Candidate[] }) {
    return (
        <>
            <h2 className={styles.pageTitle}>Candidates <span className={styles.ref}>booked a viewing</span></h2>
            <p className={styles.sub}>
                Candidates are the people who have <b>scheduled a viewing</b>. Each account: phone + name from Zoko,
                then completed with email + all /aanvraag info, tags/segments, viewed apartments and a one-click chat link.
            </p>
            <div className={styles.card}>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                    {candidates.length === 0 ? (
                        <div className={styles.empty}>No candidates yet.</div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th></th></tr>
                            </thead>
                            <tbody>
                                {candidates.map((c) => (
                                    <tr key={c.id}>
                                        <td><a style={{ color: 'var(--teal)', fontWeight: 600 }}>{c.tenant_name || '—'}</a></td>
                                        <td>{c.whatsapp_number || '—'}</td>
                                        <td>{c.email || '—'}</td>
                                        <td><span className={`${styles.pill} ${styles.pillGrey}`}>{c.status || '—'}</span></td>
                                        <td><button className={styles.chat}>Open chat</button></td>
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

// ============================================================
// Marketing — stub
// TODO: Phase 5 — wire to Zoko leads
// ============================================================
export function MarketingView() {
    return (
        <>
            <h2 className={styles.pageTitle}>Marketing <span className={styles.ref}>all leads in Zoko</span></h2>
            <p className={styles.sub}>
                Everyone in the system · created from the first WhatsApp message (Zoko). This is the marketing audience;
                <b>Candidates</b> are the subset who booked a viewing. From here you reach people through segment broadcasts.
            </p>
            <div className={styles.card}>
                <div className={styles.cardHead}>
                    <h3>Leads in Zoko</h3>
                    <span className={`${styles.hint} ${styles.cardHeadSp}`}>TODO: Phase 5 — wire to Zoko API</span>
                </div>
                <div className={styles.cardBody}>
                    <div className={styles.empty}>Lead data will appear here once wired to the Zoko API (Phase 5).</div>
                </div>
            </div>
        </>
    );
}

// ============================================================
// SEO — full stub
// ============================================================
export function SeoView() {
    return (
        <>
            <h2 className={styles.pageTitle}>SEO <span className={styles.ref}>rentals website</span></h2>
            <p className={styles.sub}>Search rankings, tracked keywords and pages for the rentals website. Placeholder for now · wired up by the developer later.</p>
            <div className={styles.grid2Wide}>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Tracked keywords</h3></div>
                    <div className={styles.cardBody} style={{ padding: 0 }}>
                        <table className={styles.table}>
                            <thead><tr><th>Keyword</th><th>Position</th><th>Trend (30d)</th></tr></thead>
                            <tbody>
                                <tr><td>huurwoning amsterdam</td><td>4</td><td><span className={`${styles.pill} ${styles.pillGreen}`}>+2</span></td></tr>
                                <tr><td>apartment for rent amsterdam</td><td>7</td><td><span className={`${styles.pill} ${styles.pillGrey}`}>0</span></td></tr>
                                <tr><td>woning huren de pijp</td><td>11</td><td><span className={`${styles.pill} ${styles.pillGreen}`}>+5</span></td></tr>
                                <tr><td>2 bedroom apartment amsterdam</td><td>14</td><td><span className={`${styles.pill} ${styles.pillRed}`}>-3</span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Overview</h3></div>
                    <div className={styles.cardBody}>
                        {field('Indexed pages', '128')}
                        {field('Organic clicks (30d)', '3.420')}
                        {field('Avg. position', '9.2')}
                        {field('Top page', '/nl/appartementen')}
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================
// Agents — wired to lists.agents
// ============================================================
export function AgentsView({ agents }: { agents: CrmAgent[] }) {
    return (
        <>
            <h2 className={styles.pageTitle}>Agents <span className={styles.ref}>section 4</span></h2>
            <p className={styles.sub}>One agent per apartment; the assigned agent's number is shared with the viewing candidate.</p>
            <div className={styles.card}>
                <div className={styles.cardBody} style={{ padding: 0 }}>
                    {agents.length === 0 ? (
                        <div className={styles.empty}>No agents yet.</div>
                    ) : (
                        <table className={styles.table}>
                            <thead><tr><th>Name</th><th>Phone</th><th>Email</th></tr></thead>
                            <tbody>
                                {agents.map((a) => (
                                    <tr key={a.id}>
                                        <td><b>{a.name || '—'}</b></td>
                                        <td>{a.whatsapp_number || '—'}</td>
                                        <td>{a.email || '—'}</td>
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

// ============================================================
// Collaborations — stub
// TODO: Phase 2 — wire to real_estate_agents table
// ============================================================
export function CollaborationsView() {
    return (
        <>
            <h2 className={styles.pageTitle}>Collaborations <span className={styles.ref}>point 9</span></h2>
            <p className={styles.sub}>External realtors, one per apartment. Each realtor maps to a default offer type.</p>
            <div className={styles.grid2}>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Add collaboration</h3></div>
                    <div className={styles.cardBody}>
                        <label className={styles.fLabel}>Office</label>
                        <input className={styles.inp} />
                        <label className={styles.fLabel}>Contact person name</label>
                        <input className={styles.inp} />
                        <div className={styles.formRow}>
                            <div><label className={styles.fLabel}>Phone number</label><input className={styles.inp} /></div>
                            <div><label className={styles.fLabel}>Email</label><input className={styles.inp} /></div>
                        </div>
                        <label className={styles.fLabel}>Default offer type</label>
                        <select className={styles.inp}>
                            <option>Normal</option>
                            <option>Hausing</option>
                            <option>Grand relocation</option>
                        </select>
                        <button className={styles.btn} style={{ marginTop: 16 }}>Save</button>
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardHead}>
                        <h3>Existing collaborations</h3>
                        <span className={`${styles.hint} ${styles.cardHeadSp}`}>TODO: Phase 2</span>
                    </div>
                    <div className={styles.cardBody} style={{ padding: 0 }}>
                        <table className={styles.table}>
                            <thead><tr><th>Office</th><th>Offer type</th></tr></thead>
                            <tbody>
                                <tr><td>De Vries Makelaars</td><td><span className={`${styles.pill} ${styles.pillGrey}`}>Hausing</span></td></tr>
                                <tr><td>Grachtenhuis</td><td><span className={`${styles.pill} ${styles.pillGrey}`}>Normal</span></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================
// Team — wired to /api/admin/crm/team (GET list + POST add employee)
// ============================================================
export function TeamView({ team, loading, isAdmin, onToast, onAdded }: {
    team: TeamMember[];
    loading: boolean;
    isAdmin: boolean;
    onToast: ToastFn;
    onAdded: () => void;
}) {
    const [form, setForm] = useState({ name: '', email: '', phone: '', startDate: '', role: 'agent' });
    const [perms, setPerms] = useState({ apartments: true, candidates: true, offers: false, team: false });
    const [saving, setSaving] = useState(false);
    const [tempPw, setTempPw] = useState<string | null>(null);

    if (!isAdmin) return <div className={styles.empty}>Admin access required to view the team.</div>;
    if (loading) return <div className={styles.loading}>Loading team…</div>;

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setForm((s) => ({ ...s, [k]: e.target.value }));

    async function addEmployee() {
        if (!form.name.trim() || !form.email.trim()) { onToast('Name and email are required'); return; }
        setSaving(true);
        setTempPw(null);
        try {
            const res = await fetch('/api/admin/crm/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    phone: form.phone || undefined,
                    role: form.role,
                    permissions: perms,
                    start_date: form.startDate || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setTempPw(data.tempPassword || null);
                setForm({ name: '', email: '', phone: '', startDate: '', role: 'agent' });
                onToast('Employee added');
                onAdded();
            } else {
                onToast(data.message || 'Could not add employee');
            }
        } catch {
            onToast('Could not add employee — check console');
        } finally {
            setSaving(false);
        }
    }

    const roleMap: Record<string, string> = { agent: 'Agent', admin: 'Admin', super_admin: 'Super Admin' };

    return (
        <>
            <h2 className={styles.pageTitle}>Team <span className={styles.ref}>point 6 · admin</span></h2>
            <p className={styles.sub}>
                We add employees ourselves and manage access. Roles: Super Admin (David), Admin, Agent ·
                stored in <code>crm_users</code> (role + permissions, RLS per role). Per-user login via Supabase Auth.
            </p>
            <div className={styles.grid2Wide}>
                <div className={styles.card}>
                    <div className={styles.cardHead}><h3>Add employee</h3></div>
                    <div className={styles.cardBody}>
                        <label className={styles.fLabel}>Name</label>
                        <input className={styles.inp} value={form.name} onChange={set('name')} />
                        <div className={styles.formRow}>
                            <div><label className={styles.fLabel}>Email</label><input className={styles.inp} type="email" value={form.email} onChange={set('email')} /></div>
                            <div><label className={styles.fLabel}>Phone</label><input className={styles.inp} value={form.phone} onChange={set('phone')} /></div>
                        </div>
                        <div className={styles.formRow}>
                            <div><label className={styles.fLabel}>Start date</label><input className={styles.inp} type="date" value={form.startDate} onChange={set('startDate')} /></div>
                            <div>
                                <label className={styles.fLabel}>Role</label>
                                <select className={styles.inp} value={form.role} onChange={set('role')}>
                                    <option value="agent">Agent</option>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                        </div>
                        <label className={styles.fLabel}>Access</label>
                        <div className={styles.perm}><input type="checkbox" checked={perms.apartments} onChange={(e) => setPerms((s) => ({ ...s, apartments: e.target.checked }))} /> Apartments</div>
                        <div className={styles.perm}><input type="checkbox" checked={perms.candidates} onChange={(e) => setPerms((s) => ({ ...s, candidates: e.target.checked }))} /> Candidates &amp; viewings</div>
                        <div className={styles.perm}><input type="checkbox" checked={perms.offers} onChange={(e) => setPerms((s) => ({ ...s, offers: e.target.checked }))} /> Offers</div>
                        <div className={styles.perm}><input type="checkbox" checked={perms.team} onChange={(e) => setPerms((s) => ({ ...s, team: e.target.checked }))} /> Team (admin)</div>
                        <button className={styles.btn} style={{ marginTop: 16 }} disabled={saving} onClick={addEmployee}>
                            {saving ? 'Adding…' : 'Add employee'}
                        </button>
                        {tempPw && (
                            <div style={{ marginTop: 12, padding: 12, background: 'var(--teal-l)', borderRadius: 8, fontSize: 13 }}>
                                <b>Temporary password created:</b><br />
                                <code style={{ fontSize: 14, fontWeight: 700 }}>{tempPw}</code><br />
                                <span style={{ fontSize: 12, color: '#46544f' }}>Share this with the new employee. They can reset it after first login.</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className={styles.card}>
                    <div className={styles.cardBody} style={{ padding: 0 }}>
                        <table className={styles.table}>
                            <thead><tr><th>Name</th><th>Role</th><th>Since</th></tr></thead>
                            <tbody>
                                {team.map((m) => (
                                    <tr key={m.id}>
                                        <td><b>{m.name || '—'}</b></td>
                                        <td>
                                            <span className={`${styles.pill} ${m.role === 'super_admin' ? styles.pillTeal : styles.pillGrey}`}>
                                                {roleMap[m.role || 'agent'] || m.role}
                                            </span>
                                        </td>
                                        <td>{m.created_at ? new Date(m.created_at).getFullYear() : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

// ============================================================
// Business placeholder (Letting / Buying / Selling)
// ============================================================
export function BusinessPlaceholder({ biz, onBack }: { biz: BusinessLine; onBack: () => void }) {
    const names: Record<BusinessLine, string> = {
        aanhuur: 'Rentals',
        verhuur: 'Letting (landlord)',
        aankoop: 'Buying',
        verkoop: 'Selling',
    };
    return (
        <div className={styles.content}>
            <div className={styles.card}>
                <div className={`${styles.cardBody} ${styles.placeholder}`}>
                    <h2 className={styles.placeholderTitle}>{names[biz]}</h2>
                    <p className={styles.placeholderSub}>
                        A separate business line with its own dashboard. Not part of this rentals (tenant) CRM build · placeholder for now.
                    </p>
                    <button className={styles.btn} onClick={onBack}>‹ Back to Rentals CRM</button>
                </div>
            </div>
        </div>
    );
}