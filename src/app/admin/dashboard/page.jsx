'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Plus, Copy, Check, Link, LogOut, Building2, Trash2, ClipboardList, X } from 'lucide-react';
import { toast } from 'sonner';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
    const router = useRouter();
    const [authenticated, setAuthenticated] = useState(false);
    const [apartments, setApartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(null);
    const [copiedId, setCopiedId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [showLogs, setShowLogs] = useState(false);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    const [form, setForm] = useState({
        full_address: '',
        zip_code: '',
        rental_price: '',
        slot_datetime: '',
        slot_length_minutes: '30',
        sq_mt: '',
        whatsapp_number: '',
        viewing_type: 'in-person',
    });
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (!token) {
            router.push('/admin');
            return;
        }
        setAuthenticated(true);
    }, [router]);

    const fetchApartments = useCallback(async () => {
        const { data, error } = await supabase
            .from('admin_apartment')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            toast.error('Failed to load apartments');
            return;
        }
        setApartments(data || []);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (authenticated) fetchApartments();
    }, [authenticated, fetchApartments]);

    const handleChange = (field) => (e) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const validateForm = () => {
        const errors = {};
        if (!form.full_address.trim()) errors.full_address = 'Address is required';
        if (!form.slot_datetime) errors.slot_datetime = 'Date & time is required';
        if (!form.slot_length_minutes || Number(form.slot_length_minutes) <= 0)
            errors.slot_length_minutes = 'Slot length is required';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmitting(true);
        const { error } = await supabase.from('admin_apartment').insert({
            full_address: form.full_address.trim(),
            zip_code: form.zip_code.trim() || null,
            rental_price: form.rental_price ? Number(form.rental_price) : null,
            slot_datetime: new Date(form.slot_datetime).toISOString(),
            slot_length_minutes: Number(form.slot_length_minutes),
            sq_mt: form.sq_mt ? Number(form.sq_mt) : null,
            whatsapp_number: form.whatsapp_number.trim() || null,
            viewing_type: form.viewing_type,
            status: 'Draft',
        });

        if (error) {
            toast.error('Failed to create apartment');
            setSubmitting(false);
            return;
        }

        toast.success('Apartment created successfully');
        setForm({
            full_address: '',
            zip_code: '',
            rental_price: '',
            slot_datetime: '',
            slot_length_minutes: '30',
            sq_mt: '',
            whatsapp_number: '',
            viewing_type: 'in-person',
        });
        setShowForm(false);
        setSubmitting(false);
        fetchApartments();
    };

    const handleGenerateLink = async (apartment) => {
        setGeneratingLink(apartment.id);

        try {
            // Call Cal.com API to create event type and get event link
            const res = await fetch('/api/admin/generate-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: apartment.full_address,
                    slotDatetime: apartment.slot_datetime,
                    slotLengthMinutes: apartment.slot_length_minutes,
                    viewingType: apartment.viewing_type || 'in-person',
                    whatsappNumber: apartment.whatsapp_number || '',
                }),
            });

            const data = await res.json();

            if (data.success && data.eventlink) {
                const { error } = await supabase
                    .from('admin_apartment')
                    .update({
                        eventlink: data.eventlink,
                        status: 'LinkCreated',
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', apartment.id);

                if (error) {
                    toast.error('Link generated but failed to save');
                } else {
                    toast.success('Event link generated!');
                    fetchApartments();
                }
            } else {
                toast.error(data.message || 'Failed to generate event link');
            }
        } catch {
            toast.error('Failed to generate event link');
        } finally {
            setGeneratingLink(null);
        }
    };

    const handleCopy = async (link, id) => {
        await navigator.clipboard.writeText(link);
        setCopiedId(id);
        toast.success('Link copied to clipboard');
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleClose = async (id) => {
        const { error } = await supabase
            .from('admin_apartment')
            .update({ status: 'Closed', updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            toast.error('Failed to close apartment');
            return;
        }
        toast.success('Apartment closed');
        fetchApartments();
    };

    const handleDelete = async (id) => {
        const { error } = await supabase
            .from('admin_apartment')
            .delete()
            .eq('id', id);

        if (error) {
            toast.error('Failed to delete apartment');
            return;
        }
        toast.success('Apartment deleted');
        fetchApartments();
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_token');
        router.push('/admin');
    };

    const handleShowLogs = async () => {
        if (showLogs) {
            setShowLogs(false);
            return;
        }
        setShowLogs(true);
        setLogsLoading(true);
        const { data, error } = await supabase
            .from('admin_tennant')
            .select('*')
            .order('updated_at', { ascending: false });

        if (error) {
            toast.error('Failed to load tenant logs');
        } else {
            setLogs(data || []);
        }
        setLogsLoading(false);
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'LinkCreated': return 'success';
            case 'Closed': return 'error';
            default: return 'secondary';
        }
    };

    const formatDateTime = (dt) => {
        return new Date(dt).toLocaleString('en-NL', {
            dateStyle: 'medium',
            timeStyle: 'short',
            timeZone: 'Europe/Amsterdam',
        });
    };

    const filteredApartments = statusFilter === 'All'
        ? apartments
        : apartments.filter((apt) => apt.status === statusFilter);

    const filterCounts = {
        All: apartments.length,
        Draft: apartments.filter((a) => a.status === 'Draft').length,
        LinkCreated: apartments.filter((a) => a.status === 'LinkCreated').length,
        Closed: apartments.filter((a) => a.status === 'Closed').length,
    };

    if (!authenticated) return null;

    return (
        <div className={styles.container}>
            {/* Header */}
            <header className={styles.header}>
                <div className={styles.headerInner}>
                    <div className={styles.headerLeft}>
                        <div className={styles.logoIcon}>
                            <Building2 size={20} />
                        </div>
                        <h1 className={styles.headerTitle}>Admin Dashboard</h1>
                    </div>
                    <div className={styles.headerActions}>
                        <Button
                            variant={showLogs ? 'default' : 'outline'}
                            size="sm"
                            onClick={handleShowLogs}
                        >
                            <ClipboardList size={16} />
                            Logs
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            <LogOut size={16} />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className={styles.main}>
                {/* Actions bar */}
                <div className={styles.actionsBar}>
                    <h2 className={styles.sectionTitle}>
                        Apartments ({filteredApartments.length})
                    </h2>
                    <Button onClick={() => setShowForm(!showForm)} size="md">
                        <Plus size={16} />
                        {showForm ? 'Cancel' : 'Add Apartment'}
                    </Button>
                </div>

                {/* Filters */}
                <div className={styles.filters}>
                    {['All', 'Draft', 'LinkCreated', 'Closed'].map((status) => (
                        <button
                            key={status}
                            className={`${styles.filterBtn} ${statusFilter === status ? styles.filterActive : ''}`}
                            onClick={() => setStatusFilter(status)}
                        >
                            {status} ({filterCounts[status]})
                        </button>
                    ))}
                </div>

                {/* Add form */}
                {showForm && (
                    <Card shadow="lg" className={styles.formCard}>
                        <CardHeader>
                            <CardTitle>New Apartment</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.formGrid}>
                                    <Input
                                        label="Full Address"
                                        required
                                        value={form.full_address}
                                        onChange={handleChange('full_address')}
                                        placeholder="e.g. Keizersgracht 123, Amsterdam"
                                        error={formErrors.full_address}
                                    />
                                    <Input
                                        label="Zip Code"
                                        value={form.zip_code}
                                        onChange={handleChange('zip_code')}
                                        placeholder="e.g. 1015 CJ"
                                    />
                                    <Input
                                        label="Rental Price"
                                        type="number"
                                        value={form.rental_price}
                                        onChange={handleChange('rental_price')}
                                        placeholder="e.g. 1850"
                                        prefix="€"
                                    />
                                    <Input
                                        label="Square Meters"
                                        type="number"
                                        value={form.sq_mt}
                                        onChange={handleChange('sq_mt')}
                                        placeholder="e.g. 65"
                                        suffix="m²"
                                    />
                                    <Input
                                        label="WhatsApp Number"
                                        type="tel"
                                        value={form.whatsapp_number}
                                        onChange={handleChange('whatsapp_number')}
                                        placeholder="e.g. +31612345678"
                                    />
                                    <div className={styles.selectWrapper}>
                                        <label className={styles.selectLabel}>Viewing Type</label>
                                        <select
                                            className={styles.select}
                                            value={form.viewing_type}
                                            onChange={handleChange('viewing_type')}
                                        >
                                            <option value="in-person">In-Person</option>
                                            <option value="video">Video Call</option>
                                        </select>
                                    </div>
                                    <Input
                                        label="Viewing Date & Time"
                                        required
                                        type="datetime-local"
                                        value={form.slot_datetime}
                                        onChange={handleChange('slot_datetime')}
                                        error={formErrors.slot_datetime}
                                    />
                                    <Input
                                        label="Slot Length (minutes)"
                                        required
                                        type="number"
                                        value={form.slot_length_minutes}
                                        onChange={handleChange('slot_length_minutes')}
                                        placeholder="e.g. 30"
                                        error={formErrors.slot_length_minutes}
                                        suffix="min"
                                    />
                                </div>
                                <div className={styles.formActions}>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowForm(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit" loading={submitting}>
                                        Create Apartment
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Apartments list */}
                {loading ? (
                    <div className={styles.loadingState}>Loading apartments...</div>
                ) : filteredApartments.length === 0 ? (
                    <Card className={styles.emptyState}>
                        <CardContent>
                            <Building2 size={48} className={styles.emptyIcon} />
                            <p className={styles.emptyText}>No apartments yet</p>
                            <p className={styles.emptySubtext}>
                                Click &quot;Add Apartment&quot; to create your first listing.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className={styles.apartmentGrid}>
                        {filteredApartments.map((apt) => (
                            <Card key={apt.id} shadow="lg" className={styles.apartmentCard}>
                                <CardContent>
                                    <div className={styles.cardTop}>
                                        <h3 className={styles.address}>{apt.full_address}</h3>
                                        <div className={styles.statusRow}>
                                            <Badge variant={getStatusVariant(apt.status)} size="lg">
                                                {apt.status}
                                            </Badge>
                                            {apt.status === 'Draft' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleGenerateLink(apt)}
                                                    loading={generatingLink === apt.id}
                                                >
                                                    <Link size={14} />
                                                    Create Link
                                                </Button>
                                            )}
                                            {apt.status === 'LinkCreated' && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleClose(apt.id)}
                                                >
                                                    Close
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className={styles.detailsGrid}>
                                        {apt.zip_code && (
                                            <div className={styles.detail}>
                                                <span className={styles.detailLabel}>Zip Code</span>
                                                <span className={styles.detailValue}>{apt.zip_code}</span>
                                            </div>
                                        )}
                                        {apt.rental_price && (
                                            <div className={styles.detail}>
                                                <span className={styles.detailLabel}>Rent</span>
                                                <span className={styles.detailValue}>€{Number(apt.rental_price).toLocaleString()}</span>
                                            </div>
                                        )}
                                        {apt.sq_mt && (
                                            <div className={styles.detail}>
                                                <span className={styles.detailLabel}>Size</span>
                                                <span className={styles.detailValue}>{apt.sq_mt} m²</span>
                                            </div>
                                        )}
                                        <div className={styles.detail}>
                                            <span className={styles.detailLabel}>Viewing</span>
                                            <span className={styles.detailValue}>{formatDateTime(apt.slot_datetime)}</span>
                                        </div>
                                        <div className={styles.detail}>
                                            <span className={styles.detailLabel}>Slot</span>
                                            <span className={styles.detailValue}>{apt.slot_length_minutes} min</span>
                                        </div>
                                    </div>

                                    {/* Event Link */}
                                    {apt.eventlink && (
                                        <div className={styles.eventLinkSection}>
                                            <span className={styles.detailLabel}>Event Link</span>
                                            <div className={styles.eventLinkRow}>
                                                <code className={styles.eventLink}>{apt.eventlink}</code>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    iconOnly
                                                    onClick={() => handleCopy(apt.eventlink, apt.id)}
                                                    title="Copy link"
                                                >
                                                    {copiedId === apt.id ? (
                                                        <Check size={14} />
                                                    ) : (
                                                        <Copy size={14} />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.cardFooter}>
                                        <span className={styles.createdAt}>
                                            Created {formatDateTime(apt.created_at)}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            iconOnly
                                            onClick={() => handleDelete(apt.id)}
                                            title="Delete apartment"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>

            {/* Logs Panel */}
            {showLogs && (
                <div className={styles.logsOverlay}>
                    <div className={styles.logsPanel}>
                        <div className={styles.logsPanelHeader}>
                            <h2 className={styles.logsPanelTitle}>
                                <ClipboardList size={20} />
                                Tenant Logs ({logs.length})
                            </h2>
                            <Button variant="ghost" size="sm" iconOnly onClick={() => setShowLogs(false)}>
                                <X size={18} />
                            </Button>
                        </div>
                        <div className={styles.logsPanelContent}>
                            {logsLoading ? (
                                <div className={styles.loadingState}>Loading logs...</div>
                            ) : logs.length === 0 ? (
                                <div className={styles.loadingState}>No tenant logs found.</div>
                            ) : (
                                <div className={styles.logsTable}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Name</th>
                                                <th>WhatsApp</th>
                                                <th>Email</th>
                                                <th>Event Title</th>
                                                <th>Viewing</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Trigger</th>
                                                <th>Booking Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {logs.map((log) => (
                                                <tr key={log.id}>
                                                    <td>{log.name || '—'}</td>
                                                    <td>{log.whatsapp_number || log['WhatsApp Number'] || '—'}</td>
                                                    <td>{log.Email || '—'}</td>
                                                    <td>{log.EventTitle || log.eventTitle || '—'}</td>
                                                    <td>
                                                        {log.Viewing_StartTime && log.Viewing_EndTime
                                                            ? `${log.Viewing_StartTime} - ${log.Viewing_EndTime}`
                                                            : '—'}
                                                    </td>
                                                    <td>
                                                        {log.viewingType ? (
                                                            <Badge variant={log.viewingType === 'Video-Viewing' ? 'default' : 'secondary'} size="sm">
                                                                {log.viewingType}
                                                            </Badge>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        {log.status ? (
                                                            <Badge
                                                                variant={log.status === 'ACCEPTED' ? 'success' : log.status === 'CANCELLED' ? 'error' : 'warning'}
                                                                size="sm"
                                                            >
                                                                {log.status}
                                                            </Badge>
                                                        ) : '—'}
                                                    </td>
                                                    <td>{log.TriggerEvent || log.EventType || '—'}</td>
                                                    <td>{log.bookingDate || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
