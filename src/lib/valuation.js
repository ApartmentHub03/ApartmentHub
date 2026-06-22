export const NEIGHBORHOOD_PRICES = {
  amsterdam: {
    'Oud Zuid': 10000,
    'Zuidas': 9400,
    'Centrum': 8900,
    'Jordaan': 8200,
    'De Pijp': 7300,
    'Oost': 6900,
    'Noord': 6500,
    'West': 6100,
  },
  utrecht: {
    'Wilhelminapark': 7500,
    'Wittevrouwen': 6700,
    'Binnenstad': 6500,
    'Lombok': 6100,
    'Oog in Al': 5800,
    'Tuinwijk': 5600,
    'Voordorp': 5400,
    'Leidsche Rijn': 5000,
  },
};

export const DEFAULT_PRICE = {
  amsterdam: 7500,
  utrecht: 5800,
};

export const TYPE_OPTIONS = [
  'Appartement',
  'Eengezinswoning',
  'Penthouse',
  'Maisonette',
  'Studio',
];

export const TYPE_OPTIONS_EN = {
  'Appartement': 'Apartment',
  'Eengezinswoning': 'Detached house',
  'Penthouse': 'Penthouse',
  'Maisonette': 'Maisonette',
  'Studio': 'Studio',
};

export const BOUWPERIODE_OPTIONS = [
  'Voor 1900',
  '1900-1945',
  '1945-1970',
  '1970-1990',
  '1990-2005',
  '2005-2015',
  'Na 2015',
];

export const BOUWPERIODE_OPTIONS_EN = {
  'Voor 1900': 'Before 1900',
  '1900-1945': '1900-1945',
  '1945-1970': '1945-1970',
  '1970-1990': '1970-1990',
  '1990-2005': '1990-2005',
  '2005-2015': '2005-2015',
  'Na 2015': 'After 2015',
};

export const STAAT_OPTIONS = [
  'Uitstekend',
  'Goed',
  'Redelijk',
  'Renovatie nodig',
];

export const STAAT_OPTIONS_EN = {
  'Uitstekend': 'Excellent',
  'Goed': 'Good',
  'Redelijk': 'Reasonable',
  'Renovatie nodig': 'Needs renovation',
};

export const ENERGIE_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

export const BUITEN_OPTIONS = [
  'Geen',
  'Balkon',
  'Tuin',
  'Dakterras',
  'Balkon + tuin',
];

export const BUITEN_OPTIONS_EN = {
  'Geen': 'None',
  'Balkon': 'Balcony',
  'Tuin': 'Garden',
  'Dakterras': 'Roof terrace',
  'Balkon + tuin': 'Balcony + garden',
};

export const SOUTERRAIN_OPTIONS = ['Nee', 'Ja'];

export const SOUTERRAIN_OPTIONS_EN = { 'Nee': 'No', 'Ja': 'Yes' };

export const PARKEREN_OPTIONS = ['Ja', 'Nee'];
export const PARKEREN_OPTIONS_EN = { 'Ja': 'Yes', 'Nee': 'No' };

export function formatEUR(n) {
  return new Intl.NumberFormat('nl-NL').format(n);
}

export function bouwjaarToBouwperiode(year) {
  const y = Number(year);
  if (y < 1900) return 'Voor 1900';
  if (y <= 1945) return '1900-1945';
  if (y <= 1970) return '1945-1970';
  if (y <= 1990) return '1970-1990';
  if (y <= 2005) return '1990-2005';
  if (y <= 2015) return '2005-2015';
  return 'Na 2015';
}

export function calculateValuation({
  city,
  wijk,
  oppervlakte,
  bouwperiode,
  staat,
  energielabel,
  buitenruimte,
  parkeren,
  souterrain,
}) {
  const basePerM2 = NEIGHBORHOOD_PRICES[city]?.[wijk] ?? DEFAULT_PRICE[city];
  const yearFactors = {
    'Voor 1900': 1.03, '1900-1945': 0.97, '1945-1970': 0.95,
    '1970-1990': 0.97, '1990-2005': 1.0, '2005-2015': 1.03, 'Na 2015': 1.07,
  };
  const stateFactors = {
    'Uitstekend': 1.1, 'Goed': 1.0, 'Redelijk': 0.92, 'Renovatie nodig': 0.82,
  };
  const energyFactors = {
    'A': 1.06, 'B': 1.03, 'C': 1.0, 'D': 0.97,
    'E': 0.94, 'F': 0.91, 'G': 0.88,
  };
  const buitenFactors = {
    'Geen': 0.97, 'Balkon': 1.0, 'Tuin': 1.05,
    'Dakterras': 1.02, 'Balkon + tuin': 1.07,
  };
  const parkerenFactor = parkeren === 'Ja' ? 1.04 : 0.98;
  const souterrainFactor = souterrain === 'Ja' ? 0.97 : 1.0;

  const yf = yearFactors[bouwperiode] ?? 1;
  const sf = stateFactors[staat] ?? 1;
  const ef = energyFactors[energielabel] ?? 1;
  const bf = buitenFactors[buitenruimte] ?? 1;

  const basicswaarde = basePerM2 * oppervlakte * yf * sf * ef * bf * parkerenFactor * souterrainFactor;
  const laag = Math.round(basicswaarde * 0.92);
  const hoog = Math.round(basicswaarde * 1.08);

  return {
    basicswaarde: Math.round(basicswaarde),
    laag,
    hoog,
    pricePerM2: Math.round(basePerM2),
  };
}