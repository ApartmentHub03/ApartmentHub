'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { setLanguage } from '../features/ui/uiSlice';
import { LogOut, CheckCircle, Plus, AlertCircle } from 'lucide-react';
import { translations } from '../data/translations';
import { useAuth } from '../contexts/AuthContext';
import { loadAanvraagData, saveAanvraagData, deletePersonFromSupabase } from '../services/aanvraagDataService';
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
    const { logout, dossierId, phoneNumber, accountId, isMainTenant, userRole, persoonId: authPersoonId } = useAuth();
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'

    useEffect(() => {
        const path = pathname.toLowerCase();
        if ((path.includes('/nl/') || path.includes('/aanvraag')) && !path.includes('/en/') && currentLang !== 'nl') {
            dispatch(setLanguage('nl'));
        } else if ((path.includes('/en/') || path.includes('/application')) && !path.includes('/nl/') && currentLang !== 'en') {
            dispatch(setLanguage('en'));
        }
    }, [pathname, dispatch, currentLang]);

    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;
    const tNav = translations.nav[currentLang] || translations.nav.en;

    const [loading, setLoading] = useState(true);
    const [selectedPanden, setSelectedPanden] = useState([]); // array of pand objects
    const [allSidebarPanden, setAllSidebarPanden] = useState([]); // all apartments across main + co-tenants for sidebar
    const [data, setData] = useState(null);
    const [bidAmounts, setBidAmounts] = useState({}); // { [apartmentId]: number }
    const [startDate, setStartDate] = useState("");
    const [motivation, setMotivation] = useState("");
    const [monthsAdvance, setMonthsAdvance] = useState(0);
    const [tenantProgress, setTenantProgress] = useState({});

    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [showUploadChoiceModal, setShowUploadChoiceModal] = useState(false);
    const [addPersonRole, setAddPersonRole] = useState("Medehuurder");
    const [selectedUploadMethod, setSelectedUploadMethod] = useState(null);
    const [selectedTenantForGuarantor, setSelectedTenantForGuarantor] = useState(null);
    const [inviteLink, setInviteLink] = useState(null);
    const [mainTenantApartments, setMainTenantApartments] = useState([]); // apartments available to co-tenant
    const [showApartmentPicker, setShowApartmentPicker] = useState(false);
    const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareModalName, setShareModalName] = useState('');
    const [shareModalPhone, setShareModalPhone] = useState('+');
    const [shareModalSending, setShareModalSending] = useState(false);
    const [shareModalSent, setShareModalSent] = useState(false);
    const [showRemoveConfirm, setShowRemoveConfirm] = useState(null); // persoonId to confirm removal
    const [notifyingSent, setNotifyingSent] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Apartments are loaded from Supabase accounts.apartment_selected in the data loading effect below

    // Load saved data on mount — apartments come from Supabase accounts.apartment_selected
    useEffect(() => {
        const loadData = async () => {
            if (!dossierId) {
                setLoading(false);
                return;
            }

            const result = await loadAanvraagData(dossierId);
            let panden = [];

            // Load apartments from accounts.apartment_selected (persisted in Supabase)
            const { supabase: sb } = await import('../integrations/supabase/client');

            if (accountId) {
                try {
                    const { data: accData, error: accError } = await sb
                        .from('accounts')
                        .select('current_bookings, documentation_status, apartment_selected')
                        .eq('id', accountId)
                        .single();

                    if (!accError) {
                        const savedApts = accData?.apartment_selected || [];

                        if (savedApts.length > 0) {
                            // Fetch full apartment data for all saved IDs
                            const aptIds = savedApts.map(a => a.apartment_id).filter(Boolean);
                            const { data: aptRows } = await sb
                                .from('apartments')
                                .select('*')
                                .in('id', aptIds);

                            if (aptRows && aptRows.length > 0) {
                                panden = aptRows.map(buildPandFromApartment);

                                // Restore per-apartment bids from saved data
                                const savedBids = {};
                                savedApts.forEach(a => {
                                    if (a.apartment_id && a.bid_amount) {
                                        savedBids[a.apartment_id] = a.bid_amount;
                                    }
                                });
                                if (Object.keys(savedBids).length > 0) {
                                    setBidAmounts(prev => ({ ...savedBids, ...prev }));
                                }
                            }
                        }

                        // Fallback: load from current_bookings if no apartments selected yet
                        if (panden.length === 0 && accData?.current_bookings?.length > 0) {
                            const booking = accData.current_bookings[0];
                            if (booking.apartment_id) {
                                const { data: aptData } = await sb
                                    .from('apartments')
                                    .select('*')
                                    .eq('id', booking.apartment_id)
                                    .single();

                                if (aptData) {
                                    panden = [buildPandFromApartment(aptData)];
                                }
                            }
                        }

                        // Set initial 'Not filled' status if empty
                        if (!accData?.documentation_status) {
                            await sb.from('accounts').update({ documentation_status: 'Pending' }).eq('id', accountId);
                        }
                    }
                } catch (e) {
                    console.warn('[Aanvraag] Could not load apartments from accounts', e);
                }
            }

            // For co-tenants: load the main tenant's apartments and bids
            // Uses the shared dossierId to find the main tenant's phone, then their account
            if (!isMainTenant && dossierId) {
                try {
                    // The dossier's phone_number belongs to the main tenant
                    const { data: dossierRow } = await sb
                        .from('dossiers')
                        .select('phone_number')
                        .eq('id', dossierId)
                        .single();

                    let mainAccountData = null;

                    if (dossierRow?.phone_number) {
                        const mainPhone = dossierRow.phone_number.replace(/\s+/g, '');
                        // Find the main tenant's account by their phone
                        const { data: mainAccRow } = await sb
                            .from('accounts')
                            .select('id, apartment_selected')
                            .or(`whatsapp_number.eq.${mainPhone},whatsapp_number.eq.${dossierRow.phone_number}`)
                            .limit(1)
                            .maybeSingle();

                        mainAccountData = mainAccRow;
                    }

                    // Fallback: try via linked_account_id if we have an accountId
                    if (!mainAccountData && accountId) {
                        const { data: myAcc } = await sb
                            .from('accounts')
                            .select('linked_account_id')
                            .eq('id', accountId)
                            .single();

                        if (myAcc?.linked_account_id) {
                            const { data: linkedAcc } = await sb
                                .from('accounts')
                                .select('id, apartment_selected')
                                .eq('id', myAcc.linked_account_id)
                                .single();
                            mainAccountData = linkedAcc;
                        }
                    }

                    if (mainAccountData?.apartment_selected?.length > 0) {
                        const mainApts = mainAccountData.apartment_selected;
                        const mainAptIds = mainApts.map(a => a.apartment_id).filter(Boolean);
                        const { data: mainAptRows } = await sb
                            .from('apartments')
                            .select('*')
                            .in('id', mainAptIds);

                        if (mainAptRows && mainAptRows.length > 0) {
                            const mainPanden = mainAptRows.map(buildPandFromApartment);
                            setMainTenantApartments(mainPanden);

                            // If co-tenant has no apartments selected yet, default to all main tenant's
                            if (panden.length === 0) {
                                panden = mainPanden;
                            }

                            // Load the main tenant's bid amounts so co-tenant sees real values
                            const mainBids = {};
                            mainApts.forEach(a => {
                                if (a.apartment_id && a.bid_amount) {
                                    mainBids[a.apartment_id] = a.bid_amount;
                                }
                            });
                            // Also use dossier-level bid as fallback
                            if (result.ok && result.data?.bidAmount) {
                                mainPanden.forEach(p => {
                                    if (!mainBids[p.apartmentId]) {
                                        mainBids[p.apartmentId] = result.data.bidAmount;
                                    }
                                });
                            }
                            if (Object.keys(mainBids).length > 0) {
                                setBidAmounts(prev => {
                                    // Only set if co-tenant doesn't have their own bids yet
                                    const merged = { ...mainBids };
                                    Object.keys(prev).forEach(k => { if (prev[k]) merged[k] = prev[k]; });
                                    return merged;
                                });
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Aanvraag] Could not load main tenant apartments for co-tenant:', e);
                }
            }

            // Fallback: check localStorage for pending selections (when no account exists yet)
            if (panden.length === 0 && typeof window !== 'undefined') {
                const pending = localStorage.getItem('pending_apartment_selected');
                if (pending) {
                    try {
                        const pendingApts = JSON.parse(pending);
                        const aptIds = pendingApts.map(a => a.apartment_id).filter(Boolean);
                        if (aptIds.length > 0) {
                            const { data: aptRows } = await sb
                                .from('apartments')
                                .select('*')
                                .in('id', aptIds);

                            if (aptRows && aptRows.length > 0) {
                                panden = aptRows.map(buildPandFromApartment);
                            }
                        }

                        // If account now exists, persist and clear localStorage
                        if (accountId && panden.length > 0) {
                            await sb.from('accounts').update({
                                apartment_selected: pendingApts
                            }).eq('id', accountId);
                            localStorage.removeItem('pending_apartment_selected');
                        }
                    } catch (e) {
                        console.warn('[Aanvraag] Could not parse pending_apartment_selected', e);
                    }
                }
            }

            setSelectedPanden(panden);

            // Use first apartment as legacy fallback for single-pand references
            const firstPand = panden[0] || {
                adres: '',
                voorwaarden: { huurprijs: 0, waarborgsom: 0, servicekosten: '-', beschikbaar: '-', minBod: 0, maxBod: 0 }
            };

            if (result.ok && result.data) {
                // Initialize per-apartment bid amounts (saved bids take priority, then dossier-level, then rental price)
                const initialBids = {};
                panden.forEach(p => {
                    initialBids[p.apartmentId] = p.voorwaarden.huurprijs;
                });
                // Dossier-level bid as fallback for all
                if (result.data.bidAmount) {
                    panden.forEach(p => {
                        if (!initialBids[p.apartmentId] || initialBids[p.apartmentId] === p.voorwaarden.huurprijs) {
                            initialBids[p.apartmentId] = result.data.bidAmount;
                        }
                    });
                }
                setBidAmounts(prev => ({ ...initialBids, ...prev }));
                setStartDate(result.data.startDate || '');
                setMotivation(result.data.motivation || '');
                setMonthsAdvance(result.data.monthsAdvance || 0);

                const personen = result.data.personen?.length > 0
                    ? result.data.personen.map(p => {
                        // Autofill main tenant's phone from auth if empty
                        if (p.rol === 'Hoofdhuurder' && !p.telefoon && phoneNumber) {
                            return { ...p, telefoon: phoneNumber };
                        }
                        return p;
                    })
                    : [{
                        persoonId: "p1",
                        naam: "",
                        email: "",
                        telefoon: phoneNumber || "",
                        rol: "Hoofdhuurder",
                        documenten: [],
                        docsCompleet: false
                    }];

                setData({ panden, pand: firstPand, personen, dossierCompleet: false });
            } else {
                const initialPerson = {
                    persoonId: "p1",
                    naam: "",
                    email: "",
                    telefoon: phoneNumber || "",
                    rol: "Hoofdhuurder",
                    documenten: [],
                    docsCompleet: false
                };
                setData({ panden, pand: firstPand, personen: [initialPerson], dossierCompleet: false });
                const initialBids = {};
                panden.forEach(p => { initialBids[p.apartmentId] = p.voorwaarden.huurprijs; });
                setBidAmounts(prev => ({ ...initialBids, ...prev }));
            }

            // Load all apartments across main tenant + co-tenants for the sidebar
            try {
                const sidebarApts = [...panden];
                if (isMainTenant && accountId) {
                    // Main tenant: find co-tenant accounts linked to this account and gather their apartments
                    const { data: linkedAccounts } = await sb
                        .from('accounts')
                        .select('id, tenant_name, apartment_selected')
                        .eq('linked_account_id', accountId)
                        .eq('account_role', 'co-tenant');

                    if (linkedAccounts?.length > 0) {
                        for (const acc of linkedAccounts) {
                            const coApts = acc.apartment_selected || [];
                            for (const a of coApts) {
                                if (a.apartment_id && !sidebarApts.some(p => p.apartmentId === a.apartment_id)) {
                                    const { data: aptRow } = await sb
                                        .from('apartments')
                                        .select('*')
                                        .eq('id', a.apartment_id)
                                        .single();
                                    if (aptRow) sidebarApts.push(buildPandFromApartment(aptRow));
                                }
                            }
                        }
                    }
                } else if (!isMainTenant) {
                    // Co-tenant: also include main tenant's apartments
                    for (const apt of mainTenantApartments) {
                        if (!sidebarApts.some(p => p.apartmentId === apt.apartmentId)) {
                            sidebarApts.push(apt);
                        }
                    }
                }
                setAllSidebarPanden(sidebarApts);
            } catch (e) {
                console.warn('[Aanvraag] Could not load sidebar apartments', e);
                setAllSidebarPanden(panden);
            }

            setLoading(false);
        };

        loadData();
    }, [dossierId, accountId]);

    // Auto-save with debouncing
    const saveTimeoutRef = useRef(null);

    const autoSave = useCallback(async () => {
        if (!dossierId || !data) return;

        setSaveStatus('saving');

        // Use first apartment's bid for dossier-level save (backward compat)
        const firstPand = data.panden?.[0] || data.pand;
        const firstBid = firstPand?.apartmentId ? (bidAmounts[firstPand.apartmentId] || 0) : 0;
        const allAddresses = (data.panden || []).map(p => p.adres).filter(Boolean).join(', ');

        const formData = {
            bidAmount: firstBid,
            startDate,
            motivation,
            monthsAdvance,
            propertyAddress: allAddresses || data.pand?.adres || '',
            personen: data.personen || []
        };

        const result = await saveAanvraagData(dossierId, formData);

        // Also save per-apartment bids to accounts.apartment_selected
        if (result.ok && accountId && data.panden?.length > 0) {
            try {
                const { supabase: sb } = await import('../integrations/supabase/client');
                const updatedSelected = data.panden.map(p => ({
                    apartment_id: p.apartmentId,
                    address: p.adres,
                    rental_price: p.voorwaarden?.huurprijs || null,
                    bid_amount: bidAmounts[p.apartmentId] || null,
                    start_date: startDate || null,
                    motivation: motivation || null,
                    months_advance: monthsAdvance || 0,
                    selected_at: new Date().toISOString()
                }));
                await sb.from('accounts').update({
                    apartment_selected: updatedSelected
                }).eq('id', accountId);
            } catch (e) {
                console.warn('[Aanvraag] Could not save per-apartment bids:', e);
            }
        }

        // After successful DB save, sync back any new supabaseIds to state
        if (result.ok && result.personen) {
            const needsUpdate = result.personen.some((p, i) =>
                p.supabaseId && (!data.personen[i]?.supabaseId || data.personen[i].supabaseId !== p.supabaseId)
            );
            if (needsUpdate) {
                setData(prev => {
                    if (!prev) return prev;
                    const updatedPersonen = prev.personen.map(person => {
                        const saved = result.personen.find(p => p.persoonId === person.persoonId);
                        if (saved?.supabaseId && !person.supabaseId) {
                            return { ...person, supabaseId: saved.supabaseId };
                        }
                        return person;
                    });
                    return { ...prev, personen: updatedPersonen };
                });
            }
        }

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
                Object.values(bidAmounts).some(b => b > 0) ||
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
    }, [dossierId, data, bidAmounts, startDate, motivation, monthsAdvance, accountId]);

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
    }, [bidAmounts, startDate, motivation, monthsAdvance, data, loading, autoSave]);

    const calculateProgress = () => {
        if (!data) return 0;

        const hasAnyBid = Object.values(bidAmounts).some(b => b > 0) && startDate !== "";
        const bidProgress = hasAnyBid ? 30 : 0;

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
        // Check for duplicate phone number
        if (formDataUpdate.telefoon !== undefined) {
            const isDup = isPhoneDuplicate(formDataUpdate.telefoon, persoonId);
            formDataUpdate.phoneDuplicate = isDup;
        }

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
        const personen = data?.personen || [];
        if (personen.length === 0) return false;
        // For each person, check if they have reported progress.
        // If they haven't selected a work status yet (no progress entry),
        // treat them as complete (no required docs to check).
        return personen.every(p => {
            const progress = tenantProgress[p.persoonId];
            if (!progress) return true; // No progress tracked yet — no work status selected
            return progress.isDocsComplete === true;
        });
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

    const hasPhoneDuplicates = () => {
        if (!data?.personen) return false;
        const phones = data.personen
            .map(p => (p.telefoon || '').replace(/\s+/g, ''))
            .filter(p => p && p !== '+');
        return new Set(phones).size !== phones.length;
    };

    const isAllFormsComplete = () => {
        const personen = data?.personen || [];
        if (personen.length === 0) return false;
        return personen.every(p => {
            const progress = tenantProgress[p.persoonId];
            if (!progress) return true; // No progress tracked yet
            // isFormComplete is only reported by TenantFormSection (not GuarantorFormSection),
            // so treat undefined as true — guarantors don't have the same form fields.
            if (progress.isFormComplete === undefined) return true;
            return progress.isFormComplete === true;
        });
    };

    const canSubmit = Object.values(bidAmounts).some(b => b > 0) && startDate !== '' && isAllDocsComplete() && isAllFormsComplete() && !hasPhoneDuplicates();

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
            // Check if person has minimum required data (name is enough to create the record)
            if (!persoon.naam) {
                alert(currentLang === 'en' ? 'Please fill out at least the name before uploading documents' : 'Vul minstens de naam in voordat je documenten uploadt');
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

            setSaveStatus('saving');
            // Use indexed storage paths whenever this is a multi-file slot,
            // i.e. either uploading >1 file at once OR adding to existing files.
            // Otherwise the new upload would overwrite the previous one in storage
            // (upsert: true on the same `{phone}/loonstroken.pdf` path).
            const useIndexedNames = filesToUpload.length > 1 || existingDocs.length > 0;
            const uploadPromises = filesToUpload.map((file, fi) => {
                const fileIndex = useIndexedNames ? (existingDocs.length + fi) : null;
                return uploadDocument(persoonSupabaseId, dossierId, type, file, docPhoneNumber, targetAccountId, fileIndex, persoon.rol, mainTenantPhone);
            });

            const results = await Promise.all(uploadPromises);
            for (const result of results) {
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

        // Update local state with uploaded documents using callback form
        // to preserve any concurrent state updates (e.g. supabaseId assignment)
        setData(prevData => {
            if (!prevData) return prevData;
            const updatedPersonen = prevData.personen.map(p => {
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

            // Check document completion
            const allPersonIds = updatedPersonen.map(p => p.persoonId);
            const allNowComplete = allPersonIds.length > 0 &&
                allPersonIds.every(id => tenantProgress[id]?.isDocsComplete === true);

            if (allNowComplete) {
                console.log('[Aanvraag] All docs complete – saving persons to Supabase...');
                saveAllPersonsToSupabase(updatedPersonen).catch(console.error);
                updateAccountDocumentationStatus('Complete').catch(console.error);
            } else {
                updateAccountDocumentationStatus('Pending').catch(console.error);
            }

            return { ...prevData, personen: updatedPersonen };
        });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleDocumentRemove = async (persoonId, docType) => {
        const persoon = data.personen.find(p => p.persoonId === persoonId);
        if (!persoon) return;

        const doc = (persoon.documenten || []).find(d => d.type === docType);

        // Remove from local state immediately
        const updatedPersonen = data.personen.map(p => {
            if (p.persoonId === persoonId) {
                return {
                    ...p,
                    documenten: (p.documenten || []).filter(d => d.type !== docType)
                };
            }
            return p;
        });
        setData({ ...data, personen: updatedPersonen });

        // Delete from Supabase (storage + metadata)
        if (doc?.file?.id) {
            const result = await deleteDocument(doc.file.id);
            if (!result.ok) {
                console.error('[Aanvraag] Failed to delete document:', result.error);
            }
        } else if (doc?.id) {
            const result = await deleteDocument(doc.id);
            if (!result.ok) {
                console.error('[Aanvraag] Failed to delete document:', result.error);
            }
        }
    };

    const handleAddCoTenant = () => {
        const medehuurders = data.personen.filter(p => p.rol === 'Medehuurder');
        if (medehuurders.length >= 4) {
            alert(currentLang === 'en' ? "Max co-tenants reached" : "Max aantal medehuurders bereikt");
            return;
        }
        setAddPersonRole("Medehuurder");
        setShowUploadChoiceModal(true);
    };

    const handleAddGuarantor = (tenantId) => {
        setSelectedTenantForGuarantor(tenantId);
        setAddPersonRole("Garantsteller");
        setShowUploadChoiceModal(true);
    };

    const generateInviteLink = async () => {
        try {
            const { supabase: sb } = await import('../integrations/supabase/client');
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

            const { data: inviteResult, error: inviteError } = await sb.functions.invoke('generate-invite', {
                body: {
                    dossier_id: dossierId,
                    role: addPersonRole,
                    name: shareModalName || null,
                    linked_to_persoon_id: addPersonRole === 'Garantsteller' && selectedTenantForGuarantor ? selectedTenantForGuarantor.replace(/^p/, '') : null,
                    auth_token: token
                }
            });

            if (inviteError || !inviteResult?.ok) {
                console.error('[Aanvraag] Failed to generate invite:', inviteError || inviteResult);
                return null;
            }

            const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
            return `${baseUrl}/invite?token=${inviteResult.invite_token}`;
        } catch (err) {
            console.error('[Aanvraag] Error generating invite:', err);
            return null;
        }
    };

    const handleShareModalSend = async () => {
        if (!shareModalName.trim() || !shareModalPhone.trim() || shareModalPhone === '+') return;

        setShareModalSending(true);

        // Generate invite link if not already generated
        let link = inviteLink;
        if (!link) {
            link = await generateInviteLink();
            if (!link) {
                alert(currentLang === 'en' ? 'Failed to generate invite link' : 'Uitnodigingslink genereren mislukt');
                setShareModalSending(false);
                return;
            }
            setInviteLink(link);
        }

        // Send WhatsApp invitation via n8n webhook
        try {
            await fetch('https://davidvanwachem.app.n8n.cloud/webhook/get-agenda-page-details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventType: 'invite_co_tenant',
                    name: shareModalName,
                    phone_number: shareModalPhone,
                    invite_link: link,
                    role: addPersonRole,
                    invited_by: phoneNumber,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (err) {
            console.warn('[Aanvraag] Webhook for invite failed (non-blocking):', err);
        }

        // Also add the person to the dossier
        await handleAddPersonSubmit(shareModalName, shareModalPhone);

        setShareModalSending(false);
        setShareModalSent(true);
    };

    const handleUploadMethodSelected = async (method) => {
        setSelectedUploadMethod(method);

        if (method === 'whatsapp') {
            // Show share modal with Name + Phone fields
            setShareModalName('');
            setShareModalPhone('+');
            setShareModalSent(false);
            setInviteLink(null);
            setInviteLinkCopied(false);
            setShowShareModal(true);
        } else {
            // Directly add empty person card inline — no popup
            const newPerson = {
                persoonId: `p${Date.now()}`,
                naam: '',
                rol: addPersonRole,
                email: '',
                telefoon: '',
                documenten: [],
                docsCompleet: false,
                linkedToPersoonId: addPersonRole === 'Garantsteller' ? selectedTenantForGuarantor : undefined
            };
            setData(prev => ({
                ...prev,
                personen: [...prev.personen, newPerson]
            }));
        }
    };

    // Check if a phone number is already used by another person in this dossier
    const isPhoneDuplicate = useCallback((phone, excludePersoonId = null) => {
        if (!phone || !data?.personen) return false;
        const normalized = phone.replace(/\s+/g, '');
        if (!normalized || normalized === '+') return false;
        return data.personen.some(p => {
            if (excludePersoonId && p.persoonId === excludePersoonId) return false;
            const pPhone = (p.telefoon || '').replace(/\s+/g, '');
            return pPhone && (pPhone === normalized || pPhone === phone);
        });
    }, [data?.personen]);

    // Also check against the logged-in user's phone
    const isPhoneDuplicateWithAuth = useCallback((phone, excludePersoonId = null) => {
        if (!phone) return false;
        const normalized = phone.replace(/\s+/g, '');
        if (!normalized || normalized === '+') return false;
        // Check against all existing personen
        if (isPhoneDuplicate(phone, excludePersoonId)) return true;
        // Check against the auth phone (main tenant's login phone)
        const authPhone = (phoneNumber || '').replace(/\s+/g, '');
        if (authPhone && authPhone === normalized) {
            // Only flag as duplicate if excluding self — the main tenant's phone IS expected on their card
            const mainTenant = data?.personen?.find(p => p.rol === 'Hoofdhuurder');
            if (excludePersoonId && mainTenant?.persoonId === excludePersoonId) return false;
            if (!excludePersoonId) return true;
            return true;
        }
        return false;
    }, [isPhoneDuplicate, phoneNumber, data?.personen]);

    const handleAddPersonSubmit = async (name, whatsapp) => {
        // Validate: no duplicate phone numbers
        if (isPhoneDuplicateWithAuth(whatsapp)) {
            alert(currentLang === 'en'
                ? 'This phone number is already used by another person in this application. Each person must have a unique phone number.'
                : 'Dit telefoonnummer wordt al gebruikt door een andere persoon in deze aanvraag. Elke persoon moet een uniek telefoonnummer hebben.');
            return;
        }

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

    const handleRemovePerson = async (persoonId) => {
        const personToRemove = data.personen.find(p => p.persoonId === persoonId);

        // Check if co-tenant is removing themselves — show confirmation
        const isSelfRemoval = !isMainTenant && personToRemove?.supabaseId === authPersoonId;
        if (isSelfRemoval) {
            setShowRemoveConfirm(persoonId);
            return;
        }

        await executeRemovePerson(persoonId);
    };

    const executeRemovePerson = async (persoonId) => {
        const personToRemove = data.personen.find(p => p.persoonId === persoonId);
        const isSelfRemoval = !isMainTenant && personToRemove?.supabaseId === authPersoonId;

        // Remove from local state immediately
        setData({
            ...data,
            personen: data.personen.filter(p => p.persoonId !== persoonId)
        });
        setTenantProgress(prev => {
            const updated = { ...prev };
            delete updated[persoonId];
            return updated;
        });

        // Delete from Supabase if the person exists in DB
        if (personToRemove?.supabaseId) {
            const result = await deletePersonFromSupabase(
                personToRemove.supabaseId,
                accountId,
                personToRemove.accountId || null
            );
            if (!result.ok) {
                console.error('[Aanvraag] Failed to delete person from Supabase:', result.error);
            }
        }

        // If co-tenant removed themselves, logout and redirect to login
        if (isSelfRemoval) {
            await logout();
            router.replace('/login');
        }
    };

    const handleCoTenantApartmentToggle = async (apartmentId) => {
        const currentIds = (data?.panden || []).map(p => p.apartmentId);
        const isSelected = currentIds.includes(apartmentId);

        let newPanden;
        if (isSelected) {
            // Deselect — but must keep at least one
            if (currentIds.length <= 1) return;
            newPanden = (data?.panden || []).filter(p => p.apartmentId !== apartmentId);
        } else {
            // Select only 1 apartment at a time
            const toAdd = mainTenantApartments.find(p => p.apartmentId === apartmentId);
            if (!toAdd) return;
            newPanden = [toAdd];
        }

        setSelectedPanden(newPanden);
        setData(prev => prev ? { ...prev, panden: newPanden, pand: newPanden[0] } : prev);

        // Initialize bid for newly added apartment
        if (!isSelected) {
            const added = mainTenantApartments.find(p => p.apartmentId === apartmentId);
            if (added) {
                setBidAmounts(prev => ({ ...prev, [apartmentId]: prev[apartmentId] || added.voorwaarden.huurprijs }));
            }
        }

        // Persist to co-tenant's account
        if (accountId) {
            try {
                const { supabase: sb } = await import('../integrations/supabase/client');
                const aptEntries = newPanden.map(p => ({
                    apartment_id: p.apartmentId,
                    address: p.adres,
                    rental_price: p.voorwaarden?.huurprijs || null,
                    selected_at: new Date().toISOString()
                }));
                await sb.from('accounts').update({ apartment_selected: aptEntries }).eq('id', accountId);
            } catch (e) {
                console.warn('[Aanvraag] Could not save co-tenant apartment selection', e);
            }
        }
    };

    const handleLogout = async () => {
        await logout();
    };

    const handleSubmitClick = async () => {
        if (!Object.values(bidAmounts).some(b => b > 0) || !startDate) {
            alert(currentLang === 'en' ? 'Please complete the bid section' : 'Vul de biedingsectie in');
            return;
        }

        // Apartment must be selected before submit (same flow for main + co-tenant)
        const selectedPanden = data?.panden || (data?.pand?.apartmentId ? [data.pand] : []);
        if (selectedPanden.length === 0) {
            alert(currentLang === 'en'
                ? 'Please select an apartment before submitting.'
                : 'Selecteer een appartement voordat u indient.');
            return;
        }

        // Save application data + mark documentation as complete
        setIsSubmitting(true);
        setSaveStatus('saving');
        await updateAccountDocumentationStatus('Complete');

        // Save current form state so it persists
        const formData = {
            bidAmount: Object.values(bidAmounts).find(b => b > 0) || 0,
            startDate,
            motivation,
            monthsAdvance,
            propertyAddress: (data.panden || []).map(p => p.adres).filter(Boolean).join(', ') || data.pand?.adres || '',
            personen: data.personen || []
        };
        await saveAanvraagData(dossierId, formData);

        // Store LOI data in sessionStorage for later use
        if (typeof window !== 'undefined') {
            const panden = data.panden || (data.pand?.apartmentId ? [data.pand] : []);
            const firstPand = panden[0] || data.pand;
            sessionStorage.setItem('loiData', JSON.stringify({
                bidAmount: firstPand ? (bidAmounts[firstPand.apartmentId] || bidAmounts['__default'] || 0) : 0,
                bidAmounts,
                startDate,
                motivation,
                monthsAdvance,
                tenantData: data,
                property: firstPand,
                properties: panden
            }));
        }

        // For main tenants, link offers to selected apartments before redirecting
        // (this is what /appartementen used to do via the fromSubmitFlow detour)
        if (isMainTenant && accountId) {
            try {
                const { supabase: sb } = await import('../integrations/supabase/client');
                const { data: accData } = await sb
                    .from('accounts')
                    .select('offered_apartments')
                    .eq('id', accountId)
                    .single();
                let updatedOffered = accData?.offered_apartments || [];

                const mainTenantName = data.personen.find(p => p.rol === 'Hoofdhuurder')?.naam || '';

                for (const p of selectedPanden) {
                    if (!p.apartmentId) continue;
                    if (!updatedOffered.includes(p.apartmentId)) {
                        updatedOffered.push(p.apartmentId);
                    }

                    const { data: aptData } = await sb
                        .from('apartments')
                        .select('offers_in')
                        .eq('id', p.apartmentId)
                        .single();
                    const offersIn = aptData?.offers_in || [];
                    const bidAmount = bidAmounts[p.apartmentId] || bidAmounts['__default'] || p.voorwaarden?.huurprijs || 0;

                    const existingIdx = offersIn.findIndex(o => o.account_id === accountId);
                    const offerObj = {
                        account_id: accountId,
                        tenant_name: mainTenantName,
                        bid_amount: bidAmount,
                        start_date: startDate,
                        motivation: motivation,
                        status: 'Pending',
                        submitted_at: new Date().toISOString()
                    };

                    if (existingIdx >= 0) {
                        offersIn[existingIdx] = offerObj;
                    } else {
                        offersIn.push(offerObj);
                    }

                    await sb.from('apartments').update({ offers_in: offersIn }).eq('id', p.apartmentId);
                }

                await sb.from('accounts').update({ offered_apartments: updatedOffered }).eq('id', accountId);
            } catch (e) {
                console.warn('[Aanvraag] Could not link offers to apartments on submit:', e);
            }
        }

        setSaveStatus('saved');
        setIsSubmitting(false);

        // Both main tenant and co-tenant: apartment is already selected, go directly to LOI
        router.push(currentLang === 'en' ? '/en/letter-of-intent' : '/letter-of-intent');
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
                        {(data.panden?.length > 0 || data.pand?.adres) && (
                            <p className={styles.addressText}>
                                {(data.panden || [data.pand]).filter(Boolean).map(p => p.adres).filter(Boolean).join(' | ')}
                            </p>
                        )}
                        <div className={styles.headerButtons}>
                            {!isMainTenant && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', padding: '0.25rem 0.5rem', background: '#f3f4f6', borderRadius: '0.25rem' }}>
                                    {userRole === 'co_tenant'
                                        ? (currentLang === 'en' ? 'Co-Tenant View' : 'Medehuurder weergave')
                                        : (currentLang === 'en' ? 'Guarantor View' : 'Garantsteller weergave')}
                                </span>
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
                    <RentalConditionsSidebar
                        conditions={data.pand?.voorwaarden}
                        address={data.pand?.adres}
                        panden={allSidebarPanden.length > 0 ? allSidebarPanden : data.panden}
                    />

                    <div className={styles.contentColumn}>

                        {/* Co-tenant warning banner */}
                        {!isMainTenant && (
                            <div className={styles.coTenantWarningBanner}>
                                <AlertCircle size={18} />
                                <span>
                                    {currentLang === 'en'
                                        ? 'You are logged in as a co-tenant. You can only edit your own details. Other sections are managed by the main tenant.'
                                        : 'U bent ingelogd als medehuurder. U kunt alleen uw eigen gegevens bewerken. Andere secties worden beheerd door de hoofdhuurder.'}
                                </span>
                            </div>
                        )}

                        {/* Choose apartment (same flow for main tenant and co-tenant) */}
                        <div className={styles.stepContainer}>
                            <div className={styles.stepHeader}>
                                <div className={styles.stepNumber}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                </div>
                                <h2 className={styles.stepTitle}>
                                    {currentLang === 'en' ? 'Choose Apartment' : 'Kies Appartement'}
                                </h2>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: '#6b7280', margin: '0 0 0.75rem', paddingLeft: '0.25rem' }}>
                                {currentLang === 'en'
                                    ? 'Select the apartment you want to apply for'
                                    : 'Selecteer het appartement waarvoor u wilt solliciteren'}
                            </p>
                            {data?.panden?.length > 0 && (
                                <div style={{
                                    background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '0.5rem',
                                    padding: '0.75rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem'
                                }}>
                                    <CheckCircle size={16} style={{ color: '#16a34a' }} />
                                    <span style={{ fontSize: '0.875rem', color: '#15803d' }}>
                                        {data.panden[0].adres} — {'\u20AC'}{data.panden[0].voorwaarden?.huurprijs || 0}{currentLang === 'en' ? '/mo' : '/mnd'}
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={() => router.push('/appartementen')}
                                disabled={!isMainTenant && mainTenantApartments.length === 0}
                                style={{
                                    width: '100%', padding: '0.75rem', borderRadius: '0.5rem',
                                    background: data?.panden?.length > 0 ? 'white' : '#497772',
                                    color: data?.panden?.length > 0 ? '#497772' : 'white',
                                    border: data?.panden?.length > 0 ? '2px solid #497772' : 'none',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                }}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                                {data?.panden?.length > 0
                                    ? (currentLang === 'en' ? 'Change Apartment' : 'Appartement Wijzigen')
                                    : (currentLang === 'en' ? 'Select Apartment' : 'Appartement Selecteren')}
                            </button>
                        </div>

                        <div className={styles.stepContainer}>
                            <div className={styles.stepHeader}>
                                <div className={styles.stepNumber}>1</div>
                                <h2 className={styles.stepTitle}>{currentLang === 'en' ? 'Your Bid' : 'Jouw Bod'}</h2>
                            </div>
                            <BidSection
                                conditions={data.pand?.voorwaarden}
                                bidAmount={bidAmounts[data.pand?.apartmentId || '__default'] || 0}
                                startDate={startDate}
                                motivation={motivation}
                                monthsAdvance={monthsAdvance}
                                onBidAmountChange={(val) => {
                                    setBidAmounts(prev => {
                                        const updated = { ...prev };
                                        const targets = (data.panden && data.panden.length > 0) ? data.panden : [data.pand].filter(Boolean);
                                        if (targets.length > 0) {
                                            targets.forEach(p => {
                                                updated[p.apartmentId || '__default'] = val;
                                            });
                                        } else {
                                            updated['__default'] = val;
                                        }
                                        return updated;
                                    });
                                }}
                                onStartDateChange={setStartDate}
                                onMotivationChange={setMotivation}
                                onMonthsAdvanceChange={setMonthsAdvance}
                            />
                        </div>


                        <div className={styles.stepContainer}>
                            <div className={styles.stepHeader}>
                                <div className={styles.stepNumber}>2</div>
                                <h2 className={styles.stepTitle}>{currentLang === 'en' ? 'Details' : 'Gegevens'}</h2>
                            </div>

                            <div className={styles.listsContainer}>
                                {alleHuurders.map((huurder) => {
                                    const linkedGuarantors = garantstellers.filter(g => g.linkedToPersoonId === huurder.persoonId);
                                    // Determine if this person's card is editable by the current user
                                    const isOwnCard = !isMainTenant && huurder.supabaseId === authPersoonId;
                                    const huurderReadOnly = !isMainTenant && !isOwnCard;
                                    // Income is only visible on your own card
                                    const isViewingOwnTenantCard = isMainTenant
                                        ? huurder.rol === 'Hoofdhuurder'
                                        : huurder.supabaseId === authPersoonId;
                                    // Co-tenant can add guarantor for themselves
                                    const canAddGuarantor = isMainTenant || isOwnCard;

                                    return (
                                        <div key={huurder.persoonId} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <TenantFormSection
                                                persoon={huurder}
                                                onDocumentUpload={handleDocumentUpload}
                                                onDocumentRemove={huurderReadOnly ? undefined : handleDocumentRemove}
                                                onRemove={huurderReadOnly ? undefined : handleRemovePerson}
                                                onFormDataChange={handleFormDataChange}
                                                showUploadChoice={true}
                                                readOnly={huurderReadOnly}
                                                hideIncome={!isViewingOwnTenantCard}
                                                isPhoneDuplicate={isPhoneDuplicate}
                                                isOwnCard={isOwnCard}
                                            />

                                            {linkedGuarantors.map(g => {
                                                // Co-tenant can edit: guarantor linked to their own card, or if they ARE the guarantor
                                                const gIsOwn = !isMainTenant && g.supabaseId === authPersoonId;
                                                const gLinkedToOwn = isOwnCard;
                                                const gReadOnly = !isMainTenant && !gIsOwn && !gLinkedToOwn;
                                                // Only the guarantor themselves can see their own income
                                                const gIsself = g.supabaseId === authPersoonId;
                                                return (
                                                    <div key={g.persoonId} className={styles.guarantorWrapper}>
                                                        <GuarantorFormSection
                                                            guarantors={[g]}
                                                            onDocumentUpload={handleDocumentUpload}
                                                            onDocumentRemove={gReadOnly ? undefined : handleDocumentRemove}
                                                            onRemove={gReadOnly ? undefined : handleRemovePerson}
                                                            onFormDataChange={handleFormDataChange}
                                                            readOnly={gReadOnly}
                                                            hideIncome={!gIsself}
                                                        />
                                                    </div>
                                                );
                                            })}

                                            {canAddGuarantor && (
                                                <button
                                                    className={styles.addGuarantorButton}
                                                    onClick={() => handleAddGuarantor(huurder.persoonId)}
                                                >
                                                    <Plus size={16} />
                                                    {currentLang === 'en'
                                                        ? `Add Guarantor for ${huurder.naam || (isOwnCard ? 'yourself' : '')}`
                                                        : `Garantsteller toevoegen voor ${huurder.naam || (isOwnCard ? 'jezelf' : '')}`}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Show any guarantors not linked to a specific tenant */}
                                {garantstellers
                                    .filter(g => !g.linkedToPersoonId || !alleHuurders.some(h => h.persoonId === g.linkedToPersoonId))
                                    .map(g => {
                                        const gIsOwn = !isMainTenant && g.supabaseId === authPersoonId;
                                        const gReadOnly = !isMainTenant && !gIsOwn;
                                        const gIsself = g.supabaseId === authPersoonId;
                                        return (
                                            <div key={g.persoonId} className={styles.guarantorWrapper}>
                                                <GuarantorFormSection
                                                    guarantors={[g]}
                                                    onDocumentUpload={handleDocumentUpload}
                                                    onDocumentRemove={gReadOnly ? undefined : handleDocumentRemove}
                                                    onRemove={gReadOnly ? undefined : handleRemovePerson}
                                                    onFormDataChange={handleFormDataChange}
                                                    readOnly={gReadOnly}
                                                    hideIncome={!gIsself}
                                                />
                                            </div>
                                        );
                                    })
                                }

                                <button
                                    className={styles.addCoTenantButton}
                                    onClick={handleAddCoTenant}
                                    disabled={alleHuurders.length >= 5}
                                >
                                    <div className={styles.addCoTenantContent}>
                                        <div className={styles.plusIconWrapper}>
                                            <Plus size={20} />
                                        </div>
                                        <span>
                                            {alleHuurders.length >= 5
                                                ? (currentLang === 'en' ? 'Max co-tenants reached' : 'Max aantal medehuurders bereikt')
                                                : (currentLang === 'en' ? 'Add Co-Tenant' : 'Medehuurder Toevoegen')}
                                        </span>
                                    </div>
                                </button>
                            </div>
                        </div>

                        <button
                            className={styles.submitButton}
                            onClick={handleSubmitClick}
                            disabled={!canSubmit || isSubmitting}
                        >
                            <CheckCircle size={24} />
                            {isSubmitting
                                ? (currentLang === 'en' ? 'Submitting...' : 'Indienen...')
                                : (currentLang === 'en' ? 'Submit Application' : 'Aanvraag Versturen')}
                        </button>

                        {!isMainTenant && (
                            <button
                                className={styles.submitButton}
                                style={{
                                    background: notifyingSent ? '#10b981' : 'white',
                                    color: notifyingSent ? 'white' : '#497772',
                                    border: '2px solid #497772',
                                    marginTop: '0.5rem'
                                }}
                                onClick={async () => {
                                    if (notifyingSent) return;
                                    try {
                                        const { supabase: sb } = await import('../integrations/supabase/client');
                                        const { data: dossierRow } = await sb
                                            .from('dossiers')
                                            .select('phone_number')
                                            .eq('id', dossierId)
                                            .single();

                                        if (dossierRow?.phone_number) {
                                            const myPerson = data?.personen?.find(p => p.supabaseId === authPersoonId);
                                            await fetch('https://davidvanwachem.app.n8n.cloud/webhook/get-agenda-page-details', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    eventType: 'notify_main_tenant_to_submit',
                                                    main_tenant_phone: dossierRow.phone_number,
                                                    requester_name: myPerson?.naam || '',
                                                    requester_phone: phoneNumber,
                                                    role: userRole === 'co_tenant' ? 'Medehuurder' : 'Garantsteller',
                                                    dossier_id: dossierId,
                                                    timestamp: new Date().toISOString()
                                                })
                                            });
                                            setNotifyingSent(true);
                                            setTimeout(() => setNotifyingSent(false), 5000);
                                        }
                                    } catch (err) {
                                        console.error('[Aanvraag] Failed to notify main tenant:', err);
                                    }
                                }}
                            >
                                {notifyingSent
                                    ? (currentLang === 'en' ? '✓ Notification Sent!' : '✓ Melding Verzonden!')
                                    : (currentLang === 'en' ? 'Notify Main Tenant to Submit' : 'Hoofdhuurder melden om in te dienen')}
                            </button>
                        )}
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

            {/* Share Invite Modal — Name + Phone + Send Invitation + Copy Link */}
            {showShareModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => { setShowShareModal(false); setInviteLink(null); }}>
                    <div style={{
                        background: 'white', borderRadius: '0.75rem', padding: '2rem',
                        maxWidth: '28rem', width: '90%'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                                {addPersonRole === 'Medehuurder' ? '👥' : '🛡️'}
                            </div>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                                {currentLang === 'en'
                                    ? `Invite ${addPersonRole === 'Medehuurder' ? 'Co-Tenant' : 'Guarantor'}`
                                    : `${addPersonRole === 'Medehuurder' ? 'Medehuurder' : 'Garantsteller'} uitnodigen`}
                            </h3>
                            <p style={{ fontSize: '0.813rem', color: '#6b7280' }}>
                                {currentLang === 'en'
                                    ? 'Enter their details to send a WhatsApp invitation'
                                    : 'Vul hun gegevens in om een WhatsApp-uitnodiging te sturen'}
                            </p>
                        </div>

                        {!shareModalSent ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.813rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                                        {currentLang === 'en' ? 'Name' : 'Naam'} *
                                    </label>
                                    <input
                                        type="text"
                                        value={shareModalName}
                                        onChange={e => setShareModalName(e.target.value)}
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
                                        {currentLang === 'en' ? 'Phone Number (WhatsApp)' : 'Telefoonnummer (WhatsApp)'} *
                                    </label>
                                    <input
                                        type="tel"
                                        value={shareModalPhone}
                                        onChange={e => {
                                            let val = e.target.value.replace(/[^\d+]/g, '');
                                            if (!val.startsWith('+')) val = '+' + val;
                                            setShareModalPhone(val);
                                        }}
                                        placeholder="+31612345678"
                                        style={{
                                            width: '100%', padding: '0.625rem 0.75rem', border: '1px solid #e5e7eb',
                                            borderRadius: '0.375rem', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={handleShareModalSend}
                                    disabled={shareModalSending || !shareModalName.trim() || shareModalPhone.replace(/\D/g, '').length < 10}
                                    style={{
                                        width: '100%', padding: '0.75rem', borderRadius: '0.375rem',
                                        background: (!shareModalName.trim() || shareModalPhone.replace(/\D/g, '').length < 10) ? '#d1d5db' : '#497772',
                                        color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                                    }}
                                >
                                    {shareModalSending
                                        ? (currentLang === 'en' ? 'Sending...' : 'Versturen...')
                                        : (currentLang === 'en' ? 'Send Invitation' : 'Uitnodiging versturen')}
                                </button>

                                {/* Copy Link button — generates link on demand */}
                                <button
                                    onClick={async () => {
                                        let link = inviteLink;
                                        if (!link) {
                                            link = await generateInviteLink();
                                            if (link) setInviteLink(link);
                                        }
                                        if (link) {
                                            navigator.clipboard.writeText(link);
                                            setInviteLinkCopied(true);
                                            setTimeout(() => setInviteLinkCopied(false), 2000);
                                        }
                                    }}
                                    style={{
                                        width: '100%', padding: '0.625rem', borderRadius: '0.375rem',
                                        background: 'white', color: '#497772', border: '2px solid #497772',
                                        cursor: 'pointer', fontWeight: 500, fontSize: '0.813rem'
                                    }}
                                >
                                    {inviteLinkCopied
                                        ? (currentLang === 'en' ? '✓ Link Copied!' : '✓ Link Gekopieerd!')
                                        : (currentLang === 'en' ? 'Copy Invite Link' : 'Uitnodigingslink kopiëren')}
                                </button>

                                <button
                                    onClick={() => { setShowShareModal(false); setInviteLink(null); }}
                                    style={{
                                        width: '100%', padding: '0.5rem', borderRadius: '0.375rem',
                                        background: 'transparent', color: '#6b7280', border: '1px solid #e5e7eb',
                                        cursor: 'pointer', fontSize: '0.813rem'
                                    }}
                                >
                                    {currentLang === 'en' ? 'Cancel' : 'Annuleren'}
                                </button>
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ color: '#10b981', marginBottom: '0.75rem', fontSize: '2.5rem' }}>✓</div>
                                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '0.5rem', fontWeight: 500 }}>
                                    {currentLang === 'en'
                                        ? `Invitation sent to ${shareModalName}!`
                                        : `Uitnodiging verzonden naar ${shareModalName}!`}
                                </p>
                                <p style={{ fontSize: '0.813rem', color: '#6b7280', marginBottom: '1rem' }}>
                                    {currentLang === 'en'
                                        ? 'They will receive a WhatsApp message with a link to fill in their details.'
                                        : 'Ze ontvangen een WhatsApp-bericht met een link om hun gegevens in te vullen.'}
                                </p>

                                {inviteLink && (
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(inviteLink);
                                            setInviteLinkCopied(true);
                                            setTimeout(() => setInviteLinkCopied(false), 2000);
                                        }}
                                        style={{
                                            width: '100%', padding: '0.625rem', borderRadius: '0.375rem',
                                            background: 'white', color: '#497772', border: '2px solid #497772',
                                            cursor: 'pointer', fontWeight: 500, fontSize: '0.813rem', marginBottom: '0.5rem'
                                        }}
                                    >
                                        {inviteLinkCopied
                                            ? (currentLang === 'en' ? '✓ Copied!' : '✓ Gekopieerd!')
                                            : (currentLang === 'en' ? 'Copy Link' : 'Link Kopiëren')}
                                    </button>
                                )}

                                <button
                                    onClick={() => { setShowShareModal(false); setInviteLink(null); }}
                                    style={{
                                        width: '100%', padding: '0.625rem', borderRadius: '0.375rem',
                                        background: '#497772', color: 'white', border: 'none',
                                        cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'
                                    }}
                                >
                                    {currentLang === 'en' ? 'Done' : 'Klaar'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Remove Confirmation Modal for co-tenant self-removal */}
            {showRemoveConfirm && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }} onClick={() => setShowRemoveConfirm(null)}>
                    <div style={{
                        background: 'white', borderRadius: '0.75rem', padding: '2rem',
                        maxWidth: '24rem', width: '90%', textAlign: 'center'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#111827' }}>
                            {currentLang === 'en' ? 'Remove Yourself?' : 'Jezelf verwijderen?'}
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                            {currentLang === 'en'
                                ? 'This will permanently delete your data from this application and you will be logged out. This action cannot be undone.'
                                : 'Dit zal je gegevens permanent verwijderen uit deze aanvraag en je wordt uitgelogd. Deze actie kan niet ongedaan worden gemaakt.'}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                onClick={() => setShowRemoveConfirm(null)}
                                style={{
                                    flex: 1, padding: '0.625rem', borderRadius: '0.375rem',
                                    background: 'white', color: '#374151', border: '1px solid #e5e7eb',
                                    cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'
                                }}
                            >
                                {currentLang === 'en' ? 'Cancel' : 'Annuleren'}
                            </button>
                            <button
                                onClick={async () => {
                                    const id = showRemoveConfirm;
                                    setShowRemoveConfirm(null);
                                    await executeRemovePerson(id);
                                }}
                                style={{
                                    flex: 1, padding: '0.625rem', borderRadius: '0.375rem',
                                    background: '#ef4444', color: 'white', border: 'none',
                                    cursor: 'pointer', fontWeight: 500, fontSize: '0.875rem'
                                }}
                            >
                                {currentLang === 'en' ? 'Yes, Remove Me' : 'Ja, verwijder mij'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Aanvraag;
