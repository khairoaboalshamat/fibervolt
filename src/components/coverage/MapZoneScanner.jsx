import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents, Marker, Popup } from 'react-leaflet';
import { Button } from '@/components/ui/button';
import { Loader2, Map } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png', iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png' });

const FIBER_COLORS = {
  available: '#22c55e', not_available: '#ef4444', under_construction: '#eab308',
  planned: '#3b82f6', unknown: '#9ca3af',
};

function createPinIcon(pin) {
  const color = FIBER_COLORS[pin.fiber_status] || FIBER_COLORS.unknown;
  const isCustomer = pin.status === 'sale' || pin.status === 'installed' || pin.status === 'already_customer';
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid ${isCustomer ? '#1d4ed8' : 'white'};box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function BoundsSelector({ onBoundsChange }) {
  const [start, setStart] = React.useState(null);
  const [end, setEnd] = React.useState(null);

  useMapEvents({
    mousedown(e) { setStart(e.latlng); setEnd(null); },
    mousemove(e) { if (start) setEnd(e.latlng); },
    mouseup(e) {
      if (start) {
        const bounds = L.latLngBounds(start, e.latlng);
        onBoundsChange(bounds);
        setStart(null);
        setEnd(null);
      }
    },
  });

  if (!start || !end) return null;
  return <Rectangle bounds={L.latLngBounds(start, end)} pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.1 }} />;
}

export default function MapZoneScanner({ pins, clients, clientMap }) {
  const [selectedBounds, setSelectedBounds] = React.useState(null);
  const [drawing, setDrawing] = React.useState(false);

  const pinsInZone = useMemo(() => {
    if (!selectedBounds) return [];
    return pins.filter(p => p.lat && p.lng && selectedBounds.contains([p.lat, p.lng]));
  }, [pins, selectedBounds]);

  const stats = useMemo(() => {
    const fiberAvail = pinsInZone.filter(p => p.fiber_status === 'available').length;
    const hasService = pinsInZone.filter(p => p.status === 'sale' || p.status === 'installed' || p.status === 'already_customer' || !!clientMap[(p.address || '').toLowerCase().trim()]).length;
    const opportunity = pinsInZone.filter(p => p.fiber_status === 'available' && p.status !== 'sale' && p.status !== 'installed' && p.status !== 'already_customer' && !clientMap[(p.address || '').toLowerCase().trim()]).length;
    return { fiberAvail, hasService, opportunity };
  }, [pinsInZone, clientMap]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Click and drag on the map to select a zone. All pins inside will be analyzed.</p>

      <div className="flex items-center gap-2">
        <Button
          variant={drawing ? 'destructive' : 'default'}
          size="sm"
          onClick={() => { setDrawing(v => !v); if (drawing) setSelectedBounds(null); }}
        >
          {drawing ? 'Cancel Selection' : 'Draw Zone'}
        </Button>
        {selectedBounds && !drawing && (
          <span className="text-sm text-muted-foreground">{pinsInZone.length} pins in selected zone</span>
        )}
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 300 }}>
        <MapContainer
          center={[32.7767, -96.7970]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
          dragging={!drawing}
          scrollWheelZoom={!drawing}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {drawing && <BoundsSelector onBoundsChange={(b) => { setSelectedBounds(b); setDrawing(false); }} />}
          {selectedBounds && <Rectangle bounds={selectedBounds} pathOptions={{ color: '#3b82f6', weight: 2, fillOpacity: 0.1 }} />}
          {pins.filter(p => p.lat && p.lng).map(pin => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={createPinIcon(pin)}>
              <Popup>
                <div className="text-xs space-y-1 min-w-[140px]">
                  <p className="font-semibold">{pin.address || 'No address'}</p>
                  <p>Fiber: {pin.fiber_status || 'unknown'}</p>
                  <p>Status: {pin.status}</p>
                  {pin.customer_name && <p>Customer: {pin.customer_name}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {selectedBounds && pinsInZone.length > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Fiber Available', val: stats.fiberAvail, color: 'text-green-700 bg-green-50 border-green-200' },
              { label: 'Has Service', val: stats.hasService, color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Opportunity', val: stats.opportunity, color: 'text-orange-700 bg-orange-50 border-orange-200' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border p-2 text-center ${s.color}`}>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {pinsInZone.map(pin => {
              const isCustomer = pin.status === 'sale' || pin.status === 'installed' || pin.status === 'already_customer' || !!clientMap[(pin.address || '').toLowerCase().trim()];
              const fiberColor = FIBER_COLORS[pin.fiber_status] || FIBER_COLORS.unknown;
              return (
                <div key={pin.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: fiberColor }} />
                    <span className="truncate">{pin.address || `${pin.lat?.toFixed(4)}, ${pin.lng?.toFixed(4)}`}</span>
                  </div>
                  <span className={`text-xs font-semibold shrink-0 ${isCustomer ? 'text-green-700' : 'text-gray-500'}`}>
                    {isCustomer ? '✅ Service' : '❌ No Service'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedBounds && pinsInZone.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">No pins found in selected zone. Add pins on the map first.</p>
      )}
    </div>
  );
}