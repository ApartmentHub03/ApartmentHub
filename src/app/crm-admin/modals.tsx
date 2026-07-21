'use client';

import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import styles from './crm.module.css';
import type { Segment } from './types';

type ToastFn = (msg: string) => void;

export type ModalState =
    | { type: 'meetingLinks'; aptId: string }
    | { type: 'sendSegment'; aptId: string; rentalPrice: number | null; bedrooms: string | null }
    | { type: 'reschedule' }
    | { type: 'deal'; aptId: string; accountId: string; rentPrice: number | null }
    | { type: 'editInvoice'; invoiceId: string };

function ModalShell({ title, onClose, children, footer }: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
}) {
    return (
        <div className={styles.modalBg} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal}>
                <div className={styles.modalHead}>
                    <h3>{title}</h3>
                    <button className={styles.modalClose} onClick={onClose}><X size={20} /></button>
                </div>
                <div className={styles.modalBody}>{children}</div>
                {footer && <div className={styles.modalFoot}>{footer}</div>}
            </div>
        </div>
    );
}

// --- Meeting Links Modal ---
// Wired to POST /api/admin/crm/apartment/[id]/generate-slot
export function MeetingLinksModal({ aptId, onClose, onToast, onSaved }: { aptId: string; onClose: () => void; onToast: ToastFn; onSaved?: () => void }) {
    const [start, setStart] = useState('');
    const [duration, setDuration] = useState('30'); // total viewing window in minutes
    const [slotLength, setSlotLength] = useState('5'); // per-booking slot length
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ eventlink?: string | null; eventlinkVideo?: string | null } | null>(null);

    // Auto-compute viewing end from start + duration
    const viewingEnd = (() => {
        if (!start) return '';
        const d = new Date(start);
        if (isNaN(d.getTime())) return '';
        d.setMinutes(d.getMinutes() + Number(duration) || 0);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    })();

    const numSlots = Number(duration) > 0 && Number(slotLength) > 0 ? Math.floor(Number(duration) / Number(slotLength)) : 0;

    async function generate() {
        if (!start) { onToast('Fill in the viewing date & time'); return; }
        if (!viewingEnd) { onToast('Could not compute end time — check duration'); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/generate-slot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ start, end: viewingEnd, slotLengthMinutes: Number(slotLength) }),
            });
            const data = await res.json();
            if (data.success) {
                setResult({
                    eventlink: data.slot?.eventlink || null,
                    eventlinkVideo: data.slot?.eventlink_video || null,
                });
                onToast('Meeting links generated');
                onSaved?.();
            } else {
                onToast(data.message || 'Failed to generate links');
            }
        } catch (e) {
            onToast('Failed to generate links — check console');
            console.error('generate-slot error:', e);
        } finally {
            setLoading(false);
        }
    }

    if (result) {
        return (
            <ModalShell
                title="Meeting links generated"
                onClose={onClose}
                footer={<button className={styles.btn} onClick={onClose}>Close</button>}
            >
                <p style={{ marginBottom: 12 }}>Links saved on the apartment. Status set to <b>Active</b>.</p>
                {result.eventlink && (
                    <>
                        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>In-Person Meet Link</p>
                        <div className={styles.linkBox}>{result.eventlink}</div>
                    </>
                )}
                {result.eventlinkVideo && (
                    <>
                        <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>Facetime (Virtual) Meet Link</p>
                        <div className={styles.linkBox}>{result.eventlinkVideo}</div>
                    </>
                )}
                <p className={styles.hint} style={{ marginTop: 10 }}>
                    Links stored in <code>slot_dates</code> / <code>booking_details</code> on the apartment.
                </p>
            </ModalShell>
        );
    }

    return (
        <ModalShell
            title="Generate Meeting Links"
            onClose={onClose}
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={styles.btn} disabled={loading} onClick={generate}>
                        {loading ? 'Generating…' : 'Generate links'}
                    </button>
                </>
            }
        >
            <p>Creates a Cal.com schedule + in-person and video event types for this apartment.</p>
            <div className={styles.formRow}>
                <div>
                    <label className={styles.fLabel}>Start date & time</label>
                    <input className={styles.inp} type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                    <label className={styles.fLabel}>Duration (min)</label>
                    <input
                        className={styles.inp}
                        type="number"
                        min={1}
                        step={1}
                        placeholder="30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                    />
                </div>
            </div>
            <div className={styles.formRow3} style={{ marginTop: 10 }}>
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
            <p className={styles.hint} style={{ marginTop: 8 }}>
                Total window is {duration || '—'} min · each slot is {slotLength} min.
            </p>
        </ModalShell>
    );
}

