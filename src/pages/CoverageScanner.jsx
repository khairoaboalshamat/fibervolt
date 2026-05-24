import React, { useState, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Wifi, WifiOff, CheckCircle2, MapPin, RefreshCw, Search, Upload, Map, ScanSearch, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import AddressLookup from '@/components/coverage/AddressLookup.jsx';
import BulkUploadScanner from '@/components/coverage/BulkUploadScanner.jsx';
import StreetScanner from '@/components/coverage/StreetScanner.jsx';
import MapZoneScanner from '@/components/coverage/MapZoneScanner.jsx';
import FiberDensityMap from '@/components/coverage/FiberDensityMap.jsx';
import ZoneScanTool from '@/components/coverage/ZoneScanTool.jsx';

const TABS = [
  { id: 'lookup', label: 'Address Lookup', icon: Search, desc: 'Single address' },
  { id: 'street', label: 'Street Scan', icon: Map, desc: 'Entire street' },
  { id: 'upload', label: 'Bulk Upload', icon: Upload, desc: 'CSV / Excel' },
  { id: 'zone', label: 'FCC Zone Scan', icon: MapPin, desc: 'Draw & scan' },
  { id: 'density', label: 'Density Map', icon: LayoutGrid, desc: 'Heat map' },
];

export default function CoverageScanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('lookup');

  const { data: pins = [], isLoading: pinsLoading, refetch } = useQuery({
    queryKey: ['coverage-pins'],
    queryFn: () => base44.entities.MapPin.list('-updated_date', 2000),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['coverage-clients'],
    queryFn: () => base44.entities.Client.list('-updated_date', 2000),
  });

  const clientMap = useMemo(() => {
    const map = {};
    clients.forEach(c => { if (c.address) map[c.address.toLowerCase().trim()] = c; });
    return map;
  }, [clients]);

  const stats = useMemo(() => {
    const total = pins.length;
    const fiberAvailable = pins.filter(p => p.fiber_status === 'available').length;
    const hasService = pins.filter(p => p.status === 'sale' || p.status === 'installed' || p.status === 'already_customer' || !!clientMap[(p.address || '').toLowerCase().trim()]).length;
    const opportunity = pins.filter(p => p.fiber_status === 'available' && p.status !== 'sale' && p.status !== 'installed' && p.status !== 'already_customer' && !clientMap[(p.address || '').toLowerCase().trim()]).length;
    return { total, fiberAvailable, hasService, opportunity };
  }, [pins, clientMap]);

  const handlePinsCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['coverage-pins'] });
    queryClient.invalidateQueries({ queryKey: ['pins'] });
  };

  const sharedProps = { pins, clients, clientMap, user, onPinsCreated: handlePinsCreated };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-safe sticky top-0 z-10">
        <div className="flex items-center justify-between pt-4 pb-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ScanSearch className="h-5 w-5 text-primary" /> Coverage Scanner
            </h1>
            <p className="text-xs text-muted-foreground">Frontier fiber & service status</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${pinsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2 pb-3">
          {[
            { label: 'Total', value: stats.total, icon: MapPin, color: 'text-slate-500' },
            { label: 'Fiber', value: stats.fiberAvailable, icon: Wifi, color: 'text-green-600' },
            { label: 'Customers', value: stats.hasService, icon: CheckCircle2, color: 'text-blue-600' },
            { label: 'Leads', value: stats.opportunity, icon: WifiOff, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-background rounded-lg p-2 text-center border border-border">
              <s.icon className={`h-4 w-4 mx-auto mb-0.5 ${s.color}`} />
              <p className="text-lg font-bold leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-5 gap-1 pb-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-1 rounded-lg text-xs font-medium transition-all ${
                tab === t.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <t.icon className="h-4 w-4" />
              <span className="leading-tight">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === 'lookup' && <AddressLookup {...sharedProps} />}
        {tab === 'street' && <StreetScanner {...sharedProps} />}
        {tab === 'upload' && <BulkUploadScanner {...sharedProps} />}
        {tab === 'zone' && <ZoneScanTool user={user} onPinsCreated={handlePinsCreated} />}
        {tab === 'density' && <FiberDensityMap pins={pins} />}
      </div>
    </div>
  );
}