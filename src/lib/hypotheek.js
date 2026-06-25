export const ENERGIELABEL_OPTIES = [
  'A+++ of beter',
  'A++',
  'A of A+',
  'B of C',
  'D of lager',
  'Onbekend',
];

const ENERGIE_EXTRA = {
  'A+++ of beter': 50000,
  'A++': 20000,
  'A of A+': 10000,
  'B of C': 5000,
  'D of lager': 0,
  Onbekend: 0,
};

const ENERGIELABEL_EN = {
  'A+++ of beter': 'A+++ or better',
  'A++': 'A++',
  'A of A+': 'A or A+',
  'B of C': 'B or C',
  'D of lager': 'D or lower',
  Onbekend: 'Unknown',
};

function woonquoteVoor(inkomen) {
  const tabel = [
    [20000, 0.16],
    [30000, 0.225],
    [40000, 0.25],
    [50000, 0.275],
    [65000, 0.295],
    [80000, 0.315],
    [100000, 0.34],
    [120000, 0.36],
    [Infinity, 0.385],
  ];
  for (const [grens, q] of tabel) {
    if (inkomen <= grens) return q;
  }
  return 0.385;
}

export function berekenHypotheek({ inkomen, partnerInkomen, eigenGeld, rente, studieschuld, energielabel }) {
  const toetsinkomen = Math.max(0, (inkomen || 0) + (partnerInkomen || 0));
  if (toetsinkomen <= 0) return null;

  const woonquote = woonquoteVoor(toetsinkomen);
  let maxWoonlastJaar = toetsinkomen * woonquote;

  const studieMaandlast = (studieschuld || 0) * 0.0065;
  maxWoonlastJaar = Math.max(0, maxWoonlastJaar - studieMaandlast * 12);

  const r = Math.max(0.0001, (rente || 4) / 100);
  const annuiteitsfactor = r / (1 - Math.pow(1 + r, -30));
  const maxHypotheekInkomen = maxWoonlastJaar / annuiteitsfactor;

  const energieExtra = ENERGIE_EXTRA[energielabel] ?? 0;
  const maxHypotheek = Math.round((maxHypotheekInkomen + energieExtra) / 1000) * 1000;
  const maxKoopprijs = maxHypotheek + (eigenGeld || 0);

  const rm = r / 12;
  const maandlasten = Math.round(maxHypotheek * (rm / (1 - Math.pow(1 + rm, -360))));
  const studieEffect = Math.round(((studieMaandlast * 12) / annuiteitsfactor) / 1000) * 1000;

  return {
    toetsinkomen,
    woonquote,
    maxWoonlastMaand: Math.round(maxWoonlastJaar / 12),
    maxHypotheek,
    maxKoopprijs,
    maandlasten,
    energieExtra,
    studieEffect,
    annuiteitsfactor,
  };
}

export const energielabelLabel = (value, isNl) => {
  if (isNl) return value;
  return ENERGIELABEL_EN[value] || value;
};