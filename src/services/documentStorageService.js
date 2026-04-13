import { supabase } from '../integrations/supabase/client';

/**
 * Sanitize a phone number for use as a storage folder name.
 * Removes +, spaces, and special characters, keeping only digits.
 * @param {string} phone
 * @returns {string}
 */
const sanitizePhoneForPath = (phone) => {
    return phone.replace(/[^0-9]/g, '');
};

/**
 * Upload a document to Supabase Storage and save metadata.
 * Documents are stored at: {phoneNumber}/{docType}.{ext}
 * For multi-file types, a file index is appended: {phoneNumber}/{docType}_{index}.{ext}
 *
 * @param {string} persoonId - The person (supabase ID) to associate the document with
 * @param {string} dossierId - The dossier ID
 * @param {string} docType - Document type (e.g., 'id_bewijs', 'loonstroken')
 * @param {File} file - The file to upload
 * @param {string} phoneNumber - The person's phone number (required for storage path)
 * @param {string} [accountId] - The CRM account ID (optional)
 * @param {number} [fileIndex] - Index for multi-file uploads (0-based), omit for single-file
 * @param {string} [personRole] - Role of the person ('Hoofdhuurder', 'Medehuurder', 'Garantsteller')
 * @param {string} [mainTenantPhone] - Main tenant's phone number (used as parent folder for co-tenants/guarantors)
 * @returns {Promise<{ok: boolean, document?: Object, error?: string}>}
 */
export const uploadDocument = async (persoonId, dossierId, docType, file, phoneNumber, accountId = null, fileIndex = null, personRole = null, mainTenantPhone = null) => {
    try {
        if (!supabase) {
            console.log('[Mock] uploadDocument:', { persoonId, docType, fileName: file.name });
            return {
                ok: true,
                document: {
                    id: 'mock-doc-' + Date.now(),
                    type: docType,
                    fileName: file.name
                }
            };
        }

        if (!phoneNumber) {
            console.error('[StorageService] Phone number is required for document storage');
            return { ok: false, error: 'Phone number is required for document storage' };
        }

        // Create phone-based file path: {sanitizedPhone}/{docType}.{ext}
        const sanitizedPhone = sanitizePhoneForPath(phoneNumber);
        const fileExt = file.name.split('.').pop();

        // For multi-file types, append index; otherwise use docType directly
        const fileBaseName = fileIndex !== null && fileIndex !== undefined
            ? `${docType}_${fileIndex + 1}`
            : docType;

        // Determine sub-folder based on person role
        let subFolder = '';
        if (personRole === 'Medehuurder') subFolder = 'co-tenant/';
        else if (personRole === 'Garantsteller') subFolder = 'guarantor/';

        // Use main tenant's phone as parent folder for co-tenants/guarantors
        const folderPhone = (subFolder && mainTenantPhone)
            ? sanitizePhoneForPath(mainTenantPhone)
            : sanitizedPhone;
        const storagePath = `${folderPhone}/${subFolder}${fileBaseName}.${fileExt}`;

        // Upload file to Storage (upsert: true to allow replacing existing files)
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('dossier-documents')
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading file:', uploadError);
            return { ok: false, error: uploadError.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('dossier-documents')
            .getPublicUrl(storagePath);

        // Save metadata to documenten table (includes phone_number)
        const { data: docData, error: dbError } = await supabase
            .from('documenten')
            .insert({
                persoon_id: persoonId,
                phone_number: phoneNumber,
                type: docType,
                bestandsnaam: `${fileBaseName}.${fileExt}`,
                bestandspad: storagePath,
                status: 'ontvangen',
                uploaded_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            // If DB insert fails, delete the uploaded file
            await supabase.storage.from('dossier-documents').remove([storagePath]);
            console.error('Error saving document metadata:', dbError);
            return { ok: false, error: dbError.message };
        }

        // Note: accounts.documents and documentation_status are now synced
        // automatically via the DB trigger sync_accounts_from_dossier_data()

        return {
            ok: true,
            document: {
                id: docData.id,
                type: docData.type,
                name: file.name,
                fileName: docData.bestandsnaam,
                filePath: docData.bestandspad,
                publicUrl: urlData.publicUrl,
                status: docData.status,
                size: file.size,
                uploadedAt: docData.uploaded_at
            }
        };
    } catch (error) {
        console.error('Error in uploadDocument:', error);
        return { ok: false, error: 'Failed to upload document' };
    }
};

/**
 * Delete a document from Supabase Storage and remove metadata
 * @param {string} documentId - The document ID from documenten table
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const deleteDocument = async (documentId) => {
    try {
        if (!supabase) {
            console.log('[Mock] deleteDocument:', documentId);
            return { ok: true };
        }

        // Get document metadata to find file path
        const { data: docData, error: fetchError } = await supabase
            .from('documenten')
            .select('bestandspad')
            .eq('id', documentId)
            .single();

        if (fetchError) {
            console.error('Error fetching document:', fetchError);
            return { ok: false, error: fetchError.message };
        }

        // Delete from storage
        if (docData.bestandspad) {
            const { error: storageError } = await supabase.storage
                .from('dossier-documents')
                .remove([docData.bestandspad]);

            if (storageError) {
                console.warn('Error deleting from storage:', storageError);
                // Continue anyway to delete metadata
            }
        }

        // Delete metadata
        const { error: dbError } = await supabase
            .from('documenten')
            .delete()
            .eq('id', documentId);

        if (dbError) {
            console.error('Error deleting document metadata:', dbError);
            return { ok: false, error: dbError.message };
        }

        return { ok: true };
    } catch (error) {
        console.error('Error in deleteDocument:', error);
        return { ok: false, error: 'Failed to delete document' };
    }
};

/**
 * Replace an existing document (delete old, upload new)
 * @param {string} oldDocumentId - The existing document ID to replace
 * @param {string} persoonId - The person (supabase ID)
 * @param {string} dossierId - The dossier ID
 * @param {string} docType - Document type
 * @param {File} newFile - The new file to upload
 * @param {string} phoneNumber - The person's phone number
 * @param {string} [accountId] - The CRM account ID (optional)
 * @param {number} [fileIndex] - Index for multi-file uploads (optional)
 * @param {string} [personRole] - Role of the person
 * @param {string} [mainTenantPhone] - Main tenant's phone number
 * @returns {Promise<{ok: boolean, document?: Object, error?: string}>}
 */
export const replaceDocument = async (oldDocumentId, persoonId, dossierId, docType, newFile, phoneNumber, accountId = null, fileIndex = null, personRole = null, mainTenantPhone = null) => {
    try {
        // Delete the old document
        const deleteResult = await deleteDocument(oldDocumentId);
        if (!deleteResult.ok) {
            return deleteResult;
        }

        // Upload the new document
        return await uploadDocument(persoonId, dossierId, docType, newFile, phoneNumber, accountId, fileIndex, personRole, mainTenantPhone);
    } catch (error) {
        console.error('Error in replaceDocument:', error);
        return { ok: false, error: 'Failed to replace document' };
    }
};
