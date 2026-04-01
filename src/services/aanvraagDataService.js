import { supabase } from '../integrations/supabase/client';
import { documentsByWorkStatus } from '../config/documentRequirements';

/**
 * Save Aanvraag form data to Supabase
 * @param {string} dossierId - The dossier ID
 * @param {Object} formData - The form data from Aanvraag
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const saveAanvraagData = async (dossierId, formData) => {
    try {
        if (!supabase) {
            console.log('[Mock] saveAanvraagData for:', dossierId, formData);
            return { ok: true };
        }

        // Extract main tenant email for the dossier
        const mainTenant = formData.personen?.find(p => p.rol === 'Hoofdhuurder');
        const mainTenantEmail = mainTenant?.email || null;

        // Save bid data and main tenant email to dossiers table
        const { error: dossierError } = await supabase
            .from('dossiers')
            .update({
                bid_amount: formData.bidAmount,
                start_date: formData.startDate || null,
                motivation: formData.motivation,
                months_advance: formData.monthsAdvance,
                property_address: formData.propertyAddress,
                email: mainTenantEmail,
                updated_at: new Date().toISOString()
            })
            .eq('id', dossierId);

        if (dossierError) {
            console.error('Error updating dossier:', dossierError);
            return { ok: false, error: dossierError.message };
        }

        // Save or update personen data
        if (formData.personen && Array.isArray(formData.personen)) {
            for (const persoon of formData.personen) {
                // Split name into first and last name
                const nameParts = (persoon.naam || '').trim().split(' ');
                const voornaam = nameParts[0] || '';
                const achternaam = nameParts.slice(1).join(' ') || '';

                // Parse income - handle both string and number, and empty strings
                let parsedIncome = null;
                if (persoon.inkomen) {
                    const incomeStr = persoon.inkomen.toString().trim();
                    if (incomeStr !== '' && !isNaN(incomeStr)) {
                        parsedIncome = parseFloat(incomeStr);
                    }
                }

                const persoonData = {
                    dossier_id: dossierId,
                    type: persoon.rol === 'Hoofdhuurder' ? 'tenant' :
                        persoon.rol === 'Medehuurder' ? 'co_tenant' : 'guarantor',
                    voornaam,
                    achternaam,
                    email: persoon.email || null,
                    telefoon: persoon.telefoon || null,
                    werk_status: persoon.werkstatus || null,
                    bruto_maandinkomen: parsedIncome,
                    huidige_adres: persoon.adres || null,
                    postcode: persoon.postcode || null,
                    woonplaats: persoon.woonplaats || null,
                    rol: persoon.rol,
                    updated_at: new Date().toISOString()
                };

                // Check if this person already exists
                if (persoon.supabaseId) {
                    // Update existing
                    const { error } = await supabase
                        .from('personen')
                        .update(persoonData)
                        .eq('id', persoon.supabaseId);

                    if (error) {
                        console.error('Error updating persoon:', error);
                    }
                } else {
                    // Check if a person with same dossier_id, type, and phone already exists
                    // to prevent duplicates on repeated saves
                    let existingPerson = null;
                    if (persoon.telefoon) {
                        const { data: existing } = await supabase
                            .from('personen')
                            .select('id')
                            .eq('dossier_id', dossierId)
                            .eq('telefoon', persoon.telefoon)
                            .eq('type', persoonData.type)
                            .limit(1);
                        existingPerson = existing?.[0] || null;
                    }

                    if (existingPerson) {
                        // Already exists - update instead of inserting
                        persoon.supabaseId = existingPerson.id;
                        await supabase
                            .from('personen')
                            .update(persoonData)
                            .eq('id', existingPerson.id);
                    } else {
                        // Insert new
                        const { data, error } = await supabase
                            .from('personen')
                            .insert({ ...persoonData, created_at: new Date().toISOString() })
                            .select('id')
                            .single();

                        if (error) {
                            console.error('Error inserting persoon:', error);
                        } else {
                            // Store the supabaseId so we can update next time
                            persoon.supabaseId = data.id;
                        }
                    }
                }
            }
        }

        // Delete persons from DB that are no longer in the local form data
        // This handles the case where a person was removed from the UI
        const { data: dbPersonen } = await supabase
            .from('personen')
            .select('id')
            .eq('dossier_id', dossierId);

        if (dbPersonen && formData.personen) {
            const localSupabaseIds = new Set(
                formData.personen
                    .map(p => p.supabaseId)
                    .filter(Boolean)
            );

            const toDelete = dbPersonen.filter(dbP => !localSupabaseIds.has(dbP.id));

            for (const orphan of toDelete) {
                // Delete documents first (storage files + metadata)
                const { data: docs } = await supabase
                    .from('documenten')
                    .select('id, bestandspad')
                    .eq('persoon_id', orphan.id);

                if (docs && docs.length > 0) {
                    const filePaths = docs.map(d => d.bestandspad).filter(Boolean);
                    if (filePaths.length > 0) {
                        await supabase.storage
                            .from('dossier-documents')
                            .remove(filePaths);
                    }
                    await supabase
                        .from('documenten')
                        .delete()
                        .eq('persoon_id', orphan.id);
                }

                // Delete the person
                await supabase
                    .from('personen')
                    .delete()
                    .eq('id', orphan.id);

                console.log('[saveAanvraagData] Deleted orphaned person:', orphan.id);
            }
        }

        return { ok: true, personen: formData.personen };
    } catch (error) {
        console.error('Error in saveAanvraagData:', error);
        return { ok: false, error: 'Failed to save form data' };
    }
};

/**
 * Load Aanvraag form data from Supabase
 * @param {string} dossierId - The dossier ID
 * @returns {Promise<{ok: boolean, data?: Object, error?: string}>}
 */
