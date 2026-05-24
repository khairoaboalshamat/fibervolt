import React, { useEffect, useRef, useMemo, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Wifi, WifiOff, Zap, Info } from 'lucide-react';

// Grid-cell-based density heatmap rendered on a canvas overlay
function DensityLayer({ pins, mode }) {
  const map = useMap();
  const canvasRef = useRef(null);

  // Bucket pins into lat/lng grid cells, compute density
  const cells = useMemo(() => {
    const GRID = 0.02; // ~2km cells
    const buckets = {};
    pins.forEach(p => {
      if (!p.lat || !p.lng) return;
      const row = Math.floor(p.lat / GRID);
      const col = Math.floor(p.lng / GRID);
      const key = `${row}_${col}`;
      if (!buckets[key]) buckets[key] = { lat: row * GRID + GRID / 2, lng: col * GRID + GRID / 2, total: 0, fiber: 0, customers: 0, opportunity: 0 };
      buckets[key].total++;
      if (p.fiber_status === 'available') buckets[key].fiber++;
      if (p.status === 'sale' || p.status === 'installed' || p.status === 'already_customer') buckets[key].customers++;
      if (p.fiber_status === 'available' && p.status !== 'sale' && p.status !== 'installed' && p.status !== 'already_customer') buckets[key].opportunity++;
    });
    return Object.values(buckets);
  }, [pins]);

  useEffect(() => {
    if (!cells.length) return;

    // Remove old overlay if any
    if (canvasRef.current) {
      canvasRef.current.remove();
      canvasRef.current = null;
    }

    const canvas = L.canvas();
    canvasRef.current = canvas;

    // Custom layer that draws colored rectangles on the canvas
    const GridLayer = L.Layer.extend({
      onAdd(map) {
        this._map = map;
        this._el = document.createElement('canvas');
        this._el.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;';
        map.getPane('overlayPane').appendChild(this._el);
        map.on('moveend zoomend resize', this._draw, this);
        this._draw();
      },
      onRemove(map) {
        map.off('moveend zoomend resize', this._draw, this);
        this._el.remove();
      },
      _draw() {
        const map = this._map;
        const size = map.getSize();
        this._el.width = size.x;
        this._el.height = size.y;
        const ctx = this._el.getContext('2d');
        ctx.clearRect(0, 0, size.x, size.y);

        const GRID = 0.02;
        const maxVal = Math.max(...cells.map(c => mode === 'fiber' ? c.fiber : mode === 'opportunity' ? c.opportunity : mode === 'customers' ? c.customers : c.total), 1);

        cells.forEach(c => {
          const val = mode === 'fiber' ? c.fiber : mode === 'opportunity' ? c.opportunity : mode === 'customers' ? c.customers : c.total;
          if (val === 0) return;

          const nw = map.latLngToContainerPoint([c.lat + GRID / 2, c.lng - GRID / 2]);
          const se = map.latLngToContainerPoint([c.lat - GRID / 2, c.lng + GRID / 2]);
          const w = Math.max(se.x - nw.x, 2);
          const h = Math.max(se.y - nw.y, 2);
          const intensity = val / maxVal;

          let r, g, b;
          if (mode === 'fiber') {
            // green gradient
            r = Math.round(34 + (1 - intensity) * 180);
            g = Math.round(197 - (1 - intensity) * 60);
            b = Math.round(94 - intensity * 50);
          } else if (mode === 'opportunity') {
            // orange/red gradient — high opportunity = hot
            r = Math.round(234 - (1 - intensity) * 100);
            g = Math.round(179 - intensity * 140);
            b = Math.round(8);
          } else if (mode === 'customers') {
            // blue gradient
            r = Math.round(59 + (1 - intensity) * 150);
            g = Math.round(130 - (1 - intensity) * 60);
            b = Math.round(246);
          } else {
            // purple for total density
            r = Math.round(139 - (1 - intensity) * 60);
            g = Math.round(92 - intensity * 40);
            b = Math.round(246);
          }

          ctx.fillStyle = `rgba(${r},${g},${b},${0.25 + intensity * 0.55})`;
          ctx.fillRect(nw.x, nw.y, w, h);

          // Label count on larger cells
          if (w > 30 && h > 20) {
            ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
            ctx.font = `bold ${Math.min(12, w / 4)}px Inter,sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(val, nw.x + w / 2, nw.y + h / 2);
          }
        });
      },
    });

    const layer = new GridLayer();
    layer._cells = cells;
    layer._mode = mode;
    layer.addTo(map);

    return () => {
      layer.remove();
    };
  }, [map, cells, mode]);

  return null;
}

function AutoFit({ pins }) {
  const map = useMap();
  useEffect(() => {
    const valid = pins.filter(p => p.lat && p.lng);
    if (valid.length < 2) return;
    const bounds = L.latLngBounds(valid.map(p => [p.lat, p.lng]));
    map.fitBounds(bounds.pad(0.2), { maxZoom: 13 });
  }, [pins, map]);
  return null;
}

const MODES = [
  { id: 'opportunity', label: 'Opportunity', icon: Zap, desc: 'Fiber available, no customer yet', color: '#f59e0b' },
  { id: 'fiber', label: 'Fiber Coverage', icon: Wifi, desc: 'Addresses with fiber available', color: '#16a34a' },
  { id: 'customers', label: 'Customers', icon: Wifi, desc: 'Active customers / sales', color: '#2563eb' },
  { id: 'total', label: 'All Pins', icon: WifiOff, desc: 'Total pin density', color: '#7c3aed' },
];

export default function FiberDensityMap({ pins }) {
  const [mode, setMode] = useState('opportunity');
  const validPins = useMemo(() => pins.filter(p => p.lat && p.lng), [pins]);
  const currentMode = MODES.find(m => m.id === mode);

  const stats = useMemo(() => {
    const fiber = validPins.filter(p => p.fiber_status === 'available').length;
    const opp = validPins.filter(p => p.fiber_status === 'available' && p.status !== 'sale' && p.status !== 'installed' && p.status !== 'already_customer').length;
    const cust = validPins.filter(p => p.status === 'sale' || p.status === 'installed' || p.status === 'already_customer').length;
    return { fiber, opp, cust, total: validPins.length };
  }, [validPins]);

  return (
    <div className="space-y-3">
      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold border transition-all text-left ${mode === m.id ? 'border-transparent text-white' : 'border-border bg-muted text-muted-foreground hover:bg-muted/70'}`}
            style={mode === m.id ? { background: m.color } : {}}
          >
            <m.icon className="h-3.5 w-3.5 shrink-0" />
            <span>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Legend / description */}
      <div className="flex items-start gap-2 rounded-lg px-3 py-2 text-xs" style={{ background: currentMode.color + '18', color: currentMode.color }}>
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>{currentMode.desc}. Darker cells = higher concentration.</span>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 340 }}>
        {validPins.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm" style={{ color: '#6b7280' }}>No pins with location data yet.</div>
        ) : (
          <MapContainer center={[39.8283, -98.5795]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
            <AutoFit pins={validPins} />
            <DensityLayer pins={validPins} mode={mode} />
          </MapContainer>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-4 gap-1.5">
        {[
          { label: 'Total', value: stats.total, color: '#7c3aed' },
          { label: 'Fiber', value: stats.fiber, color: '#16a34a' },
          { label: 'Opportunity', value: stats.opp, color: '#f59e0b' },
          { label: 'Customers', value: stats.cust, color: '#2563eb' },
        ].map(s => (
          <div key={s.label} className="rounded-lg p-2 text-center border border-border bg-card">
            <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs" style={{ color: '#6b7280' }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}