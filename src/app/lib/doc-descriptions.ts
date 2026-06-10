export const DOC_DESCRIPTIONS: Record<string, { en: string; nl: string }> = {
  mjop:             { en: "Multi-year maintenance plan (MJOP)",                nl: "Meerjarenonderhoudsplan (MJOP)" },
  notulen:          { en: "VvE meeting minutes",                                nl: "Notulen van de VvE-vergadering" },
  jaarrekening:     { en: "VvE annual accounts",                                nl: "Jaarrekening van de VvE" },
  reservefonds:     { en: "Reserve fund statement",                             nl: "Reservefonds-overzicht" },
  opstal:           { en: "VvE building insurance",                              nl: "Opstalverzekering van de VvE" },
  huishoudelijk:    { en: "VvE house rules (huishoudelijk reglement)",             nl: "Huishoudelijk reglement VvE" },
  splitsingsakte:   { en: "Notarial split deed",                                nl: "Splitsingsakte" },
  leveringsakte:    { en: "Deed of transfer",                                   nl: "Leveringsakte" },
  kvk:              { en: "Chamber of Commerce extract",                        nl: "KvK-uittreksel" },
  hypotheek:        { en: "Mortgage statement",                                 nl: "Hypotheekoverzicht" },
  erfpacht:         { en: "Leasehold documents",                                 nl: "Erfpachtdocumenten" },
  garanties:        { en: "Warranties",                                          nl: "Garantiebewijzen" },
  "cv-onderhoud":   { en: "Boiler service contract",                            nl: "CV-onderhoudscontract" },
  zonnepanelen:     { en: "Solar panel documents",                              nl: "Zonnepanelendocumenten" },
  vergunningen:     { en: "Building permits",                                   nl: "Omgevingsvergunningen" },
  bouwtekeningen:   { en: "Construction drawings",                               nl: "Bouwtekeningen" },
  asbest:           { en: "Asbestos report",                                    nl: "Asbestinventarisatie" },
  fundering:        { en: "Foundation report",                                  nl: "Funderingsrapport" },
  seller_id_masked: { en: "Masked ID (KopieID)",                                nl: "Gemaskerd ID (KopieID)" },
};

export const DOC_KEYS = Object.keys(DOC_DESCRIPTIONS);

export const ROLE_DEFAULT_DOCS: Record<string, string[]> = {
  vve:      ["splitsingsakte", "notulen", "jaarrekening", "mjop", "opstal", "reservefonds", "kvk"],
  notary:   ["leveringsakte", "splitsingsakte"],
  lawyer:   ["splitsingsakte"],
  partner:  ["hypotheek"],
  buyer:    [],
  seller:   [],
};