const BAG_API = 'https://api.bag.nl/api/v1';

export function osmEmbedUrl(lat, lon) {
  const bbox = `${lon - 0.006},${lat - 0.004},${lon + 0.006},${lat + 0.004}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
}

export async function lookupBag(query) {
  try {
    const url = `${BAG_API}/search?query=${encodeURIComponent(query)}&rows=5`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'ApartmentHub/1.0', 'Accept': 'application/hal+json' },
    });
    if (!res.ok) {
      return { found: false };
    }
    const data = await res.json();
    const results = data?.response?.docs;
    if (!results || results.length === 0) {
      return { found: false };
    }
    const first = results[0];
    const lat = first?.centroid?.lat ?? first?.geometrie?.coordinates?.[1];
    const lon = first?.centroid?.lon ?? first?.geometrie?.coordinates?.[0];
    return {
      found: true,
      weergavenaam: first?.weergavenaam ?? '',
      woonplaats: first?.woonplaatsnaam ?? '',
      oppervlakte: first?.oppervlakte?.toInt?.() ?? null,
      bouwjaar: first?.bouwjaar ?? null,
      lat: typeof lat === 'number' ? lat : null,
      lon: typeof lon === 'number' ? lon : null,
    };
  } catch {
    return { found: false };
  }
}