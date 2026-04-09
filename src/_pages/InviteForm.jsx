'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { CheckCircle, AlertCircle, LogOut, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';
import { uploadDocument } from '../services/documentStorageService';
import { getRequiredDocuments } from '../utils/documentRequirements';
import { documentTypeLabels, workStatusLabels } from '../config/documentRequirements';
import WorkStatusSelector from '../components/aanvraag/WorkStatusSelector';
import GuarantorWorkStatusSelector from '../components/aanvraag/GuarantorWorkStatusSelector';
import InlineDocumentUpload from '../components/aanvraag/InlineDocumentUpload';
import MultiFileDocumentUpload from '../components/aanvraag/MultiFileDocumentUpload';
import styles from './Login.module.css';

const InviteForm = () => {
    const router = useRouter();
    const currentLang = useSelector((state) => state.ui.language);
    const { logout, phoneNumber } = useAuth();

    const [inviteContext, setInviteContext] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [naam, setNaam] = useState('');
    const [email, setEmail] = useState('');
    const [telefoon, setTelefoon] = useState('');
    const [adres, setAdres] = useState('');
    const [postcode, setPostcode] = useState('');
    const [woonplaats, setWoonplaats] = useState('');
    const [inkomen, setInkomen] = useState('');
    const [werkstatus, setWerkstatus] = useState(null);
    const [documenten, setDocumenten] = useState([]);
    const [guarantorInviteLink, setGuarantorInviteLink] = useState(null);
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
    const [generatingLink, setGeneratingLink] = useState(false);
    const [showGuarantorModal, setShowGuarantorModal] = useState(false);
    const [guarantorName, setGuarantorName] = useState('');
    const [guarantorPhone, setGuarantorPhone] = useState('+');

    // Load invite context and existing data
    useEffect(() => {
        const loadData = async () => {
            const dossierId = localStorage.getItem('invite_dossier_id');
            const role = localStorage.getItem('invite_role');
            const persoonId = localStorage.getItem('invite_persoon_id');

            if (!dossierId || !role) {
                setError(currentLang === 'en'
                    ? 'No invite context found. Please use the invite link again.'
                    : 'Geen uitnodigingscontext gevonden. Gebruik de uitnodigingslink opnieuw.');
                setLoading(false);
                return;
            }

            let actualPersoonId = persoonId;

            // If no persoonId, try to find or create the person record
            if ((!actualPersoonId || actualPersoonId === '') && supabase) {
                const normalizedPhone = (phoneNumber || '').replace(/[\s\-\(\)]/g, '');

                // Try to find existing person by phone + dossier + role
                const expectedType = role === 'Medehuurder' ? 'co_tenant' : 'guarantor';
                if (normalizedPhone) {
                    const { data: existing } = await supabase
                        .from('personen')
                        .select('id')
                        .eq('dossier_id', dossierId)
                        .eq('telefoon', normalizedPhone)
                        .eq('type', expectedType)
                        .limit(1);

                    if (existing && existing.length > 0) {
                        actualPersoonId = existing[0].id;
                    }
                }

                // If still not found, create the person record
                if (!actualPersoonId) {
                    const { data: newPerson } = await supabase
                        .from('personen')
                        .insert({
                            dossier_id: dossierId,
                            rol: role,
                            type: role === 'Medehuurder' ? 'co_tenant' : 'guarantor',
                            telefoon: phoneNumber || null,
                            created_at: new Date().toISOString()
                        })
                        .select('id')
                        .single();

                    if (newPerson) {
                        actualPersoonId = newPerson.id;
                    }
                }

                // Save the persoonId for future use
                if (actualPersoonId) {
                    localStorage.setItem('invite_persoon_id', actualPersoonId);
                }
            }

            setInviteContext({ dossierId, role, persoonId: actualPersoonId });

            // Load existing person data if we have a persoonId
            if (actualPersoonId && supabase) {
                const { data: person } = await supabase
                    .from('personen')
                    .select('*')
                    .eq('id', actualPersoonId)
                    .single();

                if (person) {
                    setNaam(`${person.voornaam || ''} ${person.achternaam || ''}`.trim());
                    setEmail(person.email || '');
                    setTelefoon(person.telefoon || phoneNumber || '');
                    setAdres(person.huidige_adres || '');
                    setPostcode(person.postcode || '');
                    setWoonplaats(person.woonplaats || '');
                    setInkomen(person.bruto_maandinkomen != null ? String(person.bruto_maandinkomen) : '');
                    setWerkstatus(person.werk_status || null);
                }

                // Load documents
                const { data: docs } = await supabase
                    .from('documenten')
                    .select('*')
                    .eq('persoon_id', persoonId);

                if (docs) {
                    setDocumenten(docs.map(d => ({
                        id: d.id,
                        type: d.type,
                        name: d.bestandsnaam,
                        fileName: d.bestandsnaam,
                        filePath: d.bestandspad,
                        status: d.status === 'pending' ? 'ontvangen' : d.status,
                    })));
                }
            } else {
                setTelefoon(phoneNumber || '');
            }

            setLoading(false);
        };

        loadData();
    }, [phoneNumber, currentLang]);

    const requiredDocuments = getRequiredDocuments(werkstatus, inviteContext?.role === 'Garantsteller' ? 'guarantor' : 'tenant');

    const getDoc = (type) => documenten.find(d => d.type === type);
    const isDocUploaded = (type) => {
        const doc = getDoc(type);
        return doc && doc.status === 'ontvangen';
    };

    const handleDocumentUpload = async (type, file) => {
        if (!inviteContext?.persoonId || !file) return;

        const result = await uploadDocument(
            inviteContext.persoonId,
            inviteContext.dossierId,
            type,
            file,
            phoneNumber
        );

        if (result.ok) {
            setDocumenten(prev => {
                const filtered = prev.filter(d => d.type !== type);
                return [...filtered, {
                    id: result.document?.id,
                    type,
                    name: file.name,
                    fileName: file.name,
                    status: 'ontvangen'
                }];
            });
        }
    };

    const handleMultiFileUpload = async (type, items) => {
        if (!inviteContext?.persoonId) return;

        // `items` contains both already-uploaded document objects and new File objects.
        // Only upload the new Files; leave existing docs alone in state.
        const existingDocs = items.filter(it => it && !(it instanceof File));
        const newFiles = items.filter(it => it instanceof File);
        if (newFiles.length === 0) {
            // Pure removal/reorder — sync state to the passed-in list
            setDocumenten(prev => {
                const others = prev.filter(d => d.type !== type);
                return [...others, ...existingDocs.map(d => ({ ...d, type }))];
            });
            return;
        }

        // Upload new files in parallel; pass fileIndex so each gets a unique storage path.
        const baseIndex = existingDocs.length;
        const uploadPromises = newFiles.map((file, i) =>
            uploadDocument(
                inviteContext.persoonId,
                inviteContext.dossierId,
                type,
                file,
                phoneNumber,
                null,
                baseIndex + i
            ).then(result => ({ result, file }))
        );

        const results = await Promise.all(uploadPromises);
        const newDocs = results
            .filter(({ result }) => result.ok)
            .map(({ result, file }) => ({
                id: result.document?.id,
                type,
                name: file.name,
                fileName: file.name,
                status: 'ontvangen'
            }));

        // Append new docs to state, preserving existing ones of the same type.
        setDocumenten(prev => {
            const others = prev.filter(d => d.type !== type);
            const sameType = prev.filter(d => d.type === type);
            return [...others, ...sameType, ...newDocs];
        });
    };

    const handleSave = useCallback(async () => {
        if (!inviteContext?.persoonId || !supabase) return;

        setSaving(true);
        const nameParts = (naam || '').trim().split(' ');
        const voornaam = nameParts[0] || '';
        const achternaam = nameParts.slice(1).join(' ') || '';

        let parsedIncome = null;
        if (inkomen) {
            const incomeStr = inkomen.toString().trim();
            if (incomeStr !== '' && !isNaN(incomeStr)) {
                parsedIncome = parseFloat(incomeStr);
            }
        }

        const { error: updateError } = await supabase
            .from('personen')
            .update({
                voornaam,
                achternaam,
                email: email || null,
                telefoon: telefoon || null,
                werk_status: werkstatus || null,
                bruto_maandinkomen: parsedIncome,
                huidige_adres: adres || null,
                postcode: postcode || null,
                woonplaats: woonplaats || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', inviteContext.persoonId);

        setSaving(false);

        if (updateError) {
            console.error('[InviteForm] Save error:', updateError);
            setError(currentLang === 'en' ? 'Failed to save. Please try again.' : 'Opslaan mislukt. Probeer het opnieuw.');
        }
    }, [inviteContext, naam, email, telefoon, adres, postcode, woonplaats, inkomen, werkstatus, currentLang]);

    const handleSubmit = async () => {
        if (!naam.trim() || !email.trim() || !werkstatus) {
            setError(currentLang === 'en'
                ? 'Please fill in all required fields (name, email, work status).'
                : 'Vul alle verplichte velden in (naam, email, werkstatus).');
            return;
        }

        await handleSave();

        // Notify main tenant via WhatsApp that co-tenant has submitted
        if (inviteContext?.dossierId) {
            try {
                const { data: dossierRow } = await supabase
                    .from('dossiers')
                    .select('phone_number')
                    .eq('id', inviteContext.dossierId)
                    .single();

                if (dossierRow?.phone_number) {
                    fetch('https://davidvanwachem.app.n8n.cloud/webhook/get-agenda-page-details', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            eventType: 'co_tenant_submitted',
                            main_tenant_phone: dossierRow.phone_number,
                            co_tenant_name: naam,
                            co_tenant_phone: telefoon || phoneNumber,
                            role: inviteContext.role,
                            dossier_id: inviteContext.dossierId,
                            timestamp: new Date().toISOString()
                        })
                    }).catch(err => console.warn('[InviteForm] Webhook notification failed:', err));
                }
            } catch (err) {
                console.warn('[InviteForm] Could not notify main tenant:', err);
            }
        }

        setSubmitted(true);
    };

    // Auto-save on changes
    useEffect(() => {
        if (loading || !inviteContext?.persoonId) return;
        const timeout = setTimeout(() => { handleSave(); }, 3000);
        return () => clearTimeout(timeout);
    }, [naam, email, telefoon, adres, postcode, woonplaats, inkomen, werkstatus, loading, handleSave]);

    const handleLogout = () => {
        localStorage.removeItem('invite_dossier_id');
        localStorage.removeItem('invite_role');
        localStorage.removeItem('invite_persoon_id');
        localStorage.removeItem('invite_token');
        logout();
        router.replace('/');
    };

    const handleAddGuarantorForSelf = async () => {
        if (!inviteContext?.persoonId || !inviteContext?.dossierId) return;
        setGeneratingLink(true);
        try {
            const token = localStorage.getItem('invite_token') || localStorage.getItem('auth_token');
            const { data: inviteResult, error: inviteError } = await supabase.functions.invoke('generate-invite', {
                body: {
                    dossier_id: inviteContext.dossierId,
                    role: 'Garantsteller',
                    name: guarantorName || null,
                    linked_to_persoon_id: inviteContext.persoonId,
                    auth_token: token
                }
            });

            if (inviteError || !inviteResult?.ok) {
                console.error('[InviteForm] Failed to generate guarantor invite:', inviteError || inviteResult);
                setError(currentLang === 'en' ? 'Failed to generate invite link' : 'Uitnodigingslink genereren mislukt');
                return;
            }

            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            setGuarantorInviteLink(`${baseUrl}/invite?token=${inviteResult.invite_token}`);
            setInviteLinkCopied(false);
        } catch (err) {
            console.error('[InviteForm] Error generating guarantor invite:', err);
            setError(currentLang === 'en' ? 'Failed to generate invite link' : 'Uitnodigingslink genereren mislukt');
        } finally {
            setGeneratingLink(false);
        }
    };

    const renderGuarantorModal = () => {
        if (!showGuarantorModal) return null;
        return (
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
            }} onClick={() => setShowGuarantorModal(false)}>
                <div style={{
                    background: 'white', borderRadius: '0.75rem', padding: '2rem',
                    maxWidth: '28rem', width: '90%'
                }} onClick={e => e.stopPropagation()}>
                    <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            {currentLang === 'en' ? 'Add Guarantor' : 'Garantsteller toevoegen'}
                        </h3>
                        <p style={{ fontSize: '0.813rem', color: '#6b7280' }}>
                            {currentLang === 'en'
                                ? 'Enter their details and share the invite link'
                                : 'Vul hun gegevens in en deel de uitnodigingslink'}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                                {currentLang === 'en' ? 'Name' : 'Naam'} *
                            </label>
                            <input
                                type="text"
                                value={guarantorName}
                                onChange={e => setGuarantorName(e.target.value)}
                                placeholder={currentLang === 'en' ? 'Full name' : 'Volledige naam'}
                                style={{
                                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb',
                                    borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
                                }}
                                autoFocus
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                                {currentLang === 'en' ? 'Phone Number' : 'Telefoonnummer'} *
                            </label>
                            <input
                                type="tel"
                                value={guarantorPhone}
                                onChange={e => {
                                    let val = e.target.value.replace(/[^\d+]/g, '');
                                    if (!val.startsWith('+')) val = '+' + val;
                                    setGuarantorPhone(val);
                                }}
                                placeholder="+31612345678"
                                style={{
                                    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb',
                                    borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        {/* Generate & show invite link */}
                        {!guarantorInviteLink ? (
                            <button
                                onClick={async () => {
                                    if (!guarantorName.trim() || guarantorPhone.replace(/\D/g, '').length < 10) return;
                                    await handleAddGuarantorForSelf();
                                }}
                                disabled={generatingLink || !guarantorName.trim() || guarantorPhone.replace(/\D/g, '').length < 10}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '0.375rem',
                                    background: (!guarantorName.trim() || guarantorPhone.replace(/\D/g, '').length < 10) ? '#d1d5db' : '#497772',
                                    color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem'
                                }}
                            >
                                {generatingLink
                                    ? (currentLang === 'en' ? 'Generating Link...' : 'Link genereren...')
                                    : (currentLang === 'en' ? 'Generate Invite Link' : 'Uitnodigingslink genereren')}
                            </button>
                        ) : (
                            <div>
                                <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                                    {currentLang === 'en' ? 'Invite Link' : 'Uitnodigingslink'}
                                </label>
                                <div style={{
                                    background: '#f3f4f6', borderRadius: '0.375rem', padding: '0.625rem 0.75rem',
                                    fontSize: '0.75rem', wordBreak: 'break-all', color: '#374151',
                                    fontFamily: 'monospace', border: '1px solid #e5e7eb', marginBottom: '0.5rem'
                                }}>
                                    {guarantorInviteLink}
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(guarantorInviteLink);
                                        setInviteLinkCopied(true);
                                        setTimeout(() => setInviteLinkCopied(false), 2000);
                                    }}
                                    style={{
                                        width: '100%', padding: '0.625rem', borderRadius: '0.375rem',
                                        background: inviteLinkCopied ? '#10b981' : '#497772',
                                        color: 'white', border: 'none', cursor: 'pointer',
                                        fontWeight: 500, fontSize: '0.813rem'
                                    }}
                                >
                                    {inviteLinkCopied
                                        ? (currentLang === 'en' ? '✓ Link Copied!' : '✓ Link Gekopieerd!')
                                        : (currentLang === 'en' ? 'Copy Link' : 'Link Kopiëren')}
                                </button>
                            </div>
                        )}

                        <button
                            onClick={() => setShowGuarantorModal(false)}
                            style={{
                                width: '100%', padding: '0.5rem', borderRadius: '0.375rem',
                                background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb',
                                cursor: 'pointer', fontSize: '0.813rem'
                            }}
                        >
                            {currentLang === 'en' ? 'Close' : 'Sluiten'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <p>{currentLang === 'en' ? 'Loading...' : 'Laden...'}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !inviteContext) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.iconWrapper} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                            <AlertCircle size={28} />
                        </div>
                        <h1 className={styles.title}>{currentLang === 'en' ? 'Error' : 'Fout'}</h1>
                        <p className={styles.subtitle}>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className={styles.page}>
                <div className={styles.container}>
                    <div className={styles.card}>
                        <div className={styles.iconWrapper} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                            <CheckCircle size={28} />
                        </div>
                        <h1 className={styles.title}>
                            {currentLang === 'en' ? 'Details Submitted!' : 'Gegevens Ingediend!'}
                        </h1>
                        <p className={styles.subtitle}>
                            {currentLang === 'en'
                                ? 'Your details and documents have been saved. The main tenant can now see your information in their application.'
                                : 'Je gegevens en documenten zijn opgeslagen. De hoofdhuurder kan nu je informatie zien in hun aanvraag.'}
                        </p>

                        {/* Co-tenants can add a guarantor for themselves */}
                        {inviteContext?.role === 'Medehuurder' && (
                            <button
                                onClick={() => {
                                    setGuarantorName('');
                                    setGuarantorPhone('+');
                                    setGuarantorInviteLink(null);
                                    setInviteLinkCopied(false);
                                    setShowGuarantorModal(true);
                                }}
                                style={{
                                    marginTop: '1rem', padding: '0.625rem 1rem', borderRadius: '0.375rem',
                                    background: 'white', color: '#497772', border: '2px solid #497772',
                                    cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem', width: '100%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                }}
                            >
                                🛡️ {currentLang === 'en' ? 'Add Guarantor' : 'Garantsteller toevoegen'}
                            </button>
                        )}

                        <button
                            onClick={handleLogout}
                            style={{
                                marginTop: '1rem', padding: '0.625rem 1rem', borderRadius: '0.375rem',
                                background: '#497772', color: 'white', border: 'none', cursor: 'pointer',
                                fontWeight: 500, fontSize: '0.875rem', width: '100%'
                            }}
                        >
                            {currentLang === 'en' ? 'Done' : 'Klaar'}
                        </button>
                    </div>
                </div>
                {renderGuarantorModal()}
            </div>
        );
    }

    const roleLabel = inviteContext?.role === 'Medehuurder'
        ? (currentLang === 'en' ? 'Co-Tenant' : 'Medehuurder')
        : (currentLang === 'en' ? 'Guarantor' : 'Garantsteller');

    const labels = documentTypeLabels?.[currentLang] || documentTypeLabels?.['en'] || {};

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom, #ffffff, rgba(240,240,240,0.2))', padding: '1rem' }}>
            <div style={{ maxWidth: '32rem', margin: '0 auto' }}>
                {/* Header */}
                <div style={{
                    background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb',
                    padding: '1.5rem', marginBottom: '1rem', textAlign: 'center'
                }}>
                    <div style={{
                        width: '3rem', height: '3rem', background: 'rgba(73,119,114,0.1)', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem',
                        fontSize: '1.5rem'
                    }}>
                        {inviteContext?.role === 'Medehuurder' ? '👥' : '🛡️'}
                    </div>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: '0 0 0.25rem' }}>
                        {currentLang === 'en' ? `Your Details as ${roleLabel}` : `Jouw Gegevens als ${roleLabel}`}
                    </h1>
                    <p style={{ fontSize: '0.813rem', color: '#6b7280', margin: 0 }}>
                        {currentLang === 'en'
                            ? 'Fill in your details and upload the required documents.'
                            : 'Vul je gegevens in en upload de vereiste documenten.'}
                    </p>
                    {saving && (
                        <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
                            {currentLang === 'en' ? 'Saving...' : 'Opslaan...'}
                        </p>
                    )}
                </div>

                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem',
                        padding: '0.75rem', marginBottom: '1rem', fontSize: '0.813rem', color: '#b91c1c',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {/* Personal Details */}
                <div style={{
                    background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb',
                    padding: '1.5rem', marginBottom: '1rem'
                }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
                        {currentLang === 'en' ? 'Personal Information' : 'Persoonlijke Gegevens'}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div>
                            <label style={labelStyle}>{currentLang === 'en' ? 'Full Name' : 'Volledige Naam'} *</label>
                            <input style={inputStyle} value={naam} onChange={e => setNaam(e.target.value)} placeholder="Jan Jansen" />
                        </div>
                        <div>
                            <label style={labelStyle}>Email *</label>
                            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="naam@voorbeeld.nl" />
                        </div>
                        <div>
                            <label style={labelStyle}>{currentLang === 'en' ? 'Phone Number' : 'Telefoonnummer'}</label>
                            <input style={inputStyle} type="tel" value={telefoon} onChange={e => setTelefoon(e.target.value)} placeholder="+31 6 12345678" />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            <div>
                                <label style={labelStyle}>{currentLang === 'en' ? 'Address' : 'Adres'}</label>
                                <input style={inputStyle} value={adres} onChange={e => setAdres(e.target.value)} placeholder="Street 123" />
                            </div>
                            <div>
                                <label style={labelStyle}>{currentLang === 'en' ? 'Postcode' : 'Postcode'}</label>
                                <input style={inputStyle} value={postcode} onChange={e => setPostcode(e.target.value)} placeholder="1234 AB" />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>{currentLang === 'en' ? 'City' : 'Woonplaats'}</label>
                            <input style={inputStyle} value={woonplaats} onChange={e => setWoonplaats(e.target.value)} placeholder="Amsterdam" />
                        </div>
                        <div>
                            <label style={labelStyle}>{currentLang === 'en' ? 'Gross Monthly Income' : 'Bruto Maandinkomen'} *</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>€</span>
                                <input style={{ ...inputStyle, paddingLeft: '1.75rem' }} type="number" value={inkomen} onChange={e => setInkomen(e.target.value)} placeholder="3500" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Work Status + Documents */}
                <div style={{
                    background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb',
                    padding: '1.5rem', marginBottom: '1rem'
                }}>
                    <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem', color: '#111827' }}>
                        💼 {currentLang === 'en' ? 'Work Status & Documents' : 'Werkstatus & Documenten'}
                    </h2>

                    {inviteContext?.role === 'Garantsteller' ? (
                        <GuarantorWorkStatusSelector
                            selected={werkstatus}
                            onChange={setWerkstatus}
                        />
                    ) : (
                        <WorkStatusSelector
                            selected={werkstatus}
                            onChange={setWerkstatus}
                            labels={{
                                student: currentLang === 'en' ? 'Student' : 'Student',
                                employee: currentLang === 'en' ? 'Employee' : 'Werknemer',
                                entrepreneur: currentLang === 'en' ? 'Entrepreneur' : 'Ondernemer'
                            }}
                        />
                    )}

                    {werkstatus && (
                        <div style={{ marginTop: '1rem' }}>
                            <p style={{ fontSize: '0.813rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                                📎 {currentLang === 'en' ? 'Required Documents' : 'Benodigde Documenten'}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {requiredDocuments.map((doc) => {
                                    const docData = getDoc(doc.type);
                                    const labelData = labels[doc.type] || {};
                                    const title = labelData.name || doc.type;
                                    const description = labelData.description || doc.description;

                                    if (doc.multiFile) {
                                        const files = documenten.filter(d => d.type === doc.type);
                                        return (
                                            <MultiFileDocumentUpload
                                                key={doc.type}
                                                documentType={title}
                                                description={description}
                                                verplicht={doc.verplicht}
                                                minFiles={doc.minFiles}
                                                maxFiles={doc.maxFiles}
                                                uploadedFiles={files}
                                                onUpload={(f) => handleMultiFileUpload(doc.type, f)}
                                                onRemove={() => {}}
                                            />
                                        );
                                    }

                                    return (
                                        <InlineDocumentUpload
                                            key={doc.type}
                                            documentType={title}
                                            description={description}
                                            verplicht={doc.verplicht}
                                            status={isDocUploaded(doc.type) ? 'ontvangen' : 'ontbreekt'}
                                            fileName={docData?.name}
                                            onUpload={(f) => handleDocumentUpload(doc.type, f)}
                                            onRemove={() => {}}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {!werkstatus && (
                        <div style={{
                            marginTop: '1rem', padding: '0.75rem', background: '#fefce8',
                            borderRadius: '0.375rem', fontSize: '0.813rem', color: '#854d0e'
                        }}>
                            💡 {currentLang === 'en' ? 'Please select your work status to see required documents.' : 'Selecteer je werkstatus om de vereiste documenten te zien.'}
                        </div>
                    )}
                </div>

                {/* Submit */}
                <button
                    onClick={handleSubmit}
                    disabled={saving}
                    style={{
                        width: '100%', padding: '0.875rem', borderRadius: '0.75rem',
                        background: '#497772', color: 'white', border: 'none', cursor: 'pointer',
                        fontWeight: 600, fontSize: '1rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem'
                    }}
                >
                    <CheckCircle size={20} />
                    {currentLang === 'en' ? 'Submit My Details' : 'Mijn Gegevens Indienen'}
                </button>

                <button
                    onClick={handleLogout}
                    style={{
                        width: '100%', padding: '0.625rem', borderRadius: '0.5rem',
                        background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb',
                        cursor: 'pointer', fontSize: '0.813rem', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '0.375rem'
                    }}
                >
                    <LogOut size={14} />
                    {currentLang === 'en' ? 'Log Out' : 'Uitloggen'}
                </button>
            </div>

            {renderGuarantorModal()}
        </div>
    );
};

const labelStyle = {
    display: 'block', fontSize: '0.813rem', fontWeight: 500,
    color: '#374151', marginBottom: '0.25rem'
};

const inputStyle = {
    width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb',
    borderRadius: '0.375rem', fontSize: '0.875rem', color: '#111827',
    background: 'white', outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box'
};

export default InviteForm;
