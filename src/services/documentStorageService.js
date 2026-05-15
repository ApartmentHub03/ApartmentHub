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
 * Build the storage path a document will live at. Pulled out so callers can
 * compute the path the same way uploadDocument would, without uploading.
 */
const buildStoragePath = (docType, fileExt, phoneNumber, fileIndex, personRole, mainTenantPhone) => {
    const sanitizedPhone = sanitizePhoneForPath(phoneNumber);
    const fileBaseName = fileIndex !== null && fileIndex !== undefined
        ? `${docType}_${fileIndex + 1}`
        : docType;

    let subFolder = '';
    if (personRole === 'Medehuurder') subFolder = 'co-tenant/';
    else if (personRole === 'Garantsteller') subFolder = 'guarantor/';

    const folderPhone = (subFolder && mainTenantPhone)
        ? sanitizePhoneForPath(mainTenantPhone)
        : sanitizedPhone;

    return `${folderPhone}/${subFolder}${fileBaseName}.${fileExt}`;
};

/**
 * Upload a document to Supabase Storage. Document metadata is held in React
 * state on the form (and pushed to Salesforce on submit) — no `documenten`
 * table writes happen here. The bucket is the only Supabase metadata.
 *
 * @param {string} docType - Document type (e.g., 'id_bewijs', 'loonstroken')
 * @param {File} file - The file to upload
 * @param {string} phoneNumber - The person's phone number (required for storage path)
 * @param {number} [fileIndex] - Index for multi-file uploads (0-based), omit for single-file
 * @param {string} [personRole] - Role of the person ('Hoofdhuurder', 'Medehuurder', 'Garantsteller')
 * @param {string} [mainTenantPhone] - Main tenant's phone number (used as parent folder for co-tenants/guarantors)
 * @returns {Promise<{ok: boolean, document?: Object, error?: string}>}
 */
export const uploadDocument = async (docType, file, phoneNumber, fileIndex = null, personRole = null, mainTenantPhone = null) => {
    try {
        if (!supabase) {
            console.log('[Mock] uploadDocument:', { docType, fileName: file.name });
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

        const fileExt = file.name.split('.').pop();
        const storagePath = buildStoragePath(docType, fileExt, phoneNumber, fileIndex, personRole, mainTenantPhone);
        const fileBaseName = storagePath.split('/').pop();

        // upsert: true so a re-upload of the same slot replaces the previous file in place.
        const { error: uploadError } = await supabase.storage
            .from('dossier-documents')
            .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('Error uploading file:', uploadError);
            return { ok: false, error: uploadError.message };
        }

        const { data: urlData } = supabase.storage
            .from('dossier-documents')
            .getPublicUrl(storagePath);

        return {
            ok: true,
            document: {
                // Use the storage path as the stable id — there is no longer a
                // `documenten` row to point at. The form keeps this in React
                // state and forwards it to Salesforce on submit.
                id: storagePath,
                type: docType,
                name: file.name,
                fileName: fileBaseName,
                filePath: storagePath,
                publicUrl: urlData.publicUrl,
                status: 'ontvangen',
                size: file.size,
                uploadedAt: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error('Error in uploadDocument:', error);
        return { ok: false, error: 'Failed to upload document' };
    }
};

/**
 * Delete a document from Supabase Storage. Caller passes the storage path
 * directly — there's no `documenten` row to look it up from anymore.
 * @param {string} filePath - The storage path inside the dossier-documents bucket
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export const deleteDocument = async (filePath) => {
    try {
        if (!supabase) {
            console.log('[Mock] deleteDocument:', filePath);
            return { ok: true };
        }

        if (!filePath) {
            return { ok: false, error: 'Missing filePath' };
        }

        const { error: storageError } = await supabase.storage
            .from('dossier-documents')
            .remove([filePath]);

        if (storageError) {
            console.warn('Error deleting from storage:', storageError);
            return { ok: false, error: storageError.message };
        }

        return { ok: true };
    } catch (error) {
        console.error('Error in deleteDocument:', error);
        return { ok: false, error: 'Failed to delete document' };
    }
};

/**
 * Replace an existing document (delete old, upload new).
 * @param {string} oldFilePath - Storage path of the file being replaced
 * @param {string} docType - Document type
 * @param {File} newFile - The new file to upload
 * @param {string} phoneNumber - The person's phone number
 * @param {number} [fileIndex] - Index for multi-file uploads (optional)
 * @param {string} [personRole] - Role of the person
 * @param {string} [mainTenantPhone] - Main tenant's phone number
 * @returns {Promise<{ok: boolean, document?: Object, error?: string}>}
 */
export const replaceDocument = async (oldFilePath, docType, newFile, phoneNumber, fileIndex = null, personRole = null, mainTenantPhone = null) => {
    try {
        const deleteResult = await deleteDocument(oldFilePath);
        if (!deleteResult.ok) {
            return deleteResult;
        }
        return await uploadDocument(docType, newFile, phoneNumber, fileIndex, personRole, mainTenantPhone);
    } catch (error) {
        console.error('Error in replaceDocument:', error);
        return { ok: false, error: 'Failed to replace document' };
    }
};
