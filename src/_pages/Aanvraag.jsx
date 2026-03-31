'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setLanguage } from '../features/ui/uiSlice';
import { LogOut, CheckCircle, Plus, AlertCircle } from 'lucide-react';
import { translations } from '../data/translations';
import { useAuth } from '../contexts/AuthContext';
import { loadAanvraagData, saveAanvraagData } from '../services/aanvraagDataService';
import { uploadDocument, deleteDocument } from '../services/documentStorageService';
import { sendTenantDataEvent, sendDocumentUploadEvent, sendMultipleDocumentsEvent } from '../services/webhookService';
import RentalConditionsSidebar from '../components/aanvraag/RentalConditionsSidebar';
import BidSection from '../components/aanvraag/BidSection';
import TenantFormSection from '../components/aanvraag/TenantFormSection';
import GuarantorFormSection from '../components/aanvraag/GuarantorFormSection';
import AddPersonModal from '../components/aanvraag/AddPersonModal';
import UploadChoiceModal from '../components/aanvraag/UploadChoiceModal';
import styles from './Aanvraag.module.css';

/**
 * Build a `pand` object from a raw Supabase apartment row.
 * Falls back to sensible defaults when fields are missing.
 */
const buildPandFromApartment = (apt) => ({
    adres: apt["Full Address"] || [apt.street, apt.area].filter(Boolean).join(', ') || apt.name || '',
    apartmentId: apt.id,
    voorwaarden: {
        huurprijs: apt.rental_price || 0,
        waarborgsom: apt.rental_price ? apt.rental_price * 2 : 0,
        servicekosten: apt.additional_notes || 'G/W/E exclusief',
        beschikbaar: apt.available_from || '-',
        minBod: apt.rental_price || 0,
        maxBod: apt.rental_price ? apt.rental_price * 2 : 0,
    },
});

