'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Plus, Copy, Check, Link, LogOut, Building2, Trash2 } from 'lucide-react';
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

    const [form, setForm] = useState({
        full_address: '',
        zip_code: '',
        rental_price: '',
        slot_datetime: '',
        slot_length_minutes: '30',
        sq_mt: '',
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
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                        <LogOut size={16} />
                        Logout
                    </Button>
                </div>
            </header>

            <main className={styles.main}>
                {/* Actions bar */}
                <div className={styles.actionsBar}>
                    <h2 className={styles.sectionTitle}>
                        Apartments ({apartments.length})
                    </h2>
                    <Button onClick={() => setShowForm(!showForm)} size="md">
                        <Plus size={16} />
                        {showForm ? 'Cancel' : 'Add Apartment'}
                    </Button>
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
                ) : apartments.length === 0 ? (
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
                        {apartments.map((apt) => (
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
        </div>
    );
}
