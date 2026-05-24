import React, { useState, useMemo } from 'react';
import { MapContainer, TileLayer, Rectangle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Wifi, Users, MapPin } from 'lucide-react';
import AddressResultCard from './AddressResultCard.jsx';

function RectangleDrawer({ onBoundsChange }) {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [dragging, setDragging] = useState(false);

  useMapEvents({
    mousedown(e) { setStart(e.latlng); setEnd(null); setDragging(true); },
    mousemove(e) { if (dragging) setEnd(e.latlng); },
    mouseup(e) {
      if (dragging && start) {
        setEnd(e.latlng);
        setDragging(false);
        onBoundsChange([start, e.latlng]);
      }
    },
  });

  if (!start || !end) return null;
  return (
    <Rectangle
      bounds={[
        [Math.min(start.lat, end.lat), Math.min(start.lng, end.lng)],
        [Math.max(start.lat, end.lat), Math.max(start.lng, end.lng)],
      ]}
      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2 }}
    />
  );
}

export default function MapZoneScanner({ pins, clientMap }) {
  const [bounds, setBounds] = useState(null);

  const zoneResults = useMemo(() => {
    if (!bounds) return [];
    const minLat = Math.min(bounds[0].lat, bounds[1].lat);
    const maxLat = Math.max(bounds[0].lat, bounds[1].lat);
    const minLng = Math.min(bounds[0].lng, bounds[1].lng);
    const maxLng = Math.max(bounds[0].lng, bounds[1].lng);
    return pins
      .filter(p => p.lat >= minLat && p.lat <= maxLat && p.lng >= minLng && p.lng <= maxLng)
      .map(p => {
        const addrKey = (p.address || '').toLowerCase().trim();
        const client = clientMap[addrKey];
        return {
          address: p.address || `${p.lat?.toFixed(4)}, ${p.lng?.toFixed(4)}`,
          fiberStatus: p.fiber_status || 'unknown',
          isCustomer: !!client || p.status === 'sale' || p.status === 'installed' || p.status === 'already_customer',
          customerName: client?.name,
          repName: p.rep_name,
          status: p.status,
        };
      });
  }, [bounds, pins, clientMap]);

  const fiberCount = zoneResults.filter(r => r.fiberStatus === 'available').length;
  const customerCount = zoneResults.filter(r => r.isCustomer).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Click and drag on the map to select a zone and see all pins within it.</p>
      <div className="rounded-xl overflow-hidden border border-border" style={{ height: 280 }}>
        <MapContainer center={[39.8283, -98.5795]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="" />
          <RectangleDrawer onBoundsChange={setBounds} />
        </MapContainer>
      </div>
      {bounds && zoneResults.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No pins found in selected zone.</p>
      )}
      {zoneResults.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total', value: zoneResults.length, icon: MapPin, color: 'text-slate-500' },
              { label: 'Fiber', value: fiberCount, icon: Wifi, color: 'text-green-600' },
              { label: 'Customers', value: customerCount, icon: Users, color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-muted rounded-lg p-2 text-center">
                <s.icon className={`h-4 w-4 mx-auto mb-0.5 ${s.color}`} />
                <p className="text-lg font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {zoneResults.map((r, i) => <AddressResultCard key={i} {...r} />)}
          </div>
        </>
      )}
    </div>
  );
}