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

export const sendDocumentUploadEvent = async (personId, documentType, fileName) => {
    return sendWebhookData('document_upload', {
        data: {
            personId,
            documentType,
            fileName,
            status: 'ontvangen'
        }
    });
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
