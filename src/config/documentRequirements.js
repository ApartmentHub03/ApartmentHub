/**
 * Document requirement configuration by work status
 */

// Document types for each work status - Tenants
export const documentsByWorkStatus = {
    student: [
        { type: 'id_bewijs', description: 'Paspoort of ID-kaart', verplicht: true },
        { type: 'inschrijfbewijs', description: 'Bewijs van inschrijving bij onderwijsinstelling', verplicht: true },
        { type: 'goed_huurderschap', description: 'Verklaring van vorige verhuurder', verplicht: false },
        { type: 'uwv_bestand', description: 'UWV verzekeringsbericht', verplicht: false },
        { type: 'brp_uittreksel', description: 'Uittreksel Basisregistratie Personen', verplicht: false },
        { type: 'extra_inkomen', description: 'Bewijs van extra inkomen', verplicht: false },
    ],
    werknemer: [
        { type: 'id_bewijs', description: 'Paspoort of ID-kaart', verplicht: true },
        { type: 'arbeidscontract', description: 'Huidig arbeidscontract of werkgeversverklaring', verplicht: true },
        { type: 'loonstroken', description: 'Laatste 3 loonstroken', verplicht: true, multiFile: true, minFiles: 1, maxFiles: 3 },
        { type: 'goed_huurderschap', description: 'Verklaring van vorige verhuurder', verplicht: false },
        { type: 'uwv_bestand', description: 'UWV verzekeringsbericht', verplicht: false },
        { type: 'brp_uittreksel', description: 'Uittreksel Basisregistratie Personen', verplicht: false },
        { type: 'extra_inkomen', description: 'Bewijs van extra inkomen', verplicht: false },
    ],
    ondernemer: [
        { type: 'id_bewijs', description: 'Paspoort of ID-kaart', verplicht: true },
        { type: 'kvk_uittreksel', description: 'Recent extract Chamber of Commerce', verplicht: false },
        { type: 'jaarrekening', description: 'Last 1-2 years', verplicht: true },
        { type: 'belastingaangifte', description: 'Tax returns last years', verplicht: false },
        { type: 'goed_huurderschap', description: 'Verklaring van vorige verhuurder', verplicht: false },
        { type: 'uwv_bestand', description: 'UWV verzekeringsbericht', verplicht: false },
        { type: 'brp_uittreksel', description: 'Uittreksel Basisregistratie Personen', verplicht: false },
        { type: 'extra_inkomen', description: 'Bewijs van extra inkomen', verplicht: false },
    ],
    pensioen: [
        { type: 'id_bewijs', description: 'Paspoort of ID-kaart', verplicht: true },
        { type: 'pensioen_bewijs', description: 'Bewijs van pensioeninkomen', verplicht: true },
        { type: 'bankafschrift', description: 'Bankafschrift met pensioenstorting', verplicht: true },
    ]
};

// Tenant-only optional documents
export const tenantOnlyDocuments = [
    { type: 'referentie', description: 'Referentie van vorige verhuurder', verplicht: false },
    { type: 'bankafschrift_huur', description: 'Bankafschrift met laatste huurbetalingen', verplicht: false },
];

// Work status labels
export const workStatusLabels = {
    nl: {
        student: 'Student',
        werknemer: 'Werknemer',
        ondernemer: 'Ondernemer',
        pensioen: 'Gepensioneerd'
    },
    en: {
        student: 'Student',
        werknemer: 'Employee',
        ondernemer: 'Entrepreneur',
        pensioen: 'Retired'
    }
};

// Document type translations
export const documentTypeLabels = {
    nl: {
        id_bewijs: { name: 'ID-bewijs', description: 'Paspoort of ID-kaart' },
        inschrijfbewijs: { name: 'Inschrijfbewijs', description: 'Bewijs van inschrijving onderwijsinstelling' },
        studiefinanciering: { name: 'Studiefinanciering', description: 'Bewijs van studiefinanciering of DUO' },
        arbeidscontract: { name: 'Arbeidscontract of Werkgeversverklaring', description: 'Huidig arbeidscontract of werkgeversverklaring' },
        loonstroken: { name: 'Loonstroken', description: 'Laatste 1-3 maanden' },
        werkgeversverklaring: { name: 'werkgeversverklaring', description: 'Ingevuld door werkgever (max 1 maand oud)' },
        kvk_uittreksel: { name: 'KvK uittreksel (Bewijs dat jij eigenaar bent)', description: 'Recent uittreksel Kamer van Koophandel' },
        jaarrekening: { name: 'Jaarrekening', description: 'Jaarrekening of belastingaangifte laatste 2 jaar' },
        accountantsverklaring: { name: 'Accountantsverklaring', description: 'Accountantsverklaring of IB60 formulier' },
        pensioen_bewijs: { name: 'Pensioenbewijs', description: 'Bewijs van pensioeninkomen' },
        bankafschrift: { name: 'bankafschrift', description: 'Met daarop gestort salaris' },
        referentie: { name: 'Referentie', description: 'Referentie van vorige verhuurder' },
        bankafschrift_huur: { name: 'Bankafschrift huur', description: 'Bankafschrift met laatste huurbetalingen' },
        goed_huurderschap: { name: 'Verklaring goed huurderschap', description: 'Optioneel: Verklaring van vorige verhuurder' },
        uwv_bestand: { name: 'UWV bestand', description: 'Optioneel: UWV-document' },
        brp_uittreksel: { name: 'BRP-uittreksel', description: 'Optioneel: Uittreksel Basisregistratie Personen' },
        extra_inkomen: { name: 'Extra inkomen', description: 'Optioneel: bijverdiensten, alimentatie, etc.' }
    },
    en: {
        id_bewijs: { name: 'ID Document', description: 'Passport or ID card' },
        inschrijfbewijs: { name: 'Proof of Enrollment', description: 'Proof of enrollment at educational institution' },
        studiefinanciering: { name: 'Student Finance', description: 'Proof of student financing or DUO' },
        arbeidscontract: { name: 'Employment Contract or Employer Statement', description: 'Current employment contract or employer statement' },
        loonstroken: { name: 'Salary Slips', description: 'Last 1-3 months' },
        werkgeversverklaring: { name: 'Employer statement', description: 'Filled in by employer (max 1 month old)' },
        kvk_uittreksel: { name: 'Chamber of Commerce Extract', description: 'Recent extract Chamber of Commerce' },
        jaarrekening: { name: 'Annual Statements', description: 'Last 1-2 years' },
        belastingaangifte: { name: 'Tax Returns', description: 'Tax returns last years' },
        accountantsverklaring: { name: 'Accountant Statement', description: 'Accountant statement or IB60 form' },
        pensioen_bewijs: { name: 'Pension Proof', description: 'Proof of pension income' },
        bankafschrift: { name: 'Bank statement', description: 'With salary deposit' },
        referentie: { name: 'Reference', description: 'Reference from previous landlord' },
        bankafschrift_huur: { name: 'Rent Bank Statement', description: 'Bank statement with last rental payments' },
        goed_huurderschap: { name: 'Good Landlord Reference', description: 'Optional: Good landlord statement' },
        uwv_bestand: { name: 'UWV Document', description: 'Optional: UWV document' },
        brp_uittreksel: { name: 'BRP Extract', description: 'Optional: Basic Registration excerpt' },
        extra_inkomen: { name: 'Additional Income', description: 'Optional: side income, alimony, etc.' }
    }
};