// --- Send Segment Modal ---
// Segment picker with live counts from accounts.tags. Auto-matches the
// apartment's price + bedrooms. Send fires the existing n8n webhook
// (trigger-status-change-active) with the selected recipients.
export function SendSegmentModal({ aptId, rentalPrice, bedrooms, onClose, onToast }: {
    aptId: string;
    rentalPrice: number | null;
    bedrooms: string | null;
    onClose: () => void;
    onToast: ToastFn;
}) {
    const [segments, setSegments] = useState<Segment[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [search, setSearch] = useState('');
    const [excludeStudents, setExcludeStudents] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [expanded, setExpanded] = useState(true);

    // Fetch segment counts
    useEffect(() => {
        let cancelled = false;
        async function load() {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/crm/segments?excludeStudents=${excludeStudents}`, {
                    headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                });
                const data = await res.json();
                if (cancelled) return;
                if (data.success && Array.isArray(data.segments)) {
                    setSegments(data.segments);
                    // Auto-match from rental_price + bedrooms
                    if (rentalPrice && bedrooms) {
                        const bedNum = Number((bedrooms.match(/\d+/) || [])[0] || 0);
                        const matched = data.segments.find(
                            (s: Segment) => rentalPrice >= s.min_budget && rentalPrice <= s.max_budget && bedNum === s.min_bedrooms
                        );
                        if (matched) {
                            setSelected(new Set([matched.id]));
                        }
                    }
                }
            } catch {
                if (!cancelled) onToast('Failed to load segments');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true; };
    }, [excludeStudents, rentalPrice, bedrooms, onToast]);

    const totalRecipients = segments
        .filter((s) => selected.has(s.id))
        .reduce((sum, s) => sum + s.count, 0);

    const filtered = segments.filter((s) =>
        s.name.toLowerCase().includes(search.toLowerCase())
    );

    function toggleSegment(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    function removeSegment(id: string) {
        setSelected((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }

    async function send() {
        if (selected.size === 0) { onToast('Select at least one segment'); return; }
        setSending(true);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/broadcast`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({ segmentIds: Array.from(selected), excludeStudents }),
            });
            const data = await res.json();
            if (data.success) {
                onToast(`Broadcast queued — ${data.recipientCount} recipients`);
                onClose();
            } else {
                onToast(data.message || 'Failed to broadcast');
            }
        } catch {
            onToast('Failed to broadcast — check console');
        } finally {
            setSending(false);
        }
    }

    const shortName = (name: string) => name.replace('Customer ', '').replace(' & ', ' · ').replace(' Bedroom', 'BR');

    return (
        <ModalShell
            title="Send via WhatsApp · select segment"
            onClose={onClose}
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={`${styles.btn} ${styles.btnOrange}`} onClick={send} disabled={sending || selected.size === 0}>
                        {sending ? 'Sending…' : `Send to ${totalRecipients} people`}
                    </button>
                </>
            }
        >
            <p style={{ marginBottom: 10 }}>
                Auto-matched from price + bedrooms · pick another if needed. Each segment shows how many people are in it (pulled from Zoko tags). Send broadcasts the apartment + PDF to the selected segment.
            </p>

            {loading ? (
                <div className={styles.hint}>Loading segments…</div>
            ) : (
                <div className={styles.segPick}>
                    <div className={styles.segPickHeader}>
                        <b style={{ fontSize: 13 }}>Send to segments</b>
                        <span className={styles.segPickCount}>{selected.size} selected</span>
                    </div>
                    <div className={styles.segPickBody}>
                        <div className={styles.segSearch}>
                            <Search size={14} style={{ color: 'var(--muted)' }} />
                            <input
                                placeholder="Search segments"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setExpanded(true); }}
                                onFocus={() => setExpanded(true)}
                            />
                        </div>
                        <div className={styles.segChips}>
                            {selected.size === 0 ? (
                                <span className={styles.hint}>No segments selected yet · click the search bar to add.</span>
                            ) : (
                                segments.filter((s) => selected.has(s.id)).map((s) => (
                                    <span key={s.id} className={styles.segChip}>
                                        {shortName(s.name)}
                                        <button className={styles.segChipX} onClick={() => removeSegment(s.id)}>×</button>
                                    </span>
                                ))
                            )}
                        </div>
                    </div>
                    {expanded && (
                        <div className={styles.segCollapse}>
                            <div className={styles.segList}>
                                {filtered.map((s) => (
                                    <label key={s.id} className={styles.segRow}>
                                        <input
                                            type="checkbox"
                                            checked={selected.has(s.id)}
                                            onChange={() => toggleSegment(s.id)}
                                            style={{ accentColor: 'var(--teal)' }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className={styles.segRowLabel}>{s.name}</div>
                                        </div>
                                        <span className={`${styles.pill} ${styles.pillGrey}`} style={{ minWidth: 48, justifyContent: 'center' }}>{s.count}</span>
                                    </label>
                                ))}
                                {filtered.length === 0 && (
                                    <div className={styles.hint} style={{ padding: '12px' }}>No segments match "{search}"</div>
                                )}
                            </div>
                            <div className={styles.segFooter}>
                                Standard exclusions: <b>OPT_OUT · ARCHIVED · Almere · Rotterdam</b>.
                                <label style={{ marginLeft: 12, color: 'var(--ink)' }}>
                                    <input
                                        type="checkbox"
                                        checked={excludeStudents}
                                        onChange={(e) => setExcludeStudents(e.target.checked)}
                                        style={{ accentColor: 'var(--teal)' }}
                                    /> exclude <b>Students</b>
                                </label>
                                . Max 1 apartment per segment per day.
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={styles.waPreview} style={{ marginTop: 12 }}>
                {rentalPrice ? `€${rentalPrice}` : '—'} / month
                {'\n'}{bedrooms || '—'} bedrooms
                {'\n'}Recipients: {totalRecipients}
                {'\n'}Template: pdf_apartment_utility (Zoko)
            </div>
        </ModalShell>
    );
}

// --- Reschedule Modal ---
// TODO: Phase 3 — wire to booking_reschedules + Cal.com webhook + Zoko reschedule template
export function RescheduleModal({ onClose, onToast }: { onClose: () => void; onToast: ToastFn }) {
    return (
        <ModalShell
            title="Reschedule viewing"
            onClose={onClose}
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={styles.btn} onClick={() => { onToast('Viewing rescheduled (demo)'); onClose(); }}>Confirm reschedule</button>
                </>
            }
        >
            <p>Pick the new moment and the new schedule. The meeting link updates and a WhatsApp goes to the candidate.</p>
            <label className={styles.fLabel}>New date &amp; time</label>
            <input className={styles.inp} type="datetime-local" />
            <div className={styles.formRow3}>
                <div>
                    <label className={styles.fLabel}>Duration (min)</label>
                    <select className={styles.inp}><option>30</option><option>20</option><option>45</option></select>
                </div>
                <div>
                    <label className={styles.fLabel}>Slot duration (min)</label>
                    <select className={styles.inp}><option>5</option><option>10</option></select>
                </div>
                <div>
                    <label className={styles.fLabel}>No. of slots</label>
                    <input className={styles.inp} defaultValue="6" />
                </div>
            </div>
        </ModalShell>
    );
}

// --- Deal Modal ---
// Wired to POST /api/admin/crm/apartment/[id]/mark-deal
export function DealModal({ aptId, accountId, rentPrice, crmUsers, onClose, onToast, onSaved }: {
    aptId: string;
    accountId: string;
    rentPrice: number | null;
    crmUsers: { id: string; name: string }[];
    onClose: () => void;
    onToast: ToastFn;
    onSaved?: () => void;
}) {
    const [closerUserId, setCloserUserId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [rentInput, setRentInput] = useState(rentPrice ? String(rentPrice) : '');
    const [loading, setLoading] = useState(false);

    const rent = Number(rentInput) || Number(rentPrice) || 0;
    const months = rent < 2000 ? 2 : 1;
    const amountExVat = rent * months;
    const vatAmount = Math.round(amountExVat * 0.21 * 100) / 100;
    const amountIncVat = Math.round((amountExVat + vatAmount) * 100) / 100;

    async function confirm() {
        if (!closerUserId) { onToast('Select a closing agent'); return; }
        if (!startDate) { onToast('Contractual start date is required'); return; }
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/crm/apartment/${aptId}/mark-deal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify({
                    account_id: accountId,
                    closer_user_id: closerUserId,
                    contract_start_date: startDate,
                    final_rent_price: rentInput ? Number(rentInput) : undefined,
                }),
            });
            const data = await res.json();
            if (data.success) {
                onToast('Deal confirmed — invoice created as draft');
                onSaved?.();
                onClose();
            } else {
                onToast(data.message || 'Failed to confirm deal');
            }
        } catch (e) {
            onToast('Failed to confirm deal — check console');
            console.error('mark-deal error:', e);
        } finally {
            setLoading(false);
        }
    }

    return (
        <ModalShell
            title="Mark as deal · closed conditions"
            onClose={onClose}
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={styles.btn} disabled={loading} onClick={confirm}>
                        {loading ? 'Confirming…' : 'Confirm deal'}
                    </button>
                </>
            }
        >
            <p>Confirm the agent and the final closed-deal conditions.</p>
            <label className={styles.fLabel}>Closing agent</label>
            <select className={styles.inp} value={closerUserId} onChange={(e) => setCloserUserId(e.target.value)}>
                <option value="">— Select —</option>
                {crmUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <div className={styles.formRow}>
                <div>
                    <label className={styles.fLabel}>Contractual Start Date *</label>
                    <input className={styles.inp} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div>
                    <label className={styles.fLabel}>Rent price (€) · if changed</label>
                    <input className={styles.inp} value={rentInput} onChange={(e) => setRentInput(e.target.value)} placeholder={rentPrice ? String(rentPrice) : '—'} />
                </div>
            </div>
            <div style={{ marginTop: 12, padding: 12, background: '#f3f6f6', borderRadius: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 600, marginBottom: 6, color: '#46544f' }}>Commission preview</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>Commission ({months} month{months > 1 ? 's' : ''} rent)</span>
                    <span>€ {amountExVat.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span>VAT (21% BTW)</span>
                    <span>€ {vatAmount.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#497772', borderTop: '1px solid #d0d8d6', paddingTop: 4, marginTop: 4 }}>
                    <span>Total inc VAT</span>
                    <span>€ {amountIncVat.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}</span>
                </div>
            </div>
            <div className={styles.hint} style={{ marginTop: 8 }}>
                On confirm: accepted template to the winner, declined templates to the others, added to the deals-of-this-month sheet, and the invoice becomes available.
            </div>
        </ModalShell>
    );
}

// --- Edit Invoice Modal ---
// Wired to GET/PATCH /api/admin/crm/invoices/[id]. Recipient city + country
// have no source column on accounts/personen, so they're always blank until
// an admin fills them in here — sending is blocked until they're set.
type InvoiceRecord = {
    id: string;
    invoice_number: string | null;
    recipient_name: string | null;
    recipient_address: string | null;
    recipient_zipcode: string | null;
    recipient_city: string | null;
    recipient_country: string | null;
    amount_ex_vat: number | null;
    vat_amount: number | null;
    amount_inc_vat: number | null;
    due_date: string | null;
    status: string;
};

export function EditInvoiceModal({ invoiceId, onClose, onToast, onSaved }: {
    invoiceId: string;
    onClose: () => void;
    onToast: ToastFn;
    onSaved?: () => void;
}) {
    const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        recipient_name: '', recipient_address: '', recipient_zipcode: '', recipient_city: '', recipient_country: '',
    });

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/admin/crm/invoices/${invoiceId}`, {
                    headers: { Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                });
                const data = await res.json();
                if (cancelled) return;
                if (data.success) {
                    setInvoice(data.invoice);
                    setForm({
                        recipient_name: data.invoice.recipient_name || '',
                        recipient_address: data.invoice.recipient_address || '',
                        recipient_zipcode: data.invoice.recipient_zipcode || '',
                        recipient_city: data.invoice.recipient_city || '',
                        recipient_country: data.invoice.recipient_country || '',
                    });
                } else {
                    onToast(data.message || 'Failed to load invoice');
                }
            } catch (e) {
                if (!cancelled) onToast('Failed to load invoice — check console');
                console.error('load-invoice error:', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [invoiceId]);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((s) => ({ ...s, [k]: e.target.value }));

    async function save() {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/crm/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('crm_token')}` },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) {
                onToast('Invoice updated');
                onSaved?.();
                onClose();
            } else {
                onToast(data.message || 'Failed to update invoice');
            }
        } catch (e) {
            onToast('Failed to update invoice — check console');
            console.error('update-invoice error:', e);
        } finally {
            setSaving(false);
        }
    }

    return (
        <ModalShell
            title={`Edit invoice ${invoice?.invoice_number || ''}`}
            onClose={onClose}
            footer={
                <>
                    <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onClose}>Cancel</button>
                    <button className={styles.btn} disabled={saving || loading} onClick={save}>
                        {saving ? 'Saving…' : 'Save'}
                    </button>
                </>
            }
        >
            {loading ? (
                <p>Loading…</p>
            ) : (
                <>
                    <p className={styles.hint} style={{ marginBottom: 12 }}>
                        City and country aren&apos;t captured anywhere upstream — fill them in before sending.
                    </p>
                    <label className={styles.fLabel}>Recipient name</label>
                    <input className={styles.inp} value={form.recipient_name} onChange={set('recipient_name')} />
                    <label className={styles.fLabel}>Street address</label>
                    <input className={styles.inp} value={form.recipient_address} onChange={set('recipient_address')} />
                    <div className={styles.formRow}>
                        <div>
                            <label className={styles.fLabel}>Zipcode</label>
                            <input className={styles.inp} value={form.recipient_zipcode} onChange={set('recipient_zipcode')} placeholder="1234 AB" />
                        </div>
                        <div>
                            <label className={styles.fLabel}>City *</label>
                            <input className={styles.inp} value={form.recipient_city} onChange={set('recipient_city')} placeholder="Amsterdam" />
                        </div>
                    </div>
                    <label className={styles.fLabel}>Country *</label>
                    <input className={styles.inp} value={form.recipient_country} onChange={set('recipient_country')} placeholder="Netherlands" />
                </>
            )}
        </ModalShell>
    );
}