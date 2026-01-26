import { supabase } from '../integrations/supabase/client';

/**
 * Upload a document to Supabase Storage and save metadata
 * @param {string} persoonId - The person (supabase ID) to associate the document with
 * @param {string} dossierId - The dossier ID
 * @param {string} docType - Document type (e.g., 'id_document', 'salary_slip')
 * @param {File} file - The file to upload
 * @returns {Promise<{ok: boolean, document?: Object, error?: string}>}
 */
export const uploadDocument = async (persoonId, dossierId, docType, file) => {
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

        // Create unique file path
        const fileExt = file.name.split('.').pop();
        const fileName = `${dossierId}/${persoonId}/${docType}_${Date.now()}.${fileExt}`;

        // Upload file to Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('dossier-documents')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('Error uploading file:', uploadError);
            return { ok: false, error: uploadError.message };
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('dossier-documents')
            .getPublicUrl(fileName);

        // Save metadata to documenten table
        const { data: docData, error: dbError } = await supabase
            .from('documenten')
            .insert({
                persoon_id: persoonId,
                type: docType,
                bestandsnaam: file.name,
                bestandspad: fileName,
                status: 'pending',
                uploaded_at: new Date().toISOString()
            })
            .select()
            .single();

        if (dbError) {
            // If DB insert fails, delete the uploaded file
            await supabase.storage.from('dossier-documents').remove([fileName]);
            console.error('Error saving document metadata:', dbError);
            return { ok: false, error: dbError.message };
        }

        return {
            ok: true,
            document: {
                id: docData.id,
                type: docData.type,
                fileName: docData.bestandsnaam,
                filePath: docData.bestandspad,
                publicUrl: urlData.publicUrl,
                status: docData.status,
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
 * @returns {Promise<{ok: boolean, document?: Object, error?: string}>}
 */
export const replaceDocument = async (oldDocumentId, persoonId, dossierId, docType, newFile) => {
    try {
        // Delete the old document
        const deleteResult = await deleteDocument(oldDocumentId);
        if (!deleteResult.ok) {
            return deleteResult;
        }

        // Upload the new document
        return await uploadDocument(persoonId, dossierId, docType, newFile);
    } catch (error) {
        console.error('Error in replaceDocument:', error);
        return { ok: false, error: 'Failed to replace document' };
    }
};
