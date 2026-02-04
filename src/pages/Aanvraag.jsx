import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

const mockPand = {
    adres: "Ceintuurbaan 123, Amsterdam",
    voorwaarden: {
        huurprijs: 2100,
        waarborgsom: 4200,
        servicekosten: "G/W/E exclusief",
        beschikbaar: "01-03-2025",
        minBod: 2100,
        maxBod: 4200
    }
};

const Aanvraag = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const dispatch = useDispatch();
    const currentLang = useSelector((state) => state.ui.language);
    const { logout, dossierId } = useAuth();
    const [saveStatus, setSaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'

    useEffect(() => {
        const path = location.pathname.toLowerCase();
        if (path.includes('aanvraag') && currentLang !== 'nl') {
            dispatch(setLanguage('nl'));
        } else if (path.includes('application') && currentLang !== 'en') {
            dispatch(setLanguage('en'));
        }
    }, [location.pathname, dispatch, currentLang]);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;
    const tNav = translations.nav[currentLang] || translations.nav.en;

    const [loading, setLoading] = useState(true);
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

    // Load saved data on mount
    useEffect(() => {
        const loadData = async () => {
            if (!dossierId) {
                setLoading(false);
                return;
            }

            const result = await loadAanvraagData(dossierId);

            if (result.ok && result.data) {
                // Load saved data
                setBidAmount(result.data.bidAmount || mockPand.voorwaarden.huurprijs);
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

                setData({
                    pand: mockPand,
                    personen,
                    dossierCompleet: false
                });
            } else {
                // No saved data, use defaults
                const initialPerson = {
                    persoonId: "p1",
                    naam: "",
                    email: "",
                    telefoon: "",
                    rol: "Hoofdhuurder",
                    documenten: [],
                    docsCompleet: false
                };

                setData({
                    pand: mockPand,
                    personen: [initialPerson],
                    dossierCompleet: false
                });
                setBidAmount(mockPand.voorwaarden.huurprijs);
            }

            setLoading(false);
        };

        loadData();
    }, [dossierId]);

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
        const tenantIds = Object.keys(tenantProgress);
        if (tenantIds.length === 0) return false;
        return tenantIds.every(id => tenantProgress[id]?.isDocsComplete === true);
    };

    const canSubmit = bidAmount > 0 && startDate !== '' && isAllDocsComplete();

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
            for (const file of filesToUpload) {
                setSaveStatus('saving');
                const result = await uploadDocument(persoonSupabaseId, dossierId, type, file);

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
        const newPerson = {
            persoonId: `p${Date.now()}`,
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
    };

    const handleLogout = async () => {
        await logout();
    };

    const handleSubmit = () => {
        if (!bidAmount || !startDate) {
            alert(currentLang === 'en' ? 'Please complete the bid section' : 'Vul de biedingsectie in');
            return;
        }

        console.log("Submitting", { bidAmount, startDate, data });
        const letterPath = currentLang === 'en' ? '/en/letter-of-intent' : '/letter-of-intent';
        navigate(letterPath, {
            state: {
                bidAmount,
                startDate,
                motivation,
                monthsAdvance,
                tenantData: data,
                property: data.pand
            }
        });
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
                        <p className={styles.addressText}>📍 {data.pand.adres}</p>
                        <div className={styles.headerButtons}>
                            <button className={styles.changeButton} onClick={() => navigate('/appartementen')}>
                                {currentLang === 'en' ? 'Change Apartment' : 'Wijzig Appartement'}
                            </button>
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
                    <RentalConditionsSidebar conditions={data.pand.voorwaarden} address={data.pand.adres} />

                    <div className={styles.contentColumn}>

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


                        <div className={styles.stepContainer}>
                            <div className={styles.stepHeader}>
                                <div className={styles.stepNumber}>2</div>
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
