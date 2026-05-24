import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polygon, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Locate, Layers, SatelliteDish, Map, Filter, MapPin, PenLine, ScanLine } from 'lucide-react';
import { PIN_STATUSES } from '@/components/maps/PinStatusBadge';
import RepTracker from '@/components/maps/RepTracker';
import LiveRepDots from '@/components/maps/LiveRepDots';
import OfflineBanner from '@/components/maps/OfflineBanner';
import { cachePins, getPinCache } from '@/lib/offlinePins';
import { initOfflineSync, syncOfflineQueue } from '@/lib/offlineSync';
import * as XLSX from 'xlsx';
import MapPinDrawer from '@/components/maps/MapPinDrawer';
import TerritoryDrawer from '@/components/maps/TerritoryDrawer';
import ClusteredPins from '@/components/maps/ClusteredPins';
import MapSearchBar from '@/components/maps/MapSearchBar';
import LeadScanner from '@/components/maps/LeadScanner';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function createPinIcon(color, isNew = false) {
  const size = isNew ? 38 : 34;
  const pulse = isNew ? `<div style="position:absolute;inset:-6px;border-radius:50%;border:3px solid ${color};opacity:0.5;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>` : '';
  return L.divIcon({
    className: '',
    html: `
      <style>@keyframes ping{75%,100%{transform:scale(1.5);opacity:0}}</style>
      <div style="position:relative;width:${size}px;height:${size + 10}px">
        ${pulse}
        <svg viewBox="0 0 24 32" width="${size}" height="${size + 10}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 8 12 20 12 20S24 20 24 12C24 5.37 18.63 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
          <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
        </svg>
      </div>`,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -(size + 10)],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 5px rgba(59,130,246,0.3)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function ClickHandler({ onMapClick, onTerritoryClick, addingPin, drawingTerritory, drawerOpen }) {
  useMapEvents({
    click: (e) => {
      if (addingPin && !drawerOpen) onMapClick(e.latlng);
      if (drawingTerritory && !drawerOpen) onTerritoryClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

function FlyToLocation({ location }) {
  const map = useMap();
  useEffect(() => {
    if (location && typeof location.lat === 'number' && typeof location.lng === 'number' && !isNaN(location.lat) && !isNaN(location.lng)) {
      map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 17), { animate: true, duration: 1 });
    }
  }, [location, map]);
  return null;
}

export default function Maps() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  // Initialize offline sync on mount
  useEffect(() => {
    initOfflineSync();
    
    // Listen for online event and auto-sync
    const handleOnline = async () => {
      const result = await syncOfflineQueue({
        create: (pin) => base44.entities.MapPin.create(pin),
        update: ({ id, data }) => base44.entities.MapPin.update(id, data),
      });
      if (result.synced > 0) {
        queryClient.invalidateQueries({ queryKey: ['pins'] });
      }
    };
    
    window.addEventListener('app:online', handleOnline);
    return () => window.removeEventListener('app:online', handleOnline);
  }, [queryClient]);
  
  const { data: pins = [] } = useQuery({
    queryKey: ['pins'],
    queryFn: async () => {
      try {
        const data = await base44.entities.MapPin.list('-created_date', 1000);
        // Cache pins when successfully fetched
        cachePins(data);
        return data;
      } catch {
        // If offline or fetch fails, use cached pins
        return getPinCache();
      }
    },
  });
  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list('-created_date', 200),
  });
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });
  const [userLocation, setUserLocation] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [selectedPin, setSelectedPin] = useState(null); // existing pin
  const [newPin, setNewPin] = useState(null);            // unsaved pin
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRep, setFilterRep] = useState('all');
  const [showTerritories, setShowTerritories] = useState(true);
  const [satellite, setSatellite] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [addingPin, setAddingPin] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [drawingTerritory, setDrawingTerritory] = useState(false);
  const [draftTerritoryPoints, setDraftTerritoryPoints] = useState([]);
  const fileInputRef = useRef();

  const drawerPin = selectedPin || newPin;
  const drawerOpen = !!drawerPin;

  useEffect(() => {
    if (!navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

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

  const createPin = useMutation({ mutationFn: (d) => base44.entities.MapPin.create(d) });
  const updatePin = useMutation({ mutationFn: ({ id, data }) => base44.entities.MapPin.update(id, data) });
  const deletePin = useMutation({ mutationFn: (id) => base44.entities.MapPin.delete(id) });
  const createTerritory = useMutation({
    mutationFn: (data) => base44.entities.Territory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      setDraftTerritoryPoints([]);
      setDrawingTerritory(false);
    },
  });

  const logActivity = (action, detail, meta = {}) => {
    base44.entities.ActivityLog.create({
      rep_email: user?.email,
      rep_name: user?.full_name || user?.email,
      action, detail, meta,
    }).catch(() => {});
  };

  const handleMapClick = useCallback(async (latlng) => {
    setSelectedPin(null);
    setAddingPin(false);
    // Optimistically open drawer with coords while we reverse-geocode
    setNewPin({ lat: latlng.lat, lng: latlng.lng, status: 'knocked', notes: '', address: '' });
    // Reverse geocode using Google Maps API
    try {
      const res = await base44.functions.invoke('reverseGeocode', { lat: latlng.lat, lng: latlng.lng });
      if (res.data?.address) {
        setNewPin(prev => prev ? { ...prev, address: res.data.address } : prev);
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
    }
  }, []);

  const handleTerritoryClick = useCallback((point) => {
    setDraftTerritoryPoints(prev => [...prev, point]);
  }, []);

  const handleSave = (pinData) => {
    if (pinData.id) {
      // update existing pin
      updatePin.mutate({ id: pinData.id, data: pinData }, {
        onSuccess: () => {
          logActivity('pin_updated', `Updated ${pinData.address || 'pin'} → ${pinData.status}`, { status: pinData.status });
          setSelectedPin(null);
        }
      });
    } else {
      // new pin
      const fullPin = { ...pinData, rep_email: user?.email, rep_name: user?.full_name || user?.email, source: 'manual' };
      createPin.mutate(fullPin, {
        onSuccess: () => {
          logActivity('pin_created', `Dropped pin at ${pinData.address || `${pinData.lat?.toFixed(4)}, ${pinData.lng?.toFixed(4)}`}`, { status: pinData.status });
          setNewPin(null);
        }
      });
    }
  };

  const handleDelete = (id) => {
    deletePin.mutate(id);
    setSelectedPin(null);
    setNewPin(null);
  };

  const handleOfflineSync = async () => {
    const result = await syncOfflineQueue({
      create: (pin) => base44.entities.MapPin.create(pin),
      update: ({ id, data }) => base44.entities.MapPin.update(id, data),
    });
    if (result.synced > 0) {
      queryClient.invalidateQueries({ queryKey: ['pins'] });
    }
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
        const address = row['address'] || row['Address'] || '';
        const rawStatus = (row['status'] || row['Status'] || 'knocked').toLowerCase().replace(/\s+/g, '_');
        const lat = parseFloat(row['lat'] || row['latitude'] || row['Lat'] || '');
        const lng = parseFloat(row['lng'] || row['longitude'] || row['Lng'] || '');
        const validStatus = PIN_STATUSES.find(s => s.value === rawStatus)?.value || 'knocked';
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
  const defaultZoom = userLocation ? 16 : 5;

  const tileUrl = satellite
    ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const statusCounts = useMemo(() => {
    const counts = {};
    visiblePins.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [visiblePins]);

  return (
    <div className="relative" style={{ height: 'calc(100vh - 64px)', overflow: 'hidden', cursor: addingPin ? 'crosshair' : 'default' }}>
      {/* Silent background components */}
      <RepTracker user={user} />

      {/* Full-screen map */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
      >
        <TileLayer url={tileUrl} attribution="" />
        <ClickHandler onMapClick={handleMapClick} onTerritoryClick={handleTerritoryClick} addingPin={addingPin} drawingTerritory={drawingTerritory} drawerOpen={drawerOpen} />
        {flyTo && <FlyToLocation location={flyTo} />}

        {/* Territory overlays */}
        {showTerritories && territories.filter(t => t.status === 'active' && t.coordinates?.length > 2).map(t => (
          <Polygon
            key={t.id}
            positions={t.coordinates.map(c => [c.lat, c.lng])}
            pathOptions={{ color: t.color || '#3b82f6', fillColor: t.color || '#3b82f6', fillOpacity: 0.12, weight: 2.5 }}
          />
        ))}

        {/* Live rep dots (admin) */}
        {isAdmin && <LiveRepDots currentUserEmail={user?.email} />}

        {/* User location */}
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={userLocationIcon()} />
        )}

        {/* Clustered pins */}
        <ClusteredPins
          pins={visiblePins}
          onPinClick={(pin) => { setNewPin(null); setSelectedPin(pin); }}
        />

        {/* New unsaved pin */}
        {newPin && (
          <Marker position={[newPin.lat, newPin.lng]} icon={createPinIcon('#94a3b8', true)} />
        )}

        {/* Draft territory polygon */}
        {draftTerritoryPoints.length >= 2 && (
          <Polygon
            positions={draftTerritoryPoints.map(p => [p.lat, p.lng])}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.15, weight: 2, dashArray: '6 4' }}
          />
        )}

        {/* Draft territory markers */}
        {draftTerritoryPoints.map((p, i) => (
          <Marker
            key={i}
            position={[p.lat, p.lng]}
            icon={L.divIcon({
              className: '',
              html: `<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #3b82f6;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
              iconSize: [10, 10],
              iconAnchor: [5, 5],
            })}
          />
        ))}
      </MapContainer>

      {/* Top bar overlay */}
      <div className="absolute top-3 left-3 right-3 z-[1000] flex flex-col gap-2">
        {/* Search + filter row */}
        <div className="flex items-center gap-2">
          <MapSearchBar onSelectLocation={(loc) => setFlyTo({ ...loc, _t: Date.now() })} />
          {isAdmin && (
            <button
              onClick={() => setShowFilters(v => !v)}
              className="bg-black/60 backdrop-blur-sm text-white rounded-xl p-2.5 hover:bg-black/70 transition-colors shrink-0"
            >
              <Filter className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Status summary pills */}
        <div className="flex-1 bg-black/60 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          <span className="text-white/70 text-xs font-medium shrink-0">
            {visiblePins.length} pins
          </span>
          {PIN_STATUSES.filter(s => statusCounts[s.value]).map(s => (
            <button
              key={s.value}
              onClick={() => setFilterStatus(filterStatus === s.value ? 'all' : s.value)}
              className={`shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-all ${filterStatus === s.value ? 'ring-2 ring-white' : 'opacity-80'}`}
              style={{ background: s.color + 'cc', color: 'white' }}
            >
              <span>{statusCounts[s.value]}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Admin rep filter dropdown */}
      {showFilters && isAdmin && (
        <div className="absolute top-28 right-3 z-[1000] bg-card border border-border rounded-xl shadow-2xl p-3 w-56">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Filter by Rep</p>
          <Select value={filterRep} onValueChange={v => { setFilterRep(v); setShowFilters(false); }}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reps</SelectItem>
              {repEmails.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Add Pin / Draw Territory buttons */}
      {!drawerOpen && (
        <div className="absolute bottom-8 right-16 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => { setAddingPin(v => !v); setSelectedPin(null); setNewPin(null); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-full font-semibold text-xs shadow-xl transition-all ${
              addingPin
                ? 'bg-destructive text-white ring-4 ring-destructive/30'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            <MapPin className="h-3.5 w-3.5" />
            {addingPin ? 'Tap map to place pin — cancel' : '+ Add Pin'}
          </button>
          {isAdmin && (
            <button
              onClick={() => { setDrawingTerritory(v => !v); setDraftTerritoryPoints([]); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-full font-semibold text-xs shadow-xl transition-all ${
                drawingTerritory
                  ? 'bg-destructive text-white ring-4 ring-destructive/30'
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              <PenLine className="h-3.5 w-3.5" />
              {drawingTerritory ? `${draftTerritoryPoints.length} points — cancel` : '+ Draw Territory'}
            </button>
          )}
        </div>
      )}

      {/* Right side floating buttons */}
      <div className="absolute right-3 bottom-8 z-[1000] flex flex-col gap-2">
        {/* Locate me */}
        <button
          onClick={() => userLocation && setFlyTo({ ...userLocation, _t: Date.now() })}
          disabled={!userLocation}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 transition-colors"
          title="My Location"
        >
          <Locate className="h-5 w-5 text-gray-700" />
        </button>

        {/* Satellite toggle */}
        <button
          onClick={() => setSatellite(v => !v)}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${satellite ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          title="Toggle satellite"
        >
          {satellite ? <Map className="h-5 w-5" /> : <SatelliteDish className="h-5 w-5" />}
        </button>

        {/* Territories toggle */}
        <button
          onClick={() => setShowTerritories(v => !v)}
          className={`w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors ${showTerritories ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
          title="Toggle territories"
        >
          <Layers className="h-5 w-5" />
        </button>

        {/* Lead Scanner */}
        <button
          onClick={() => setShowScanner(true)}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Lead Scanner"
        >
          <ScanLine className="h-5 w-5 text-gray-700" />
        </button>

        {/* Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50"
          title="Upload Excel"
        >
          <Upload className="h-5 w-5 text-gray-700" />
        </button>
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelUpload} />
      </div>

      {/* Offline banner */}
      <div className="absolute top-28 left-3 right-3 z-[1000]">
        <OfflineBanner onSync={handleOfflineSync} />
      </div>

      {/* Bottom slide-up drawer for pin details */}
      <MapPinDrawer
        pin={drawerPin}
        isNew={!!newPin && !selectedPin}
        onSave={handleSave}
        onDelete={handleDelete}
        onClose={() => { setSelectedPin(null); setNewPin(null); setAddingPin(false); }}
      />

      {/* Lead Scanner Modal */}
      {showScanner && (
        <LeadScanner
          user={user}
          onPinsCreated={(count) => {
            queryClient.invalidateQueries({ queryKey: ['pins'] });
            setShowScanner(false);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Territory drawing drawer */}
      <TerritoryDrawer
        draftPoints={draftTerritoryPoints}
        users={allUsers}
        isLoading={createTerritory.isPending}
        onSave={(data) => {
          createTerritory.mutate(data);
        }}
        onCancel={() => {
          setDrawingTerritory(false);
          setDraftTerritoryPoints([]);
        }}
      />
    </div>
  );
}