const Aanvraag = () => {
    const router = useRouter();
    const pathname = usePathname();
    const dispatch = useDispatch();
    const currentLang = useSelector((state) => state.ui.language);
    const { logout, dossierId, phoneNumber, accountId } = useAuth();
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'

    useEffect(() => {
        const path = pathname.toLowerCase();
        if (path.includes('aanvraag-general') && currentLang !== 'nl') {
            dispatch(setLanguage('nl'));
        } else if (path.includes('application-general') && currentLang !== 'en') {
            dispatch(setLanguage('en'));
        }
    }, [pathname, dispatch, currentLang]);

    // Detect if we're on the general (no-apartment) route
    const isGeneralRoute = pathname.toLowerCase().includes('aanvraag-general') || pathname.toLowerCase().includes('application-general');

    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;
    const tNav = translations.nav[currentLang] || translations.nav.en;

    const [loading, setLoading] = useState(true);
    const [selectedPand, setSelectedPand] = useState(null); // loaded from localStorage
    const [data, setData] = useState(null);
    const [bidAmount, setBidAmount] = useState(0);
    const [startDate, setStartDate] = useState("");
    const [motivation, setMotivation] = useState("");
    const [monthsAdvance, setMonthsAdvance] = useState(0);
    const [tenantProgress, setTenantProgress] = useState({});

    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [showUploadChoiceModal, setShowUploadChoiceModal] = useState(false);
    const [addPersonRole, setAddPersonRole] = useState("Medehuurder");
    const [selectedUploadMethod, setSelectedUploadMethod] = useState(null);
    const [selectedTenantForGuarantor, setSelectedTenantForGuarantor] = useState(null);

    // Load apartment from localStorage (set by AppartementenSelectie)
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const raw = localStorage.getItem('selected_apartment_data');
        if (raw) {
            try {
                const apt = JSON.parse(raw);
                setSelectedPand(buildPandFromApartment(apt));
            } catch (e) {
                console.warn('[Aanvraag] Could not parse selected_apartment_data', e);
            }
        }
    }, []);

    // Load saved data on mount
    useEffect(() => {
        const loadData = async () => {
            if (!dossierId) {
                setLoading(false);
                return;
            }

            const result = await loadAanvraagData(dossierId);
            let pand = selectedPand || {
                adres: '',
                voorwaarden: { huurprijs: 0, waarborgsom: 0, servicekosten: '-', beschikbaar: '-', minBod: 0, maxBod: 0 }
            };

            // Attempt to load apartment from accounts current_bookings
            if (accountId) {
                try {
                    const { supabase: sb } = await import('../integrations/supabase/client');
                    const { data: accData, error: accError } = await sb
                        .from('accounts')
                        .select('current_bookings, documentation_status')
                        .eq('id', accountId)
                        .single();

                    if (!accError && accData?.current_bookings?.length > 0) {
                        const booking = accData.current_bookings[0];
                        if (booking.apartment_id) {
                            const { data: aptData } = await sb
                                .from('apartments')
                                .select('*')
                                .eq('id', booking.apartment_id)
                                .single();

                            if (aptData) {
                                pand = buildPandFromApartment(aptData);
                                setSelectedPand(pand);
                            }
                        }
                    }

                    // Set initial 'Not filled' status if empty
                    if (!accError && !accData?.documentation_status) {
                        await sb.from('accounts').update({ documentation_status: 'Pending' }).eq('id', accountId);
                    }

                    // Save the selected apartment to accounts.apartment_selected
                    if (pand.apartmentId) {
                        try {
                            const { data: accForApt } = await sb
                                .from('accounts')
                                .select('apartment_selected')
                                .eq('id', accountId)
                                .single();

                            const existing = accForApt?.apartment_selected || [];
                            const alreadySelected = existing.some(a => a.apartment_id === pand.apartmentId);

                            if (!alreadySelected) {
                                const aptEntry = {
                                    apartment_id: pand.apartmentId,
                                    address: pand.adres,
                                    rental_price: pand.voorwaarden?.huurprijs || null,
                                    selected_at: new Date().toISOString()
                                };
                                await sb.from('accounts').update({
                                    apartment_selected: [...existing, aptEntry]
                                }).eq('id', accountId);
                                console.log('[Aanvraag] ✓ Saved apartment to accounts.apartment_selected');
                            }
                        } catch (aptErr) {
                            console.warn('[Aanvraag] Could not update apartment_selected:', aptErr);
                        }
                    }
                } catch (e) {
                    console.warn('[Aanvraag] Could not load apartment from current_bookings', e);
                }
            }

            if (result.ok && result.data) {
                setBidAmount(result.data.bidAmount || pand.voorwaarden.huurprijs);
                setStartDate(result.data.startDate || '');
                setMotivation(result.data.motivation || '');
                setMonthsAdvance(result.data.monthsAdvance || 0);

                const personen = result.data.personen?.length > 0
                    ? result.data.personen
                    : [{
                        persoonId: "p1",
                        naam: "",
                        email: "",
                        telefoon: "",
                        rol: "Hoofdhuurder",
                        documenten: [],
                        docsCompleet: false
                    }];

                setData({ pand, personen, dossierCompleet: false });
            } else {
                const initialPerson = {
                    persoonId: "p1",
                    naam: "",
                    email: "",
                    telefoon: "",
                    rol: "Hoofdhuurder",
                    documenten: [],
                    docsCompleet: false
                };
                setData({ pand, personen: [initialPerson], dossierCompleet: false });
                setBidAmount(pand.voorwaarden.huurprijs);
            }

            setLoading(false);
        };

        loadData();
        // Re-run when selectedPand resolves (it's loaded async from localStorage)
    }, [dossierId, selectedPand]);

    // Keep data.pand in sync when selectedPand loads after data is already set
    useEffect(() => {
        if (!selectedPand || !data) return;
        setData(prev => {
            if (!prev) return prev;
            return { ...prev, pand: selectedPand };
        });
        // We only want to run this when selectedPand actually changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPand]);

    // Auto-save with debouncing
    const saveTimeoutRef = useRef(null);

    const autoSave = useCallback(async () => {
        if (!dossierId || !data) return;

        setSaveStatus('saving');

        const formData = {
            bidAmount,
            startDate,
            motivation,
            monthsAdvance,
            propertyAddress: data.pand?.adres || '',
            personen: data.personen || []
        };

        const result = await saveAanvraagData(dossierId, formData);

        // After successful DB save, also send data to n8n (fire-and-forget so webhook failures never block saving).
        if (result.ok) {
            const personen = (data.personen || []);

            personen.forEach((p) => {
                // Avoid PII in logs; webhook payload itself may contain PII and is required by product.
                sendTenantDataEvent({
                    personId: p.supabaseId || p.persoonId,
                    naam: p.naam,
                    email: p.email,
                    adres: p.adres,
                    postcode: p.postcode,
                    woonplaats: p.woonplaats,
                    inkomen: p.inkomen,
                    workStatus: p.werkstatus,
                    rol: p.rol,
                    telefoon: p.telefoon
                }).catch(() => { });
            });
        }

        if (result.ok) {
            // Check progress of page 1 to set 'Partial'
            // If they have filled some core details but haven't uploaded docs yet
            const hasData = !!(
                bidAmount > 0 ||
                startDate !== '' ||
                (data.personen && data.personen[0] && data.personen[0].naam?.trim() !== '')
            );

            // We shouldn't override if docs are complete (Complete).
            // This is just a best-effort set to Partial on autosave.
            if (hasData) {
                // Approximate completion check (avoids stale state dependency loop)
                const someDocs = data.personen?.some(p => p.documenten?.length > 0);
                if (!someDocs && accountId) {
                    updateAccountDocumentationStatus('Pending').catch(console.error);
                }
            }

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } else {
            setSaveStatus('error');
            console.error('Auto-save failed:', result.error);
        }
    }, [dossierId, data, bidAmount, startDate, motivation, monthsAdvance]);

    // Trigger auto-save when data changes
    useEffect(() => {
        if (loading || !data) return; // Don't save during initial load

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(() => {
            autoSave();
        }, 2000); // 2 second debounce

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, [bidAmount, startDate, motivation, monthsAdvance, data, loading, autoSave]);

    const calculateProgress = () => {
        if (!data) return 0;

        const hasBid = bidAmount > 0 && startDate !== "";
        const bidProgress = hasBid ? 30 : 0;

        const tenantIds = Object.keys(tenantProgress);
        if (tenantIds.length === 0) return bidProgress;

        const totalTenantProgress = tenantIds.reduce((sum, id) => {
            return sum + (tenantProgress[id]?.overallProgress || 0);
        }, 0);
        const avgTenantProgress = totalTenantProgress / tenantIds.length;
        const tenantContribution = Math.round((avgTenantProgress / 100) * 70);

        return Math.min(100, bidProgress + tenantContribution);
    };

    const handleFormDataChange = (persoonId, formDataUpdate) => {
        setTenantProgress(prev => ({
            ...prev,
            [persoonId]: formDataUpdate
        }));

        setData(prevData => {
            if (!prevData) return prevData;
            const updatedPersonen = prevData.personen.map(p => {
                if (p.persoonId === persoonId) {
                    return {
                        ...p,
                        naam: formDataUpdate.naam !== undefined ? formDataUpdate.naam : p.naam,
                        email: formDataUpdate.email !== undefined ? formDataUpdate.email : p.email,
                        telefoon: formDataUpdate.telefoon !== undefined ? formDataUpdate.telefoon : p.telefoon,
                        adres: formDataUpdate.adres !== undefined ? formDataUpdate.adres : p.adres,
                        postcode: formDataUpdate.postcode !== undefined ? formDataUpdate.postcode : p.postcode,
                        woonplaats: formDataUpdate.woonplaats !== undefined ? formDataUpdate.woonplaats : p.woonplaats,
                        werkstatus: formDataUpdate.workStatus !== undefined ? formDataUpdate.workStatus : p.werkstatus,
                        inkomen: formDataUpdate.inkomen !== undefined ? formDataUpdate.inkomen : p.inkomen
                    };
                }
                return p;
            });
            return { ...prevData, personen: updatedPersonen };
        });
    };

    const progress = calculateProgress();

    const isAllDocsComplete = () => {
        const personIds = (data?.personen || []).map(p => p.persoonId);
        if (personIds.length === 0) return false;
        return personIds.every(id => tenantProgress[id]?.isDocsComplete === true);
    };

    /**
     * Upsert all personen with their latest form data into Supabase.
     * Called after all documents are uploaded so we store the final state.
     */
    const saveAllPersonsToSupabase = useCallback(async (personen) => {
        const { supabase: sb } = await import('../integrations/supabase/client');
        if (!sb || !dossierId) return;

        for (const p of personen) {
            if (!p.supabaseId) continue; // Skip persons not yet in DB
            const nameParts = (p.naam || '').trim().split(' ');
            const voornaam = nameParts[0] || '';
            const achternaam = nameParts.slice(1).join(' ') || '';

            const updates = {
                voornaam,
                achternaam,
                email: p.email || null,
                telefoon: p.telefoon || null,
                werk_status: p.werkstatus || null,
                bruto_maandinkomen: p.inkomen ? parseFloat(p.inkomen) : null,
                huidige_adres: p.adres || null,
                postcode: p.postcode || null,
                woonplaats: p.woonplaats || null,
                updated_at: new Date().toISOString(),
            };

            const { error } = await sb
                .from('personen')
                .update(updates)
                .eq('id', p.supabaseId);

            if (error) {
                console.error('[Aanvraag] Error updating persoon:', p.supabaseId, error);
            } else {
                console.log('[Aanvraag] ✓ Saved persoon:', p.supabaseId);
            }
        }
    }, [dossierId]);

    /**
     * Update accounts.documentation_status for the logged-in user.
     * Matches account by whatsapp_number (phone) or directly via accountId.
     */
    const updateAccountDocumentationStatus = useCallback(async (status) => {
        const accId = accountId || (typeof window !== 'undefined' ? localStorage.getItem('account_id') : null);
        const phone = phoneNumber || (typeof window !== 'undefined' ? localStorage.getItem('auth_phone') : null);

        if (!accId && !phone) return;

        const { supabase: sb } = await import('../integrations/supabase/client');
        if (!sb) return;

        let query = sb.from('accounts').update({ documentation_status: status });

        if (accId) {
            query = query.eq('id', accId);
        } else {
            const normalised = phone.replace(/\s+/g, '');
            query = query.or(`whatsapp_number.eq.${normalised},whatsapp_number.eq.${phone}`);
        }

        const { error } = await query;

        if (error) {
            console.warn('[Aanvraag] Could not update accounts.documentation_status:', error.message);
        } else {
            console.log('[Aanvraag] ✓ accounts.documentation_status →', status);
        }
    }, [accountId, phoneNumber]);

    const canSubmit = isGeneralRoute
        ? isAllDocsComplete()
        : bidAmount > 0 && startDate !== '' && isAllDocsComplete();

    const handleDocumentUpload = async (persoonId, type, fileOrFiles) => {
        // Handle both single file and array of files
        // For multi-file uploads, fileOrFiles is an array that may contain:
        // - Already uploaded document objects (with id, fileName, etc.)
        // - New File objects to upload
        const allItems = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];

        // Separate File objects (new uploads) from document objects (already uploaded)
        const filesToUpload = allItems.filter(item => item instanceof File);
        const existingDocs = allItems.filter(item => !(item instanceof File) && item && typeof item === 'object');

        // Find the person
        const persoon = data.personen.find(p => p.persoonId === persoonId);
        if (!persoon) {
            console.error('Cannot upload: person not found');
            alert('Person not found. Please refresh the page.');
            return;
        }

        // Ensure person has a supabaseId - create in database if needed
        let persoonSupabaseId = persoon.supabaseId;
        if (!persoonSupabaseId) {
            // Check if person has minimum required data
            if (!persoon.naam || !persoon.email || !persoon.telefoon) {
                alert('Please fill out at least name, email, and phone number before uploading documents');
                return;
            }

            // Create person in database
            setSaveStatus('saving');
            const nameParts = (persoon.naam || '').trim().split(' ');
            const voornaam = nameParts[0] || '';
            const achternaam = nameParts.slice(1).join(' ') || '';

            const persoonData = {
                dossier_id: dossierId,
                type: persoon.rol === 'Hoofdhuurder' ? 'tenant' :
                    persoon.rol === 'Medehuurder' ? 'co_tenant' : 'guarantor',
                voornaam,
                achternaam,
                email: persoon.email || null,
                telefoon: persoon.telefoon || null,
                werk_status: persoon.werkstatus || null,
                bruto_maandinkomen: persoon.inkomen ? parseFloat(persoon.inkomen) : null,
                huidige_adres: persoon.adres || null,
                postcode: persoon.postcode || null,
                woonplaats: persoon.woonplaats || null,
                rol: persoon.rol,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { supabase } = await import('../integrations/supabase/client');
            if (supabase) {
                const { data: newPersoon, error: insertError } = await supabase
                    .from('personen')
                    .insert(persoonData)
                    .select('id')
                    .single();

                if (insertError) {
                    console.error('Error creating person:', insertError);
                    setSaveStatus('error');
                    alert(`Failed to save person: ${insertError.message}`);
                    return;
                }

                persoonSupabaseId = newPersoon.id;

                // Update state with the new supabaseId
                setData(prevData => {
                    if (!prevData) return prevData;
                    const updatedPersonen = prevData.personen.map(p => {
                        if (p.persoonId === persoonId) {
                            return { ...p, supabaseId: persoonSupabaseId };
                        }
                        return p;
                    });
                    return { ...prevData, personen: updatedPersonen };
                });
            } else {
                // Mock mode - use a mock ID
                persoonSupabaseId = 'mock-' + Date.now();
            }
        }

        // Upload new files to Supabase
        const uploadedDocs = [];
        if (filesToUpload.length > 0) {
            // Resolve the phone number: prefer persoon.telefoon, fall back to dossier phoneNumber
            const docPhoneNumber = persoon.telefoon || phoneNumber;
            const targetAccountId = persoon.accountId || (persoon.rol === 'Hoofdhuurder' ? accountId : null);

            // Resolve the main tenant's phone for sub-folder routing
            const hoofdhuurder = data.personen.find(p => p.rol === 'Hoofdhuurder');
            const mainTenantPhone = hoofdhuurder?.telefoon || phoneNumber;

            for (let fi = 0; fi < filesToUpload.length; fi++) {
                const file = filesToUpload[fi];
                setSaveStatus('saving');
                // For multi-file uploads pass file index; for single file pass null
                const fileIndex = filesToUpload.length > 1 ? (existingDocs.length + fi) : null;
                const result = await uploadDocument(persoonSupabaseId, dossierId, type, file, docPhoneNumber, targetAccountId, fileIndex, persoon.rol, mainTenantPhone);

                if (result.ok) {
                    uploadedDocs.push(result.document);
                } else {
                    console.error('Upload failed:', result.error);
                    setSaveStatus('error');
                    alert(`Upload failed: ${result.error}`);
                    return;
                }
            }
        }

        // After successful upload, also send upload event(s) to n8n (fire-and-forget so webhook never blocks uploads).
        if (filesToUpload.length > 0) {
            console.log('[Aanvraag] Sending document upload to webhook:', {
                personId: persoonSupabaseId,
                type,
                fileCount: filesToUpload.length
            });

            if (filesToUpload.length === 1) {
                sendDocumentUploadEvent(persoonSupabaseId, type, filesToUpload[0])
                    .then(() => console.log('[Aanvraag] ✓ Webhook call successful'))
                    .catch((err) => console.error('[Aanvraag] ✗ Webhook call failed:', err));
            } else {
                sendMultipleDocumentsEvent(persoonSupabaseId, type, filesToUpload)
                    .then(() => console.log('[Aanvraag] ✓ Webhook call successful'))
                    .catch((err) => console.error('[Aanvraag] ✗ Webhook call failed:', err));
            }
        } else {
            console.log('[Aanvraag] No new files to upload to webhook (only existing docs)');
        }

        // Check if this is a multi-file document type
        // Multi-file if: existing doc has files array, or we're uploading multiple files, or we have existing docs
        const docData = persoon.documenten?.find(d => d.type === type);
        const isMultiFile = docData?.files !== undefined ||
            (filesToUpload.length > 1) ||
            (existingDocs.length > 0) ||
            (filesToUpload.length === 1 && existingDocs.length > 0);

        // Update local state with uploaded documents
        const updatedPersonen = data.personen.map(p => {
            if (p.persoonId === persoonId) {
                const newDocs = [...(p.documenten || [])];
                const existingDocIdx = newDocs.findIndex(d => d.type === type);

                if (isMultiFile) {
                    // Multi-file document: store as array of files
                    const allFiles = [...existingDocs, ...uploadedDocs];
                    const docEntry = {
                        type,
                        files: allFiles,
                        status: allFiles.length > 0 ? 'ontvangen' : 'ontbreekt'
                    };

                    if (existingDocIdx >= 0) {
                        newDocs[existingDocIdx] = docEntry;
                    } else {
                        newDocs.push(docEntry);
                    }
                } else {
                    // Single-file document: store as single file
                    if (uploadedDocs.length > 0) {
                        const docEntry = {
                            ...uploadedDocs[0],
                            type,
                            status: 'ontvangen'
                        };

                        if (existingDocIdx >= 0) {
                            newDocs[existingDocIdx] = docEntry;
                        } else {
                            newDocs.push(docEntry);
                        }
                    }
                }

                return { ...p, documenten: newDocs, docsCompleet: newDocs.length >= 1 };
            }
            return p;
        });

        setData({ ...data, personen: updatedPersonen });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);

        // After updating local state, check document completion and update accounts.documentation_status
        const allPersonIds = updatedPersonen.map(p => p.persoonId);
        const allNowComplete = allPersonIds.length > 0 &&
            allPersonIds.every(id => tenantProgress[id]?.isDocsComplete === true);

        if (allNowComplete) {
            console.log('[Aanvraag] All docs complete – saving persons to Supabase...');
            saveAllPersonsToSupabase(updatedPersonen).catch(console.error);
            updateAccountDocumentationStatus('Complete').catch(console.error);
        } else {
            // Not all docs uploaded yet – set status to Pending
            updateAccountDocumentationStatus('Pending').catch(console.error);
        }
    };

    const handleAddCoTenant = () => {
        const medehuurders = data.personen.filter(p => p.rol === 'Medehuurder');
        if (medehuurders.length >= 2) {
            alert("Max co-tenants reached");
            return;
        }
        setAddPersonRole("Medehuurder");
        setShowUploadChoiceModal(true);
    };

    const handleAddGuarantor = (tenantId) => {
        const garantstellers = data.personen.filter(p => p.rol === 'Garantsteller');
        if (garantstellers.length >= 2) {
            alert("Max guarantors reached");
            return;
        }
        setSelectedTenantForGuarantor(tenantId);
        setAddPersonRole("Garantsteller");
        setShowUploadChoiceModal(true);
    };

    const handleUploadMethodSelected = (method) => {
        setSelectedUploadMethod(method);
        setShowAddPersonModal(true);
    };

    const handleAddPersonSubmit = async (name, whatsapp) => {
        let newAccountId = null;

        try {
            const { supabase: sb } = await import('../integrations/supabase/client');
            const normalizedPhone = whatsapp.replace(/\s+/g, '');

            // 1. Check if account already exists
            const { data: existingAccounts } = await sb
                .from('accounts')
                .select('id')
                .or(`whatsapp_number.eq.${normalizedPhone},whatsapp_number.eq.${whatsapp}`)
                .limit(1);

            const existingAccount = existingAccounts?.[0] || null;

            if (existingAccount) {
                newAccountId = existingAccount.id;
            } else {
                // 2. Create new account with link to main tenant
                const { data: createdAccount } = await sb
                    .from('accounts')
                    .insert({
                        tenant_name: name,
                        whatsapp_number: whatsapp,
                        status: 'Deal In Progress',
                        documentation_status: 'Pending',
                        linked_account_id: accountId || null,
                        account_role: addPersonRole === 'Medehuurder' ? 'co-tenant' : 'guarantor'
                    })
                    .select('id')
                    .maybeSingle();

                if (createdAccount) {
                    newAccountId = createdAccount.id;
                }
            }

            // 2b. If account already existed, update its link & role
            if (existingAccount && accountId) {
                await sb.from('accounts').update({
                    linked_account_id: accountId,
                    account_role: addPersonRole === 'Medehuurder' ? 'co-tenant' : 'guarantor'
                }).eq('id', existingAccount.id);
            }

            // 3. Link them to the main tenant's account
            if (newAccountId && accountId) {
                const { data: mainAcc } = await sb.from('accounts').select('co_tenants').eq('id', accountId).single();
                const existingCoTenants = mainAcc?.co_tenants || [];

                const linkObject = {
                    account_id: newAccountId,
                    role: addPersonRole,
                    name: name
                };

                if (!existingCoTenants.some(ct => ct.account_id === newAccountId)) {
                    await sb.from('accounts').update({
                        co_tenants: [...existingCoTenants, linkObject]
                    }).eq('id', accountId);
                }
            }
        } catch (err) {
            console.error('[Aanvraag] Error linking co-tenant to CRM account:', err);
        }

        const newPerson = {
            persoonId: `p${Date.now()}`,
            accountId: newAccountId,
            naam: name,
            rol: addPersonRole,
            email: "",
            telefoon: whatsapp,
            documenten: [],
            docsCompleet: false,
            linkedToPersoonId: addPersonRole === 'Garantsteller' ? selectedTenantForGuarantor : undefined
        };

        setData({
            ...data,
            personen: [...data.personen, newPerson]
        });
    };

    const handleRemovePerson = (persoonId) => {
        setData({
            ...data,
            personen: data.personen.filter(p => p.persoonId !== persoonId)
        });
        setTenantProgress(prev => {
            const updated = { ...prev };
            delete updated[persoonId];
            return updated;
        });
    };

    const handleLogout = async () => {
        await logout();
    };

    const handleSubmit = async () => {
        if (!isGeneralRoute && (!bidAmount || !startDate)) {
            alert(currentLang === 'en' ? 'Please complete the bid section' : 'Vul de biedingsectie in');
            return;
        }

        setSaveStatus('saving');
        await updateAccountDocumentationStatus('Complete');

        // Link offer to apartment and account (skip on general route)
        if (!isGeneralRoute && data.pand?.apartmentId && accountId) {
            try {
                const { supabase: sb } = await import('../integrations/supabase/client');

                // 1. Account: push to offered_apartments array
                const { data: accData } = await sb.from('accounts').select('offered_apartments').eq('id', accountId).single();
                const offeredApts = accData?.offered_apartments || [];
                if (!offeredApts.includes(data.pand.apartmentId)) {
                    await sb.from('accounts').update({
                        offered_apartments: [...offeredApts, data.pand.apartmentId]
                    }).eq('id', accountId);
                }

                // 2. Apartment: push to offers_in JSONB array
                const { data: aptData } = await sb.from('apartments').select('offers_in').eq('id', data.pand.apartmentId).single();
                const offersIn = aptData?.offers_in || [];
                const mainTenant = data.personen.find(p => p.rol === 'Hoofdhuurder');

                // Check if we already have an offer for this account to avoid duplicates
                const existingOfferIdx = offersIn.findIndex(o => o.account_id === accountId);
                const offerObj = {
                    account_id: accountId,
                    tenant_name: mainTenant?.naam || '',
                    bid_amount: bidAmount,
                    start_date: startDate,
                    motivation: motivation,
                    status: 'Pending', // New offer is pending review
                    submitted_at: new Date().toISOString()
                };

                if (existingOfferIdx >= 0) {
                    offersIn[existingOfferIdx] = offerObj;
                } else {
                    offersIn.push(offerObj);
                }

                await sb.from('apartments').update({ offers_in: offersIn }).eq('id', data.pand.apartmentId);
            } catch (err) {
                console.error('[Aanvraag] Failed to submit offer to CRM:', err);
            }
        }

        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);

        console.log("Submitting", { bidAmount, startDate, data });
        const letterPath = currentLang === 'en' ? '/en/letter-of-intent' : '/letter-of-intent';
        // Store LOI data in sessionStorage for the next page
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('loiData', JSON.stringify({
                bidAmount,
                startDate,
                motivation,
                monthsAdvance,
                tenantData: data,
                property: data.pand
            }));
        }
        router.push(letterPath);
    };

    if (loading || !data) {
        return <div className="p-8 text-center">Loading...</div>;
    }

    const alleHuurders = data.personen.filter(p => p.rol === 'Hoofdhuurder' || p.rol === 'Medehuurder');
    const garantstellers = data.personen.filter(p => p.rol === 'Garantsteller');

    return (
        <div className={styles.pageContainer}>
            <div className={styles.headerContainer}>
                <div className={styles.container}>
                    <div className={styles.topBar}>
                        {!isGeneralRoute && data.pand.adres && (
                            <p className={styles.addressText}>📍 {data.pand.adres}</p>
                        )}
                        <div className={styles.headerButtons}>
                            {!isGeneralRoute && (
                                <button className={styles.changeButton} onClick={() => router.push('/appartementen')}>
                                    {currentLang === 'en' ? 'Change Apartment' : 'Wijzig Appartement'}
                                </button>
                            )}
                            <button className={styles.logoutButton} onClick={handleLogout}>
                                <LogOut size={14} />
                                {t.logout}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <h1 className={styles.pageTitle}>{currentLang === 'en' ? 'Rental Application' : 'Huur aanvraag'}</h1>
                        {saveStatus === 'saving' && (
                            <span style={{ fontSize: '0.875rem', color: '#888' }}>💾 {currentLang === 'en' ? 'Saving...' : 'Opslaan...'}</span>
                        )}
                        {saveStatus === 'saved' && (
                            <span style={{ fontSize: '0.875rem', color: '#10b981' }}>✓ {currentLang === 'en' ? 'Saved' : 'Opgeslagen'}</span>
                        )}
                        {saveStatus === 'error' && (
                            <span style={{ fontSize: '0.875rem', color: '#ef4444' }}>⚠ {currentLang === 'en' ? 'Save failed' : 'Opslaan mislukt'}</span>
                        )}
                    </div>

                    <div className={styles.progressContainer}>
                        <div className={styles.progressLabelRow}>
                            <span className={styles.progressLabel}>{currentLang === 'en' ? 'Progress' : 'Voortgang'}</span>
                            <span className={styles.progressValue}>{progress}%</span>
                        </div>
                        <div className={styles.progressBarTrack}>
                            <div className={styles.progressBarFill} style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.container}>

                {data.dossierCompleet && (
                    <div className={styles.successAlert}>
                        <CheckCircle className={styles.alertIcon} />
                        <p className={styles.alertText}>
                            {currentLang === 'en' ? 'Application complete! You can now submit.' : 'Aanvraag compleet! Je kunt nu indienen.'}
                        </p>
                    </div>
                )}

                <div className={styles.mainLayout}>
                    {!isGeneralRoute && (
                        <RentalConditionsSidebar conditions={data.pand.voorwaarden} address={data.pand.adres} />
                    )}

                    <div className={styles.contentColumn}>

                        {!isGeneralRoute && (
                            <div className={styles.stepContainer}>
                                <div className={styles.stepHeader}>
                                    <div className={styles.stepNumber}>1</div>
                                    <h2 className={styles.stepTitle}>{currentLang === 'en' ? 'Your Bid' : 'Jouw Bod'}</h2>
                                </div>
                                <BidSection
                                    conditions={data.pand.voorwaarden}
                                    bidAmount={bidAmount}
                                    startDate={startDate}
                                    motivation={motivation}
                                    monthsAdvance={monthsAdvance}
                                    onBidAmountChange={setBidAmount}
                                    onStartDateChange={setStartDate}
                                    onMotivationChange={setMotivation}
                                    onMonthsAdvanceChange={setMonthsAdvance}
                                />
                            </div>
                        )}


                        <div className={styles.stepContainer}>
                            <div className={styles.stepHeader}>
                                <div className={styles.stepNumber}>{isGeneralRoute ? '1' : '2'}</div>
                                <h2 className={styles.stepTitle}>{currentLang === 'en' ? 'Details' : 'Gegevens'}</h2>
                            </div>

                            <div className={styles.listsContainer}>
                                {alleHuurders.map((huurder) => {
                                    const linkedGuarantor = garantstellers.find(g => g.linkedToPersoonId === huurder.persoonId);

                                    return (
                                        <div key={huurder.persoonId} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <TenantFormSection
                                                persoon={huurder}
                                                onDocumentUpload={handleDocumentUpload}
                                                onRemove={handleRemovePerson}
                                                onFormDataChange={handleFormDataChange}
                                                showUploadChoice={true}
                                            />

                                            {linkedGuarantor && (
                                                <div className={styles.guarantorWrapper}>
                                                    <GuarantorFormSection
                                                        guarantors={[linkedGuarantor]}
                                                        onDocumentUpload={handleDocumentUpload}
                                                        onRemove={handleRemovePerson}
                                                        onFormDataChange={handleFormDataChange}
                                                    />
                                                </div>
                                            )}

                                            {!linkedGuarantor && garantstellers.length < 2 && (
                                                <button
                                                    className={styles.addGuarantorButton}
                                                    onClick={() => handleAddGuarantor(huurder.persoonId)}
                                                >
                                                    <Plus size={16} />
                                                    {currentLang === 'en'
                                                        ? `Add Guarantor for ${huurder.naam}`
                                                        : `Garantsteller toevoegen voor ${huurder.naam}`}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                <button
                                    className={styles.addCoTenantButton}
                                    onClick={handleAddCoTenant}
                                    disabled={alleHuurders.length >= 2}
                                >
                                    <div className={styles.addCoTenantContent}>
                                        <div className={styles.plusIconWrapper}>
                                            <Plus size={20} />
                                        </div>
                                        <span>
                                            {alleHuurders.length >= 2
                                                ? (currentLang === 'en' ? 'Max co-tenants reached' : 'Max aantal medehuurders bereikt')
                                                : (currentLang === 'en' ? 'Add Co-Tenant' : 'Medehuurder Toevoegen')}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <button
                            className={styles.submitButton}
                            onClick={handleSubmit}
                            disabled={!canSubmit}
                        >
                            <CheckCircle size={24} />
                            {currentLang === 'en' ? 'Submit Application' : 'Aanvraag Versturen'}
                        </button>
                    </div>
                </div>
            </div>

            <UploadChoiceModal
                open={showUploadChoiceModal}
                onOpenChange={setShowUploadChoiceModal}
                role={addPersonRole}
                onSelfUpload={() => handleUploadMethodSelected('self')}
                onSendLink={() => handleUploadMethodSelected('whatsapp')}
            />

            <AddPersonModal
                open={showAddPersonModal}
                onOpenChange={setShowAddPersonModal}
                role={addPersonRole}
                onSubmit={handleAddPersonSubmit}
            />
        </div>
    );
};

export default Aanvraag;
