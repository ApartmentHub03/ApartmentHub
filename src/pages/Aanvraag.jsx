import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setLanguage } from '../features/ui/uiSlice';
import { LogOut, CheckCircle, Plus, AlertCircle } from 'lucide-react';
import { translations } from '../data/translations';
import RentalConditionsSidebar from '../components/aanvraag/RentalConditionsSidebar';
import BidSection from '../components/aanvraag/BidSection';
import TenantFormSection from '../components/aanvraag/TenantFormSection';
import GuarantorFormSection from '../components/aanvraag/GuarantorFormSection';
import AddPersonModal from '../components/aanvraag/AddPersonModal';
import UploadChoiceModal from '../components/aanvraag/UploadChoiceModal';
import styles from './Aanvraag.module.css';

// Mock Data / Services (Replacements for API calls in reference)
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

    // Sync language with URL
    useEffect(() => {
        const path = location.pathname.toLowerCase();
        if (path.includes('aanvraag') && currentLang !== 'nl') {
            dispatch(setLanguage('nl'));
        } else if (path.includes('application') && currentLang !== 'en') {
            dispatch(setLanguage('en'));
        }
    }, [location.pathname, dispatch, currentLang]);
    const t = translations.aanvraag[currentLang] || translations.aanvraag.nl;
    const tNav = translations.nav[currentLang] || translations.nav.en; // fallback

    // State
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null); // { pand, personen: [], dossierCompleet }
    const [bidAmount, setBidAmount] = useState(0);
    const [startDate, setStartDate] = useState("");
    const [motivation, setMotivation] = useState("");
    const [monthsAdvance, setMonthsAdvance] = useState(0);
    const [tenantProgress, setTenantProgress] = useState({}); // { persoonId: { overallProgress, ... } }

    // Modals
    const [showAddPersonModal, setShowAddPersonModal] = useState(false);
    const [showUploadChoiceModal, setShowUploadChoiceModal] = useState(false);
    const [addPersonRole, setAddPersonRole] = useState("Medehuurder"); // "Medehuurder" | "Garantsteller"
    const [selectedUploadMethod, setSelectedUploadMethod] = useState(null);
    const [selectedTenantForGuarantor, setSelectedTenantForGuarantor] = useState(null);

    // Initial Load
    useEffect(() => {
        // Simulate fetch
        setTimeout(() => {
            const initialPerson = {
                persoonId: "p1",
                naam: "Jan Jansen", // Mock user name
                email: "user@example.com",
                telefoon: "0612345678",
                rol: "Hoofdhuurder",
                documenten: [], // {type, status, file}
                docsCompleet: false
            };

            setData({
                pand: mockPand,
                personen: [initialPerson],
                dossierCompleet: false
            });
            setBidAmount(mockPand.voorwaarden.huurprijs);
            setLoading(false);
        }, 1000);
    }, []);

    const calculateProgress = () => {
        if (!data) return 0;

        // Bid section contributes 30%
        const hasBid = bidAmount > 0 && startDate !== "";
        const bidProgress = hasBid ? 30 : 0;

        // Tenant forms contribute 70%
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
    };

    const progress = calculateProgress();

    // Check if all tenants have completed required documents
    const isAllDocsComplete = () => {
        const tenantIds = Object.keys(tenantProgress);
        if (tenantIds.length === 0) return false;
        return tenantIds.every(id => tenantProgress[id]?.isDocsComplete === true);
    };

    // Check if form is ready to submit
    const canSubmit = bidAmount > 0 && startDate !== '' && isAllDocsComplete();

    // Handlers
    const handleDocumentUpload = (persoonId, type, fileOrFiles) => {
        // Update local state
        const updatedPersonen = data.personen.map(p => {
            if (p.persoonId === persoonId) {
                const newDocs = [...(p.documenten || [])];
                const existingIdx = newDocs.findIndex(d => d.type === type);

                // Check if it's a multi-file upload (array of files)
                const isMultiFile = Array.isArray(fileOrFiles);

                if (existingIdx >= 0) {
                    if (isMultiFile) {
                        newDocs[existingIdx] = { ...newDocs[existingIdx], status: 'ontvangen', files: fileOrFiles };
                    } else {
                        newDocs[existingIdx] = { ...newDocs[existingIdx], status: 'ontvangen', file: fileOrFiles };
                    }
                } else {
                    if (isMultiFile) {
                        newDocs.push({ type, status: 'ontvangen', files: fileOrFiles });
                    } else {
                        newDocs.push({ type, status: 'ontvangen', file: fileOrFiles });
                    }
                }
                // Recalculate completeness
                return { ...p, documenten: newDocs, docsCompleet: newDocs.length >= 1 };
            }
            return p;
        });
        setData({ ...data, personen: updatedPersonen });
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
        // If self, we add person immediately with placeholder or ask name? 
        // Ref says: if self, directly add with placeholder name? 
        // "Directly add person with placeholder name" -> await handleAddPersonSubmit
        // Or show modal? Ref code:
        /*
          if (method === "self") {
            const placeholderName = ...
             handleAddPersonSubmit(placeholderName, ...);
          } else {
             setShowAddPersonModal(true);
          }
        */
        // Let's just show the modal for both to keep it simple and allow entering name
        setShowAddPersonModal(true);
    };

    const handleAddPersonSubmit = async (name, whatsapp) => {
        // Mock API call
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

    const handleSubmit = () => {
        // Validation
        if (!bidAmount || !startDate) {
            alert(currentLang === 'en' ? 'Please complete the bid section' : 'Vul de biedingsectie in');
            return;
        }

        // Navigate to Letter of Intent page with form data
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
                            <button className={styles.logoutButton} onClick={() => alert('Logout')}>
                                <LogOut size={14} />
                                {t.logout}
                            </button>
                        </div>
                    </div>

                    <h1 className={styles.pageTitle}>{currentLang === 'en' ? 'Rental Application' : 'Huur aanvraag'}</h1>

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
                {/* Success Alert if complete */}
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
                        {/* Step 1: Bid */}
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

                        {/* Step 2: Details */}
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
