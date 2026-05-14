import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Locate, MapPin, Eye, EyeOff, Layers } from 'lucide-react';
import { PIN_STATUSES, getStatus } from '@/components/maps/PinStatusBadge';
import PinPopup from '@/components/maps/PinPopup';
import MapKPIs from '@/components/maps/MapKPIs';
import * as XLSX from 'xlsx';

// Fix default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createColorIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,0.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

function ClickHandler({ onMapClick }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng) });
  return null;
}

// Internal component that can call useMap()
function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location) {
      map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 16), { animate: true, duration: 1.2 });
    }
  }, [location, map]);
  return null;
}

export default function Maps() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: pins = [], isLoading: pinsLoading } = useQuery({
    queryKey: ['pins'],
    queryFn: () => base44.entities.MapPin.list('-created_date', 1000),
  });
  const { data: sales = [] } = useQuery({
    queryKey: ['sales'],
    queryFn: () => base44.entities.Sale.list('-created_date', 500),
  });
  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list('-created_date', 200),
  });
  const [showTerritories, setShowTerritories] = useState(true);

  const isAdmin = user?.role === 'admin';

  const [userLocation, setUserLocation] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [newPin, setNewPin] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRep, setFilterRep] = useState('all');
  const [showLegend, setShowLegend] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef();

  // Live location tracking
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Real-time pin subscriptions
  useEffect(() => {
    const unsub = base44.entities.MapPin.subscribe((event) => {
      queryClient.setQueryData(['pins'], (old = []) => {
        if (event.type === 'create') return [event.data, ...old];
        if (event.type === 'update') return old.map(p => p.id === event.id ? event.data : p);
        if (event.type === 'delete') return old.filter(p => p.id !== event.id);
        return old;
      });
    });
    return unsub;
  }, [queryClient]);

  const createPin = useMutation({
    mutationFn: (data) => base44.entities.MapPin.create(data),
    onSuccess: () => setNewPin(null),
  });

  const updatePin = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MapPin.update(id, data),
  });

  const deletePin = useMutation({
    mutationFn: (id) => base44.entities.MapPin.delete(id),
  });

  const handleMapClick = useCallback((latlng) => {
    setNewPin({ lat: latlng.lat, lng: latlng.lng, status: 'lead', notes: '', address: '' });
  }, []);

  const handleSaveNewPin = (pinData) => {
    createPin.mutate({
      ...pinData,
      rep_email: user?.email,
      rep_name: user?.full_name || user?.email,
      source: 'manual',
    });
  };

  const handleUpdatePin = (pinData) => {
    updatePin.mutate({
      id: pinData.id,
      data: {
        status: pinData.status,
        notes: pinData.notes,
        customer_name: pinData.customer_name,
        phone: pinData.phone,
        email: pinData.email,
        fiber_status: pinData.fiber_status,
        follow_up_date: pinData.follow_up_date,
      }
    });
  };

  const handleExcelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);

      const toCreate = [];
      for (const row of rows) {
        const address = row['address'] || row['Address'] || row['ADDRESS'] || '';
        const rawStatus = (row['status'] || row['Status'] || row['STATUS'] || 'lead').toLowerCase().replace(/\s+/g, '_');
        const lat = parseFloat(row['lat'] || row['latitude'] || row['Lat'] || '');
        const lng = parseFloat(row['lng'] || row['longitude'] || row['Lng'] || '');
        const validStatus = PIN_STATUSES.find(s => s.value === rawStatus)?.value || 'lead';

        if (!isNaN(lat) && !isNaN(lng)) {
          toCreate.push({ address, lat, lng, status: validStatus, rep_email: user?.email, rep_name: user?.full_name || user?.email, source: 'upload' });
        }
      }

      if (toCreate.length > 0) {
        await base44.entities.MapPin.bulkCreate(toCreate);
        queryClient.invalidateQueries({ queryKey: ['pins'] });
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const repEmails = useMemo(() => [...new Set(pins.map(p => p.rep_email).filter(Boolean))], [pins]);

  const visiblePins = useMemo(() => pins.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false;
    if (!isAdmin) return p.rep_email === user?.email;
    if (filterRep !== 'all' && p.rep_email !== filterRep) return false;
    return true;
  }), [pins, filterStatus, filterRep, isAdmin, user]);

  const defaultCenter = userLocation ? [userLocation.lat, userLocation.lng] : [39.8283, -98.5795];
  const defaultZoom = userLocation ? 15 : 5;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" /> D2D Map
          </h1>
          <p className="text-muted-foreground text-sm">Click the map to drop a pin. Live tracking enabled.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => userLocation && setFlyTo({ ...userLocation, _t: Date.now() })}
            disabled={!userLocation}
          >
            <Locate className="h-4 w-4 mr-1" />
            {userLocation ? 'My Location' : 'Locating...'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-1" /> {uploading ? 'Uploading...' : 'Upload Excel'}
          </Button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
          <Button variant={showTerritories ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowTerritories(v => !v)} title="Toggle territories">
            <Layers className="h-4 w-4 mr-1" /> Territories
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowLegend(v => !v)}>
            {showLegend ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <MapKPIs pins={pins} sales={sales} userEmail={user?.email} />

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {PIN_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filterRep} onValueChange={setFilterRep}>
            <SelectTrigger className="w-44 h-8 text-sm"><SelectValue placeholder="All Reps" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reps</SelectItem>
              {repEmails.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <span className="text-xs text-muted-foreground self-center">
          {visiblePins.length} pin{visiblePins.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Map */}
      <Card className="overflow-hidden p-0">
        <div style={{ height: 'calc(100vh - 340px)', minHeight: '420px', width: '100%', position: 'relative' }}>
          <MapContainer
            center={defaultCenter}
            zoom={defaultZoom}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            <ClickHandler onMapClick={handleMapClick} />
            {flyTo && <FlyToLocation location={flyTo} />}

            {/* Territory overlays */}
            {showTerritories && territories.filter(t => t.status === 'active' && t.coordinates?.length > 2).map(t => (
              <Polygon
                key={t.id}
                positions={t.coordinates.map(c => [c.lat, c.lng])}
                pathOptions={{ color: t.color || '#3b82f6', fillColor: t.color || '#3b82f6', fillOpacity: 0.1, weight: 2 }}
              >
                <Popup>
                  <div className="text-sm space-y-0.5">
                    <p className="font-semibold">{t.name}</p>
                    {t.assigned_rep_name && <p className="text-xs text-muted-foreground">Rep: {t.assigned_rep_name}</p>}
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Live user location */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()}>
                <Popup><p className="text-xs font-semibold text-blue-500">📍 You are here</p></Popup>
              </Marker>
            )}

            {/* Saved pins */}
            {visiblePins.map(pin => {
              const s = getStatus(pin.status);
              return (
                <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={createColorIcon(s.color)}>
                  <Popup>
                    <PinPopup
                      pin={pin}
                      onSave={handleUpdatePin}
                      onDelete={(id) => deletePin.mutate(id)}
                      onClose={() => {}}
                    />
                  </Popup>
                </Marker>
              );
            })}

            {/* New unsaved pin */}
            {newPin && (
              <Marker position={[newPin.lat, newPin.lng]} icon={createColorIcon('#94a3b8')}>
                <Popup>
                  <PinPopup
                    pin={newPin}
                    onSave={handleSaveNewPin}
                    onDelete={() => setNewPin(null)}
                    onClose={() => setNewPin(null)}
                  />
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Legend */}
          {showLegend && (
            <div className="absolute bottom-4 right-4 z-[1000] bg-card border border-border rounded-lg p-3 shadow-lg space-y-1.5">
              <div className="flex items-center gap-2 text-xs mb-1">
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6', border: '3px solid white', boxShadow: '0 0 0 3px rgba(59,130,246,0.35)', flexShrink: 0 }} />
                <span className="text-blue-400 font-medium">You</span>
              </div>
              {PIN_STATUSES.map(s => (
                <div key={s.value} className="flex items-center gap-2 text-xs">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
                  <span className="text-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Excel upload requires columns: <strong>lat</strong>, <strong>lng</strong>, <strong>address</strong> (optional), <strong>status</strong> (optional)
      </p>
    </div>
  );
}