export const loadAanvraagData = async (dossierId) => {
    try {
        if (!supabase) {
            console.log('[Mock] loadAanvraagData for:', dossierId);
            return { ok: true, data: null };
        }

        // Fetch dossier with bid data
        const { data: dossier, error: dossierError } = await supabase
            .from('dossiers')
            .select('*')
            .eq('id', dossierId)
            .single();

        if (dossierError) {
            console.error('Error fetching dossier:', dossierError);
            return { ok: false, error: dossierError.message };
        }

        // Fetch personen
        const { data: personen, error: personenError } = await supabase
            .from('personen')
            .select('*')
            .eq('dossier_id', dossierId);

        if (personenError) {
            console.error('Error fetching personen:', personenError);
            return { ok: false, error: personenError.message };
        }

        // Fetch all documents for these personen
        const personenIds = personen?.map(p => p.id) || [];
        let allDocuments = [];

        if (personenIds.length > 0) {
            const { data: documenten, error: documentenError } = await supabase
                .from('documenten')
                .select('*')
                .in('persoon_id', personenIds);

            if (!documentenError) {
                allDocuments = documenten || [];
            } else {
                console.warn('Error fetching documents:', documentenError);
            }
        }

        // Transform personen data back to Aanvraag format
        const transformedPersonen = personen?.map(p => {
            // Get documents for this person and group by type
            const persoonDocsRaw = allDocuments.filter(doc => doc.persoon_id === p.id);

            // Group documents by type
            const documentsByType = {};
            persoonDocsRaw.forEach(doc => {
                if (!documentsByType[doc.type]) {
                    documentsByType[doc.type] = [];
                }
                documentsByType[doc.type].push({
                    id: doc.id,
                    type: doc.type,
                    name: doc.bestandsnaam,
                    fileName: doc.bestandsnaam,
                    filePath: doc.bestandspad,
                    status: doc.status === 'pending' ? 'ontvangen' : doc.status,
                    uploadedAt: doc.uploaded_at
                });
            });

            // Transform grouped documents into the expected format
            // Check which document types are multi-file (e.g., 'loonstroken')
            const allDocTypes = Object.values(documentsByWorkStatus).flat();
            const multiFileTypes = allDocTypes
                .filter(doc => doc.multiFile === true)
                .map(doc => doc.type);

            const persoonDocuments = Object.entries(documentsByType).map(([type, docs]) => {
                // If it's a known multi-file type OR there are multiple files of this type, treat as multi-file
                if (multiFileTypes.includes(type) || docs.length > 1) {
                    // Multi-file document
                    return {
                        type,
                        files: docs,
                        status: docs.length > 0 ? 'ontvangen' : 'ontbreekt'
                    };
                } else {
                    // Single-file document - use the first (and only) document
                    return {
                        type,
                        file: docs[0],
                        status: docs[0]?.status || 'ontvangen'
                    };
                }
            });

            // Convert income - handle null, undefined, 0, and numeric values
            let inkomenValue = '';
            if (p.bruto_maandinkomen != null) {
                // Convert to string, handling both number and string types
                inkomenValue = String(p.bruto_maandinkomen);
            }

            return {
                persoonId: `p${p.id}`,
                supabaseId: p.id, // Store for updates
                naam: `${p.voornaam || ''} ${p.achternaam || ''}`.trim(),
                email: p.email || '',
                telefoon: p.telefoon || '',
                rol: p.rol || (p.type === 'tenant' ? 'Hoofdhuurder' :
                    p.type === 'co_tenant' ? 'Medehuurder' : 'Garantsteller'),
                werkstatus: p.werk_status,
                inkomen: inkomenValue,
                adres: p.huidige_adres || '',
                postcode: p.postcode || '',
                woonplaats: p.woonplaats || '',
                documenten: persoonDocuments,
                docsCompleet: persoonDocuments.length > 0 // Mark as complete if has docs
            };
        }) || [];

        return {
            ok: true,
            data: {
                bidAmount: dossier.bid_amount || 0,
                startDate: dossier.start_date || '',
                motivation: dossier.motivation || '',
                monthsAdvance: dossier.months_advance || 0,
                propertyAddress: dossier.property_address || '',
                personen: transformedPersonen
            }
        };
    } catch (error) {
        console.error('Error in loadAanvraagData:', error);
        return { ok: false, error: 'Failed to load form data' };
    }
};

