const LOCATIESERVER_URL = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/free';
const BAG_WFS_URL = 'https://service.pdok.nl/lv/bag/wfs/v2_0';

function wfsBase() {
  const u = new URL(BAG_WFS_URL);
  u.searchParams.set('service', 'WFS');
  u.searchParams.set('version', '2.0.0');
  u.searchParams.set('request', 'GetFeature');
  u.searchParams.set('typeName', 'bag:verblijfsobject');
  u.searchParams.set('outputFormat', 'application/json');
  return u;
}

function fesEq(field, value) {
  return (
    '<fes:Filter xmlns:fes="http://www.opengis.net/fes/2.0"><fes:PropertyIsEqualTo>' +
    `<fes:ValueReference>${field}</fes:ValueReference><fes:Literal>${value}</fes:Literal>` +
    '</fes:PropertyIsEqualTo></fes:Filter>'
  );
}

export function osmEmbedUrl(lat, lon) {
  const dLon = 0.0055;
  const dLat = 0.0032;
  const bbox = `${lon - dLon},${lat - dLat},${lon + dLon},${lat + dLat}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

export async function lookupBag(address) {
  if (!address?.trim()) return { found: false };

  try {
    const locUrl = new URL(LOCATIESERVER_URL);
    locUrl.searchParams.set('q', address);
    locUrl.searchParams.set('fq', 'type:adres');
    locUrl.searchParams.set('rows', '1');
    locUrl.searchParams.set('fl', 'weergavenaam adresseerbaarobject_id centroide_ll woonplaatsnaam');

    const locRes = await fetch(locUrl.toString());
    if (!locRes.ok) return { found: false };
    const locJson = await locRes.json();
    const doc = locJson?.response?.docs?.[0];
    if (!doc?.adresseerbaarobject_id) return { found: false };

    const id = doc.adresseerbaarobject_id;
    const weergavenaam = doc.weergavenaam ?? address;
    const woonplaats = doc.woonplaatsnaam;

    let lat;
    let lon;
    const m = String(doc.centroide_ll ?? '').match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
    if (m) {
      lon = parseFloat(m[1]);
      lat = parseFloat(m[2]);
    }

    let oppervlakte = null;
    let bouwjaar = null;
    let gebruiksdoel = null;
    let woningtype = null;

    try {
      const wfsUrl = wfsBase();
      wfsUrl.searchParams.set('count', '1');
      wfsUrl.searchParams.set('filter', fesEq('identificatie', id));

      const wfsRes = await fetch(wfsUrl.toString());
      if (wfsRes.ok) {
        const wfsJson = await wfsRes.json();
        const props = wfsJson?.features?.[0]?.properties;
        if (props) {
          oppervlakte = props.oppervlakte != null ? Number(props.oppervlakte) : null;
          bouwjaar = props.bouwjaar != null ? Number(props.bouwjaar) : null;
          gebruiksdoel = props.gebruiksdoel ?? null;

          const pandId = props.pandidentificatie;
          if (pandId) {
            try {
              const pUrl = wfsBase();
              pUrl.searchParams.set('count', '2');
              pUrl.searchParams.set('filter', fesEq('pandidentificatie', String(pandId)));
              const pRes = await fetch(pUrl.toString());
              if (pRes.ok) {
                const pJson = await pRes.json();
                const n = pJson?.features?.length ?? 0;
                if (n >= 2) woningtype = 'Appartement';
                else if (n === 1) woningtype = 'Eengezinswoning';
              }
            } catch {
              // type inference optional
            }
          }
        }
      }
    } catch {
      // BAG detail optional; location already found
    }

    return { found: true, weergavenaam, woonplaats, lat, lon, oppervlakte, bouwjaar, gebruiksdoel, woningtype };
  } catch {
    return { found: false };
  }
}