import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { PenLine, Trash2, Save, X, MapPin, Users, CheckSquare } from 'lucide-react';
import { toast } from 'sonner';

const TERRITORY_COLORS = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#06b6d4', '#a855f7'
];

function dotIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:10px;height:10px;border-radius:50%;background:#fff;border:2px solid #3b82f6;box-shadow:0 1px 4px rgba(0,0,0,0.5)"></div>`,
    iconSize: [10, 10],
    iconAnchor: [5, 5],
  });
}

// Handles click events while drawing
function DrawHandler({ drawing, onAddPoint }) {
  useMapEvents({
    click(e) {
      if (drawing) onAddPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
}

export default function Territories() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const isAdmin = user?.role === 'admin';

  const { data: territories = [] } = useQuery({
    queryKey: ['territories'],
    queryFn: () => base44.entities.Territory.list('-created_date', 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: isAdmin,
  });

  const { data: pins = [] } = useQuery({
    queryKey: ['pins'],
    queryFn: () => base44.entities.MapPin.list('-created_date', 2000),
  });

  const [drawing, setDrawing] = useState(false);
  const [draftPoints, setDraftPoints] = useState([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TERRITORY_COLORS[0]);
  const [newRep, setNewRep] = useState('');
  const [selectedTerritory, setSelectedTerritory] = useState(null);

  const createTerritory = useMutation({
    mutationFn: (data) => base44.entities.Territory.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      setDraftPoints([]);
      setDrawing(false);
      setSaveOpen(false);
      setNewName('');
      setNewColor(TERRITORY_COLORS[0]);
      setNewRep('');
      toast.success('Territory saved!');
    },
  });

  const updateTerritory = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Territory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      setSelectedTerritory(null);
      toast.success('Territory updated');
    },
  });

  const deleteTerritory = useMutation({
    mutationFn: (id) => base44.entities.Territory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['territories'] });
      setSelectedTerritory(null);
      toast.success('Territory deleted');
    },
  });

  const handleAddPoint = useCallback((point) => {
    setDraftPoints(prev => [...prev, point]);
  }, []);

  const handleUndo = () => setDraftPoints(prev => prev.slice(0, -1));

  const handleFinish = () => {
    if (draftPoints.length < 3) {
      toast.error('Draw at least 3 points to create a territory');
      return;
    }
    setSaveOpen(true);
  };

  const handleSave = () => {
    if (!newName.trim()) return;
    const rep = users.find(u => u.email === newRep);
    createTerritory.mutate({
      name: newName.trim(),
      color: newColor,
      coordinates: draftPoints,
      assigned_rep_email: newRep || null,
      assigned_rep_name: rep?.full_name || newRep || null,
      status: 'active',
    });
  };

  const handleCancelDraw = () => {
    setDrawing(false);
    setDraftPoints([]);
  };

  // Count pins inside a territory polygon (point-in-polygon)
  const getPinCount = (territory) => {
    if (!territory.coordinates?.length) return 0;
    return pins.filter(pin => isPointInPolygon({ lat: pin.lat, lng: pin.lng }, territory.coordinates)).length;
  };

  const reps = users.filter(u => u.role !== 'admin');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <PenLine className="h-6 w-6 text-primary" /> Territories
          </h1>
          <p className="text-muted-foreground text-sm">
            {drawing
              ? `Drawing… ${draftPoints.length} point${draftPoints.length !== 1 ? 's' : ''} — click map to add, finish when done`
              : 'Draw and assign territories to reps'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            {!drawing ? (
              <Button onClick={() => { setDrawing(true); setDraftPoints([]); }}>
                <PenLine className="h-4 w-4 mr-2" /> Draw Territory
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleUndo} disabled={draftPoints.length === 0}>
                  <X className="h-4 w-4 mr-1" /> Undo
                </Button>
                <Button onClick={handleFinish} disabled={draftPoints.length < 3}>
                  <Save className="h-4 w-4 mr-1" /> Finish & Save
                </Button>
                <Button variant="ghost" onClick={handleCancelDraw}>Cancel</Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar: territory list */}
        <div className="lg:col-span-1 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            {territories.length} Territor{territories.length !== 1 ? 'ies' : 'y'}
          </p>
          {territories.length === 0 && (
            <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No territories yet</CardContent></Card>
          )}
          {territories.map(t => (
            <Card
              key={t.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedTerritory?.id === t.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedTerritory(selectedTerritory?.id === t.id ? null : t)}
            >
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: t.color || '#3b82f6' }} />
                  <p className="font-medium text-sm truncate flex-1">{t.name}</p>
                  <Badge variant="outline" className="text-xs">{getPinCount(t)} pins</Badge>
                </div>
                {t.assigned_rep_name && (
                  <p className="text-xs text-muted-foreground mt-1 ml-5 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {t.assigned_rep_name}
                  </p>
                )}
                {selectedTerritory?.id === t.id && isAdmin && (
                  <div className="mt-3 space-y-2">
                    <Select
                      value={t.assigned_rep_email || ''}
                      onValueChange={(email) => {
                        const rep = users.find(u => u.email === email);
                        updateTerritory.mutate({ id: t.id, data: { assigned_rep_email: email, assigned_rep_name: rep?.full_name || email } });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Assign rep" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Unassigned</SelectItem>
                        {reps.map(r => <SelectItem key={r.email} value={r.email}>{r.full_name || r.email}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm" variant="destructive" className="w-full h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); deleteTerritory.mutate(t.id); }}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete Territory
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Map */}
        <Card className="lg:col-span-3 overflow-hidden p-0">
          <div style={{ height: 'calc(100vh - 220px)', minHeight: 460, position: 'relative' }}>
            <MapContainer
              center={[39.8283, -98.5795]}
              zoom={5}
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              cursor={drawing ? 'crosshair' : ''}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <DrawHandler drawing={drawing} onAddPoint={handleAddPoint} />

              {/* Saved territories */}
              {territories.map(t => (
                <Polygon
                  key={t.id}
                  positions={t.coordinates.map(c => [c.lat, c.lng])}
                  pathOptions={{
                    color: t.color || '#3b82f6',
                    fillColor: t.color || '#3b82f6',
                    fillOpacity: selectedTerritory?.id === t.id ? 0.25 : 0.12,
                    weight: selectedTerritory?.id === t.id ? 3 : 1.5,
                    dashArray: t.status === 'inactive' ? '6 4' : null,
                  }}
                  eventHandlers={{ click: () => setSelectedTerritory(selectedTerritory?.id === t.id ? null : t) }}
                >
                  <Popup>
                    <div className="space-y-1 p-1">
                      <p className="font-semibold text-sm">{t.name}</p>
                      {t.assigned_rep_name && <p className="text-xs text-muted-foreground">Rep: {t.assigned_rep_name}</p>}
                      <p className="text-xs text-muted-foreground">{getPinCount(t)} pins in territory</p>
                    </div>
                  </Popup>
                </Polygon>
              ))}

              {/* Draft polygon while drawing */}
              {draftPoints.length >= 2 && (
                <Polygon
                  positions={draftPoints.map(p => [p.lat, p.lng])}
                  pathOptions={{ color: newColor, fillColor: newColor, fillOpacity: 0.15, weight: 2, dashArray: '6 4' }}
                />
              )}

              {/* Draft vertex markers */}
              {draftPoints.map((p, i) => (
                <Marker key={i} position={[p.lat, p.lng]} icon={dotIcon()}>
                  <Popup><p className="text-xs">Point {i + 1}</p></Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Drawing hint overlay */}
            {drawing && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-card border border-primary/40 rounded-lg px-4 py-2 shadow-lg text-sm font-medium text-primary flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Click map to add points · {draftPoints.length} point{draftPoints.length !== 1 ? 's' : ''}
                {draftPoints.length >= 3 && ' · Ready to save'}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save Territory</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Territory Name</label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. North District" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="flex gap-2 flex-wrap">
                {TERRITORY_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                    style={{ background: c, borderColor: newColor === c ? '#fff' : 'transparent', outline: newColor === c ? `2px solid ${c}` : 'none' }}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign Rep (optional)</label>
              <Select value={newRep} onValueChange={setNewRep}>
                <SelectTrigger><SelectValue placeholder="Select rep" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Unassigned</SelectItem>
                  {reps.map(r => <SelectItem key={r.email} value={r.email}>{r.full_name || r.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">{draftPoints.length} polygon points</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!newName.trim() || createTerritory.isPending}>
              <Save className="h-4 w-4 mr-2" /> Save Territory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ray-casting point-in-polygon algorithm
function isPointInPolygon(point, polygon) {
  let inside = false;
  const x = point.lng, y = point.lat;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}