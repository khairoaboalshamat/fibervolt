import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { MapContainer, TileLayer, Polygon, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PenLine, Trash2, Loader2, Wifi, WifiOff, MapPin, CheckCircle2, X, Play } from 'lucide-react';

function DrawingLayer({ drawing, onPointAdd }) {
  useMapEvents({
    click(e) {
      if (drawing) onPointAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

function dotIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [10, 10], iconAnchor: [5, 5],
  });
}

function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<svg viewBox="0 0 24 32" width="22" height="30" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.37 0 0 5.37 0 12c0 8 12 20 12 20S24 20 24 12C24 5.37 18.63 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/><circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/></svg>`,
    iconSize: [22, 30], iconAnchor: [11, 30],
  });
}

const STATUS_COLORS = { available: '#16a34a', not_available: '#dc2626', unknown: '#94a3b8' };

export default function ZoneScanTool({ user, onPinsCreated }) {
  const [drawing, setDrawing] = useState(false);
  const [points, setPoints] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [phase, setPhase] = useState(''); // 'discovering' | 'checking' | 'saving'
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const addPoint = (pt) => setPoints(prev => [...prev, pt]);
  const clearAll = () => { setPoints([]); setResults([]); setError(''); setDrawing(false); };

  const startScan = async () => {
    if (points.length < 3) { setError('Draw at least 3 points to form a zone.'); return; }
    setScanning(true);
    setResults([]);
    setError('');

    try {
      // Step 1: Discover addresses
      setPhase('discovering');
      const discoverRes = await base44.functions.invoke('discoverAddressesInZone', { polygon: points });
      const addresses = discoverRes.data?.addresses || [];

      if (addresses.length === 0) {
        setError('No addresses found in this zone. Try drawing a larger area.');
        setScanning(false);
        return;
      }

      setProgress({ current: 0, total: addresses.length });

      // Step 2: FCC check each address
      setPhase('checking');
      const checked = [];
      for (let i = 0; i < addresses.length; i++) {
        const { address, lat, lng } = addresses[i];
        let fiber_status = 'unknown';
        let fcc_data = null;
        try {
          const fccRes = await base44.functions.invoke('fccCoverageCheck', { lat, lng });
          fiber_status = fccRes.data?.fiber_status || 'unknown';
          fcc_data = fccRes.data;
        } catch {}
        checked.push({ address, lat, lng, fiber_status, fcc_data });
        setProgress({ current: i + 1, total: addresses.length });
      }

      setResults(checked);

      // Step 3: Bulk-create pins
      setPhase('saving');
      const toCreate = checked.map(c => ({
        address: c.address,
        lat: c.lat,
        lng: c.lng,
        status: 'lead',
        fiber_status: c.fiber_status,
        rep_email: user?.email,
        rep_name: user?.full_name || user?.email,
        source: 'manual',
      }));

      await base44.entities.MapPin.bulkCreate(toCreate);
      onPinsCreated(toCreate.length);
    } catch (err) {
      setError(err.message || 'Scan failed.');
    } finally {
      setScanning(false);
      setPhase('');
    }
  };

  const fiberCount = results.filter(r => r.fiber_status === 'available').length;
  const noFiberCount = results.filter(r => r.fiber_status === 'not_available').length;

  const phaseLabel = {
    discovering: 'Finding addresses in zone…',
    checking: `Checking FCC coverage… (${progress.current}/${progress.total})`,
    saving: 'Saving pins…',
  }[phase] || '';

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium" style={{ color: '#111827' }}>Draw a Zone to Scan</p>
          <p className="text-xs" style={{ color: '#6b7280' }}>Click the map to place polygon points, then run the scan</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={drawing ? 'destructive' : 'outline'} onClick={() => setDrawing(v => !v)} className="gap-1.5">
            <PenLine className="h-3.5 w-3.5" />
            {drawing ? 'Stop Drawing' : 'Draw Zone'}
          </Button>
          {points.length > 0 && !scanning && (
            <Button size="sm" variant="ghost" onClick={clearAll}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 300, cursor: drawing ? 'crosshair' : 'default' }}>
        <MapContainer center={[39.8283, -98.5795]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
          <DrawingLayer drawing={drawing} onPointAdd={addPoint} />
          {points.length >= 3 && (
            <Polygon
              positions={points.map(p => [p.lat, p.lng])}
              pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 }}
            />
          )}
          {points.map((p, i) => (
            <Marker key={i} position={[p.lat, p.lng]} icon={dotIcon()} />
          ))}
          {results.map((r, i) => (
            <Marker key={`result-${i}`} position={[r.lat, r.lng]} icon={pinIcon(STATUS_COLORS[r.fiber_status] || '#94a3b8')} />
          ))}
        </MapContainer>
      </div>

      {/* Point count hint */}
      {drawing && (
        <p className="text-xs text-center" style={{ color: '#3b82f6' }}>
          {points.length} point{points.length !== 1 ? 's' : ''} placed — need at least 3 to scan
        </p>
      )}

      {/* Scan button */}
      {points.length >= 3 && !scanning && results.length === 0 && (
        <Button onClick={startScan} className="w-full gap-2">
          <Play className="h-4 w-4" /> Scan Zone with FCC Data
        </Button>
      )}

      {/* Progress */}
      {scanning && (
        <div className="flex items-center gap-3 bg-muted rounded-lg p-3">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: '#3b82f6' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: '#111827' }}>{phaseLabel}</p>
            {phase === 'checking' && (
              <div className="mt-1.5 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%`, background: '#3b82f6' }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm" style={{ color: '#dc2626' }}>
          <X className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results summary */}
      {results.length > 0 && !scanning && (
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg p-2.5 text-center border" style={{ background: '#f0fdf4', borderColor: '#86efac' }}>
              <Wifi className="h-4 w-4 mx-auto mb-0.5" style={{ color: '#16a34a' }} />
              <p className="text-lg font-bold" style={{ color: '#15803d' }}>{fiberCount}</p>
              <p className="text-xs" style={{ color: '#15803d' }}>Fiber Available</p>
            </div>
            <div className="rounded-lg p-2.5 text-center border" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
              <WifiOff className="h-4 w-4 mx-auto mb-0.5" style={{ color: '#dc2626' }} />
              <p className="text-lg font-bold" style={{ color: '#dc2626' }}>{noFiberCount}</p>
              <p className="text-xs" style={{ color: '#dc2626' }}>No Fiber</p>
            </div>
            <div className="rounded-lg p-2.5 text-center border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <MapPin className="h-4 w-4 mx-auto mb-0.5" style={{ color: '#475569' }} />
              <p className="text-lg font-bold" style={{ color: '#334155' }}>{results.length}</p>
              <p className="text-xs" style={{ color: '#64748b' }}>Pins Created</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm" style={{ color: '#15803d' }}>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            All pins saved to your Maps page with FCC fiber status!
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={clearAll}>Scan Another Zone</Button>
        </div>
      )}
    </div>
  );
}