const WEBHOOK_URL = 'https://davidvanwachem.app.n8n.cloud/webhook/get-agenda-page-details';

const generateEventId = () => {
    return 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

export const sendWebhookData = async (eventType, data) => {
    const payload = {
        eventId: generateEventId(),
        eventType,
        timestamp: new Date().toISOString(),
        ...data
    };

    try {
        console.log(`[Webhook] Sending ${eventType} event:`, payload);

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(`[Webhook] Failed with status ${response.status}`);
            return { ok: false, message: `HTTP ${response.status}` };
        }

        console.log(`[Webhook] Successfully sent ${eventType} event`);
        return { ok: true };
    } catch (error) {
        console.error('[Webhook] Error sending data:', error);
        return { ok: false, message: error.message };
    }
};

export const sendLoginEvent = async (phoneNumber, dossierId) => {
    return sendWebhookData('login', {
        phoneNumber,
        dossierId
    });
};

export const sendTenantDataEvent = async (personData) => {
    return sendWebhookData('tenant_data', {
        data: {
            personId: personData.personId,
            naam: personData.naam,
            email: personData.email,
            address: personData.address || personData.adres,
            postcode: personData.postcode,
            city: personData.city || personData.woonplaats,
            income: personData.income || personData.inkomen,
            workStatus: personData.workStatus,
            rol: personData.rol,
            phone: personData.phone || personData.telefoon
        }
    });
};

export const sendDocumentUploadEvent = async (personId, documentType, file) => {
    const formData = new FormData();

    formData.append('eventId', generateEventId());
    formData.append('eventType', 'document_upload');
    formData.append('timestamp', new Date().toISOString());
    formData.append('personId', personId);
    formData.append('documentType', documentType);
    formData.append('status', 'ontvangen');

    if (file && file instanceof File) {
        formData.append('file', file, file.name);
        formData.append('fileName', file.name);
        formData.append('fileType', file.type);
        formData.append('fileSize', file.size.toString());
    }

    try {
        console.log(`[Webhook] Sending document_upload event via multipart:`, {
            personId,
            documentType,
            fileName: file?.name
        });

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            console.error(`[Webhook] Failed with status ${response.status}`);
            return { ok: false, message: `HTTP ${response.status}` };
        }

        console.log(`[Webhook] Successfully sent document_upload event`);
        return { ok: true };
    } catch (error) {
        console.error('[Webhook] Error sending document:', error);
        return { ok: false, message: error.message };
    }
};

export const sendMultipleDocumentsEvent = async (personId, documentType, files) => {
    const formData = new FormData();

    formData.append('eventId', generateEventId());
    formData.append('eventType', 'document_upload');
    formData.append('timestamp', new Date().toISOString());
    formData.append('personId', personId);
    formData.append('documentType', documentType);
    formData.append('status', 'ontvangen');
    formData.append('fileCount', files.length.toString());

    files.forEach((file, index) => {
        if (file && file instanceof File) {
            formData.append(`file_${index}`, file, file.name);
            formData.append(`fileName_${index}`, file.name);
            formData.append(`fileType_${index}`, file.type);
            formData.append(`fileSize_${index}`, file.size.toString());
        }
    });

    try {
        console.log(`[Webhook] Sending multi-file document_upload event:`, {
            personId,
            documentType,
            fileCount: files.length
        });

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            console.error(`[Webhook] Failed with status ${response.status}`);
            return { ok: false, message: `HTTP ${response.status}` };
        }

        console.log(`[Webhook] Successfully sent multi-file document_upload event`);
        return { ok: true };
    } catch (error) {
        console.error('[Webhook] Error sending documents:', error);
        return { ok: false, message: error.message };
    }
};

export const sendApplicationSubmitEvent = async (applicationData) => {
    return sendWebhookData('application_submit', {
        data: applicationData
    });
};

export const sendLetterOfIntentEvent = async (loiData) => {
    const tenants = loiData.tenantData?.personen?.map(person => ({
        rol: person.rol,
        naam: person.naam,
        email: person.email,
        phone: person.telefoon || person.whatsapp,
        income: person.inkomen,
        workStatus: person.werkstatus,
        address: person.adres,
        postcode: person.postcode,
        city: person.woonplaats,
        documents: (person.documenten || []).map(doc => ({
            type: doc.type,
            status: doc.status,
            fileName: doc.file?.name || (doc.files ? doc.files.map(f => f.name).join(', ') : null)
        }))
    })) || [];

    return sendWebhookData('loi_signed', {
        data: {
            bidAmount: loiData.bidAmount,
            startDate: loiData.startDate,
            motivation: loiData.motivation,
            monthsAdvance: loiData.monthsAdvance,
            property: {
                address: loiData.property?.adres,
                huurprijs: loiData.property?.voorwaarden?.huurprijs,
                waarborgsom: loiData.property?.voorwaarden?.waarborgsom,
                servicekosten: loiData.property?.voorwaarden?.servicekosten
            },
            tenants,
            conditionsAccepted: loiData.conditionsAccepted,
            brokerFeeAccepted: loiData.brokerFeeAccepted,
            signedAt: new Date().toISOString(),
            phoneNumber: loiData.phoneNumber
        }
    });
};
