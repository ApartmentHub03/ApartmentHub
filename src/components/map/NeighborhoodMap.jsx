'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { CITY_CENTER } from '../../lib/valuation';
import styles from './NeighborhoodMap.module.css';

import 'leaflet/dist/leaflet.css';

const SELECTED_STYLE = {
  color: '#FF7D28',
  weight: 2.5,
  fillColor: '#FF7D28',
  fillOpacity: 0.5,
};

const UNSELECTED_STYLE = {
  color: '#009B8A',
  weight: 1.5,
  fillColor: '#009B8A',
  fillOpacity: 0.18,
};

const HOVER_STYLE = {
  weight: 3,
  fillOpacity: 0.55,
};

function GeoJsonLayer({ city, selectedNeighborhoods, onSelect }) {
  const map = useMap();
  const layerRef = useRef(null);
  const onSelectRef = useRef(onSelect);
  const selectedRef = useRef(selectedNeighborhoods);
  onSelectRef.current = onSelect;
  selectedRef.current = selectedNeighborhoods;

  useEffect(() => {
    let cancelled = false;

    fetch('/wijken.geojson')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const L = window.L;
        if (!L) return;

        const feats = (data.features || []).filter(
          (f) => f.properties?.city === city
        );

        const styleFor = (groep) =>
          selectedRef.current.includes(groep) ? SELECTED_STYLE : UNSELECTED_STYLE;

        const layer = L.geoJSON(
          { type: 'FeatureCollection', features: feats },
          {
            style: (feat) => styleFor(feat.properties.groep),
            onEachFeature: (feat, lyr) => {
              const g = feat.properties.groep;
              lyr.bindTooltip(g, { sticky: true });
              lyr.on('click', () => onSelectRef.current(g));
              lyr.on('mouseover', () => {
                lyr.setStyle({
                  ...HOVER_STYLE,
                  fillColor: selectedRef.current.includes(g)
                    ? SELECTED_STYLE.fillColor
                    : UNSELECTED_STYLE.fillColor,
                  color: selectedRef.current.includes(g)
                    ? SELECTED_STYLE.color
                    : UNSELECTED_STYLE.color,
                });
              });
              lyr.on('mouseout', () => {
                lyr.setStyle(styleFor(g));
              });
            },
          }
        ).addTo(map);

        layerRef.current = layer;
        try {
          map.fitBounds(layer.getBounds(), { padding: [16, 16] });
        } catch {
          // empty layer
        }
        setTimeout(() => map.invalidateSize(), 150);
      })
      .catch(() => {
        // geojson fetch failed — map shows tiles only
      });

    return () => {
      cancelled = true;
      if (layerRef.current) {
        layerRef.current.remove();
        layerRef.current = null;
      }
    };
  }, [city, map]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    const styleFor = (groep) =>
      selectedNeighborhoods.includes(groep) ? SELECTED_STYLE : UNSELECTED_STYLE;
    layer.eachLayer((lyr) => {
      const g = lyr.feature?.properties?.groep;
      if (g) lyr.setStyle(styleFor(g));
    });
  }, [selectedNeighborhoods]);

  return null;
}

const NeighborhoodMap = ({ selectedNeighborhoods, onSelect, city = 'amsterdam' }) => {
  const center = CITY_CENTER[city] || CITY_CENTER.amsterdam;

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom={false}
        className={styles.leafletContainer}
        attributionControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GeoJsonLayer
          city={city}
          selectedNeighborhoods={selectedNeighborhoods}
          onSelect={onSelect}
        />
      </MapContainer>
    </div>
  );
};

export default NeighborhoodMap;