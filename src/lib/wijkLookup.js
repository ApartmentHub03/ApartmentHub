function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon, lat, coords, type) {
  if (type === 'Polygon') {
    if (!pointInRing(lon, lat, coords[0])) return false;
    for (let k = 1; k < coords.length; k++) {
      if (pointInRing(lon, lat, coords[k])) return false;
    }
    return true;
  }
  if (type === 'MultiPolygon') {
    return coords.some((poly) => pointInPolygon(lon, lat, poly, 'Polygon'));
  }
  return false;
}

let cache = null;

export async function wijkForPoint(lat, lon, city) {
  try {
    if (!cache) cache = await fetch('/wijken.geojson').then((r) => r.json());
    const feats = (cache.features || []).filter((f) => f.properties?.city === city);
    for (const f of feats) {
      if (pointInPolygon(lon, lat, f.geometry.coordinates, f.geometry.type)) {
        return f.properties.groep;
      }
    }
  } catch {
    // optional; visitor can choose district manually
  }
  return null;
}