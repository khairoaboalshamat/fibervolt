import React, { useState, useMemo } from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Button } from '@/components/ui/button';
import { Navigation, X, Route } from 'lucide-react';

function routeNumberIcon(n) {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#f97316;color:white;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -14],
  });
}

// Nearest-neighbor TSP heuristic
function nearestNeighbor(pins) {
  if (pins.length <= 1) return pins;
  const remaining = [...pins];
  const route = [remaining.splice(0, 1)[0]];
  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let bestIdx = 0, bestDist = Infinity;
    remaining.forEach((p, i) => {
      const d = Math.hypot(p.lat - last.lat, p.lng - last.lng);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });
    route.push(remaining.splice(bestIdx, 1)[0]);
  }
  return route;
}

export default function RouteOptimizer({ pins, userLocation }) {
  const [active, setActive] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState(['follow_up', 'callback', 'interested']);

  const candidatePins = useMemo(() =>
    pins.filter(p => selectedStatuses.includes(p.status)),
    [pins, selectedStatuses]
  );

  const route = useMemo(() => {
    if (!active || candidatePins.length === 0) return [];
    const start = userLocation || candidatePins[0];
    const rest = userLocation
      ? candidatePins
      : candidatePins.slice(1);
    const ordered = nearestNeighbor(rest);
    return userLocation ? [{ ...userLocation, address: 'Your Location', _isStart: true }, ...ordered] : [candidatePins[0], ...ordered];
  }, [active, candidatePins, userLocation]);

  const polyline = route.map(p => [p.lat, p.lng]);
  const totalKm = useMemo(() => {
    let d = 0;
    for (let i = 1; i < route.length; i++) {
      d += Math.hypot(route[i].lat - route[i-1].lat, route[i].lng - route[i-1].lng) * 111;
    }
    return d.toFixed(1);
  }, [route]);

  return (
    <>
      {/* Route overlay (inside MapContainer) */}
      {active && route.length > 1 && (
        <>
          <Polyline positions={polyline} pathOptions={{ color: '#f97316', weight: 3, dashArray: '8 6', opacity: 0.85 }} />
          {route.map((p, i) => !p._isStart && (
            <Marker key={p.id || i} position={[p.lat, p.lng]} icon={routeNumberIcon(i + (userLocation ? 0 : 0))}>
              <Popup>
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold">Stop #{i + 1}</p>
                  <p>{p.address || 'Pin'}</p>
                  {p.customer_name && <p className="text-muted-foreground">{p.customer_name}</p>}
                </div>
              </Popup>
            </Marker>
          ))}
        </>
      )}

      {/* Control panel (outside map, rendered as a floating div via portal-like positioning) */}
      <div className="absolute top-4 left-4 z-[1000] bg-card border border-border rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Route className="h-4 w-4 text-primary" /> Route Planner
          </div>
          {active && (
            <button onClick={() => setActive(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {!active ? (
          <>
            <p className="text-xs text-muted-foreground mb-2">{candidatePins.length} pins eligible</p>
            <Button size="sm" className="w-full text-xs h-7" onClick={() => setActive(true)} disabled={candidatePins.length === 0}>
              <Navigation className="h-3 w-3 mr-1" /> Optimize Route
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{route.length - (userLocation ? 1 : 0)} stops · ~{totalKm} km</p>
            <div className="mt-2 space-y-0.5 max-h-32 overflow-y-auto">
              {route.filter(p => !p._isStart).map((p, i) => (
                <div key={p.id || i} className="flex items-center gap-2 text-xs">
                  <span className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold shrink-0">{i+1}</span>
                  <span className="truncate text-muted-foreground">{p.address || p.customer_name || 'Pin'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}