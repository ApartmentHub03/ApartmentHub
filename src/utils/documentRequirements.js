import { documentsByWorkStatus, tenantOnlyDocuments } from '../config/documentRequirements';

export const getRequiredDocuments = (status, role = 'tenant') => {
    // If it is a guarantor, we currently don't have a specific config in the file for guarantors distinct from the general structure, 
    // but the request specifically asked for the "Employee" work status to match the 7 documents.
    // The previous hardcoded logic had specific arrays for guarantors. 
    // However, looking at the user's config file (which I modified previously), it exports `documentsByWorkStatus`.
    // I should use that. 

    // Note: The new config in `src/config/documentRequirements.js` has `werknemer`, `ondernemer`, `student`, `gepensioneerd`.
    // It does not seemingly distinguish between tenant and guarantor in the *config* object itself, 
    // effectively unifying them or expecting the consumer to filter.
    // However, the prompt implies "Document Requirements (Employee)" logic.
    // For now, I will map the status to the config.

    const docs = documentsByWorkStatus[status] || [];

    // If logic differs for guarantor (e.g. less docs), we might need to filter. 
    // But the user's main request was about the "Details" section for a *Tenant*.
    // So returning the full list for the status matches the requirement.

    return docs;
};
