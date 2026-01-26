import { supabase } from '../integrations/supabase/client';

/**
 * User Data Service
 * Handles all Supabase operations for user/dossier data persistence
 */

/**
 * Get or create a dossier for a user by identifier (email or phone)
 * @param {string} identifier - User's email or phone number
 * @param {string} clerkUserId - Clerk user ID to link
 * @returns {Promise<{ok: boolean, dossierId?: string, isNew?: boolean, error?: string}>}
 */
export const getOrCreateDossier = async (identifier, clerkUserId = null) => {
    try {
        if (!supabase) {
            // Mock mode for development without Supabase
            console.log('[Mock] getOrCreateDossier for:', identifier);
            return {
                ok: true,
                dossierId: 'mock-dossier-' + Date.now(),
                isNew: true
            };
        }

        // Determine if identifier is email or phone
        const isEmail = identifier && identifier.includes('@');
        const searchField = isEmail ? 'email' : 'phone_number';

        // First, try to find an existing dossier by Clerk user ID (most reliable)
        if (clerkUserId) {
            const { data: existingByClerk, error: clerkError } = await supabase
                .from('dossiers')
                .select('id, status')
                .eq('clerk_user_id', clerkUserId)
                .single();

            if (existingByClerk && !clerkError) {
                return {
                    ok: true,
                    dossierId: existingByClerk.id,
                    isNew: false
                };
            }
        }

        // Try to find by email/phone
        const { data: existingDossier, error: fetchError } = await supabase
            .from('dossiers')
            .select('id, status')
            .eq(searchField, identifier)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 means no rows found, which is OK
            console.error('Error fetching dossier:', fetchError);
            return { ok: false, error: fetchError.message };
        }

        if (existingDossier) {
            // Update clerk_user_id if provided
            if (clerkUserId) {
                await supabase
                    .from('dossiers')
                    .update({ clerk_user_id: clerkUserId })
                    .eq('id', existingDossier.id);
            }
            return {
                ok: true,
                dossierId: existingDossier.id,
                isNew: false
            };
        }

        // Create a new dossier
        const insertData = {
            clerk_user_id: clerkUserId,
            status: 'draft',
            created_at: new Date().toISOString()
        };

        // Add the identifier field
        if (isEmail) {
            insertData.email = identifier;
        } else {
            insertData.phone_number = identifier;
        }

        const { data: newDossier, error: insertError } = await supabase
            .from('dossiers')
            .insert(insertData)
            .select('id')
            .single();

        if (insertError) {
            console.error('Error creating dossier:', insertError);
            return { ok: false, error: insertError.message };
        }

        return {
            ok: true,
            dossierId: newDossier.id,
            isNew: true
        };
    } catch (error) {
        console.error('Error in getOrCreateDossier:', error);
        return { ok: false, error: 'Failed to get or create dossier' };
    }
};

/**
 * Save form data for a dossier
 * @param {string} dossierId - Dossier ID
 * @param {Object} formData - Form data to save (personen array with their documents)
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const saveFormData = async (dossierId, formData) => {
    try {
        if (!supabase) {
            console.log('[Mock] saveFormData for dossier:', dossierId, formData);
            return { ok: true };
        }

        // Save personen data
        if (formData.personen && Array.isArray(formData.personen)) {
            for (const persoon of formData.personen) {
                const persoonData = {
                    dossier_id: dossierId,
                    type: persoon.type, // 'tenant', 'co_tenant', 'guarantor'
                    voornaam: persoon.voornaam,
                    achternaam: persoon.achternaam,
                    email: persoon.email,
                    telefoon: persoon.telefoon,
                    geboortedatum: persoon.geboortedatum,
                    nationaliteit: persoon.nationaliteit,
                    werk_status: persoon.werkStatus,
                    bruto_maandinkomen: persoon.brutoMaandinkomen,
                    bedrijfsnaam: persoon.bedrijfsnaam,
                    rol: persoon.rol,
                    startdatum: persoon.startdatum,
                    updated_at: new Date().toISOString()
                };

                if (persoon.id && !persoon.id.startsWith('mock-')) {
                    // Update existing persoon
                    const { error } = await supabase
                        .from('personen')
                        .update(persoonData)
                        .eq('id', persoon.id);

                    if (error) {
                        console.error('Error updating persoon:', error);
                    }
                } else {
                    // Insert new persoon
                    const { data, error } = await supabase
                        .from('personen')
                        .insert({ ...persoonData, created_at: new Date().toISOString() })
                        .select('id')
                        .single();

                    if (error) {
                        console.error('Error inserting persoon:', error);
                    }
                }
            }
        }

        return { ok: true };
    } catch (error) {
        console.error('Error saving form data:', error);
        return { ok: false, error: 'Failed to save form data' };
    }
};

/**
 * Get saved form data for a dossier
 * @param {string} dossierId - Dossier ID
 * @returns {Promise<{ok: boolean, data?: Object, error?: string}>}
 */
export const getFormData = async (dossierId) => {
    try {
        if (!supabase) {
            console.log('[Mock] getFormData for dossier:', dossierId);
            return { ok: true, data: null }; // No saved data in mock mode
        }

        // Fetch dossier
        const { data: dossier, error: dossierError } = await supabase
            .from('dossiers')
            .select('*')
            .eq('id', dossierId)
            .single();

        if (dossierError) {
            console.error('Error fetching dossier:', dossierError);
            return { ok: false, error: dossierError.message };
        }

        // Fetch personen with their documents
        const { data: personen, error: personenError } = await supabase
            .from('personen')
            .select(`
                *,
                documenten (*)
            `)
            .eq('dossier_id', dossierId);

        if (personenError) {
            console.error('Error fetching personen:', personenError);
            return { ok: false, error: personenError.message };
        }

        return {
            ok: true,
            data: {
                dossier,
                personen: personen || []
            }
        };
    } catch (error) {
        console.error('Error getting form data:', error);
        return { ok: false, error: 'Failed to get form data' };
    }
};

/**
 * Save document metadata to Supabase
 * @param {string} persoonId - Person ID
 * @param {string} docType - Document type (e.g., 'id_document', 'salary_slip')
 * @param {string} fileName - Original file name
 * @param {string} filePath - Storage path or URL
 * @returns {Promise<{ok: boolean, documentId?: string, error?: string}>}
 */
export const saveDocumentMetadata = async (persoonId, docType, fileName, filePath) => {
    try {
        if (!supabase) {
            console.log('[Mock] saveDocumentMetadata:', { persoonId, docType, fileName, filePath });
            return { ok: true, documentId: 'mock-doc-' + Date.now() };
        }

        const { data, error } = await supabase
            .from('documenten')
            .insert({
                persoon_id: persoonId,
                type: docType,
                bestandsnaam: fileName,
                bestandspad: filePath,
                uploaded_at: new Date().toISOString()
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error saving document metadata:', error);
            return { ok: false, error: error.message };
        }

        return { ok: true, documentId: data.id };
    } catch (error) {
        console.error('Error in saveDocumentMetadata:', error);
        return { ok: false, error: 'Failed to save document metadata' };
    }
};
