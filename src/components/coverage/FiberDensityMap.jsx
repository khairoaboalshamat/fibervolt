import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';

function DensityLayer({ pins, mode }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    if (!pins.length) return;

    const gridSize = 0.01; // ~1km grid cells
    const cells = {};

    pins.forEach(pin => {
      if (!pin.lat || !pin.lng) return;
      const cellLat = Math.floor(pin.lat / gridSize) * gridSize;
      const cellLng = Math.floor(pin.lng / gridSize) * gridSize;
      const key = `${cellLat},${cellLng}`;
      if (!cells[key]) cells[key] = { lat: cellLat, lng: cellLng, total: 0, fiber: 0, customers: 0, leads: 0 };
      cells[key].total++;
      if (pin.fiber_status === 'available') cells[key].fiber++;
      if (pin.status === 'sale' || pin.status === 'installed' || pin.status === 'already_customer') cells[key].customers++;
      if (pin.fiber_status === 'available' && pin.status !== 'sale' && pin.status !== 'installed' && pin.status !== 'already_customer') cells[key].leads++;
    });

    const layer = L.layerGroup();
    Object.values(cells).forEach(cell => {
      let value, maxVal, color;
      if (mode === 'fiber') { value = cell.fiber; maxVal = Math.max(...Object.values(cells).map(c => c.fiber)); color = '#16a34a'; }
      else if (mode === 'customers') { value = cell.customers; maxVal = Math.max(...Object.values(cells).map(c => c.customers)); color = '#2563eb'; }
      else if (mode === 'leads') { value = cell.leads; maxVal = Math.max(...Object.values(cells).map(c => c.leads)); color = '#f97316'; }
      else { value = cell.total; maxVal = Math.max(...Object.values(cells).map(c => c.total)); color = '#8b5cf6'; }

      if (value === 0 || maxVal === 0) return;
      const opacity = 0.15 + (value / maxVal) * 0.65;
      L.rectangle(
        [[cell.lat, cell.lng], [cell.lat + gridSize, cell.lng + gridSize]],
        { color, fillColor: color, fillOpacity: opacity, weight: 0.5, opacity: 0.3 }
      ).addTo(layer);
    });

    layer.addTo(map);
    layerRef.current = layer;
    return () => { if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; } };
  }, [pins, mode, map]);

  return null;
}

const MODES = [
  { id: 'leads', label: 'Opportunity', color: '#f97316' },
  { id: 'fiber', label: 'Fiber Coverage', color: '#16a34a' },
  { id: 'customers', label: 'Customers', color: '#2563eb' },
  { id: 'total', label: 'Total Density', color: '#8b5cf6' },
];

export default function FiberDensityMap({ pins }) {
  const [mode, setMode] = useState('leads');

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
            style={mode === m.id
              ? { background: m.color, color: 'white', borderColor: m.color }
              : { background: 'white', color: '#374151', borderColor: '#e5e7eb' }}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 400 }}>
        <MapContainer center={[39.8283, -98.5795]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
          <DensityLayer pins={pins} mode={mode} />
        </MapContainer>
      </div>
      <p className="text-xs text-center" style={{ color: '#9ca3af' }}>Darker cells = higher density. Zoom in for detail.</p>
    </div>
  );
}