/**
 * Delete a person and their documents from Supabase
 * Also removes from the main tenant's co_tenants JSONB array in accounts
 * @param {string} supabaseId - The person's ID in personen table
 * @param {string} accountId - The main tenant's account ID (for co_tenants cleanup)
 * @param {string|null} linkedAccountId - The person's own account ID in accounts table
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const deletePersonFromSupabase = async (supabaseId, accountId, linkedAccountId) => {
    try {
        if (!supabase) {
            console.log('[Mock] deletePersonFromSupabase:', supabaseId);
            return { ok: true };
        }

        // 1. Delete all documents for this person (files from storage + metadata)
        const { data: docs } = await supabase
            .from('documenten')
            .select('id, bestandspad')
            .eq('persoon_id', supabaseId);

        if (docs && docs.length > 0) {
            // Delete files from storage
            const filePaths = docs.map(d => d.bestandspad).filter(Boolean);
            if (filePaths.length > 0) {
                await supabase.storage
                    .from('dossier-documents')
                    .remove(filePaths);
            }

            // Delete document metadata
            await supabase
                .from('documenten')
                .delete()
                .eq('persoon_id', supabaseId);
        }

        // 2. Delete the person from personen table
        const { error: deleteError } = await supabase
            .from('personen')
            .delete()
            .eq('id', supabaseId);

        if (deleteError) {
            console.error('Error deleting persoon:', deleteError);
            return { ok: false, error: deleteError.message };
        }

        // 3. Remove from main tenant's co_tenants JSONB array
        if (accountId && linkedAccountId) {
            const { data: mainAcc } = await supabase
                .from('accounts')
                .select('co_tenants')
                .eq('id', accountId)
                .single();

            if (mainAcc?.co_tenants) {
                const updatedCoTenants = mainAcc.co_tenants.filter(
                    ct => ct.account_id !== linkedAccountId
                );
                await supabase
                    .from('accounts')
                    .update({ co_tenants: updatedCoTenants })
                    .eq('id', accountId);
            }
        }

        // 4. Clean up the linked account (unlink it from main tenant)
        if (linkedAccountId) {
            await supabase
                .from('accounts')
                .update({
                    linked_account_id: null,
                    account_role: null
                })
                .eq('id', linkedAccountId);
        }

        console.log('[aanvraagDataService] ✓ Deleted person and documents:', supabaseId);
        return { ok: true };
    } catch (error) {
        console.error('Error in deletePersonFromSupabase:', error);
        return { ok: false, error: 'Failed to delete person' };
    }
};
