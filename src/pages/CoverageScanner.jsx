import React, { useState, useCallback, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Wifi, WifiOff, CheckCircle2, XCircle, Loader2, MapPin, User, RefreshCw, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const FIBER_COLORS = {
  available: { label: 'Fiber Available', color: 'bg-green-500', textColor: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  not_available: { label: 'No Fiber', color: 'bg-red-500', textColor: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  under_construction: { label: 'Under Construction', color: 'bg-yellow-500', textColor: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  planned: { label: 'Planned', color: 'bg-blue-500', textColor: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  unknown: { label: 'Unknown', color: 'bg-gray-400', textColor: 'text-gray-600', bg: 'bg-gray-50 border-gray-200' },
};

const STATUS_COLORS = {
  sale: { label: 'Customer', color: 'bg-green-500' },
  installed: { label: 'Installed', color: 'bg-emerald-600' },
  interested: { label: 'Interested', color: 'bg-blue-500' },
  follow_up: { label: 'Follow Up', color: 'bg-yellow-500' },
  not_interested: { label: 'Not Interested', color: 'bg-red-500' },
  knocked: { label: 'Knocked', color: 'bg-purple-500' },
  no_answer: { label: 'No Answer', color: 'bg-gray-400' },
  lead: { label: 'Lead', color: 'bg-slate-400' },
  callback: { label: 'Callback', color: 'bg-orange-500' },
  already_customer: { label: 'Existing Customer', color: 'bg-teal-500' },
  cancelled: { label: 'Cancelled', color: 'bg-rose-600' },
};

function AddressCard({ pin, client }) {
  const fiber = FIBER_COLORS[pin.fiber_status] || FIBER_COLORS.unknown;
  const statusInfo = STATUS_COLORS[pin.status] || STATUS_COLORS.lead;
  const isCustomer = pin.status === 'sale' || pin.status === 'installed' || pin.status === 'already_customer' || !!client;
  const hasFiber = pin.fiber_status === 'available';

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${fiber.bg}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`mt-0.5 w-2.5 h-2.5 rounded-full shrink-0 ${fiber.color}`} />
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-snug break-words">{pin.address || `${pin.lat?.toFixed(4)}, ${pin.lng?.toFixed(4)}`}</p>
            {pin.customer_name && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <User className="h-3 w-3" /> {pin.customer_name}
              </p>
            )}
            {pin.rep_name && (
              <p className="text-xs text-muted-foreground mt-0.5">Rep: {pin.rep_name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full text-white ${statusInfo.color}`}>
            {statusInfo.label}
          </span>
          {isCustomer ? (
            <span className="text-xs flex items-center gap-1 text-green-700 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" /> Has Service
            </span>
          ) : (
            <span className="text-xs flex items-center gap-1 text-gray-500">
              <XCircle className="h-3.5 w-3.5" /> No Service
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium flex items-center gap-1 ${fiber.textColor}`}>
          {hasFiber ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {fiber.label}
        </span>
        {pin.phone && <span className="text-xs text-muted-foreground">📞 {pin.phone}</span>}
        {pin.follow_up_date && <span className="text-xs text-muted-foreground">📅 {pin.follow_up_date}</span>}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: IconComp, colorClass }) {
  const Icon = IconComp;
  return (
    <div className="bg-card rounded-xl border p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

export default function CoverageScanner() {
  const [search, setSearch] = useState('');
  const [fiberFilter, setFiberFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchRef = React.useRef();

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const { data: pins = [], isLoading: pinsLoading, refetch } = useQuery({
    queryKey: ['coverage-pins'],
    queryFn: () => base44.entities.MapPin.list('-updated_date', 2000),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['coverage-clients'],
    queryFn: () => base44.entities.Client.list('-updated_date', 2000),
  });

  // Build client map by address for quick lookup
  const clientMap = React.useMemo(() => {
    const map = {};
    clients.forEach(c => {
      if (c.address) map[c.address.toLowerCase().trim()] = c;
    });
    return map;
  }, [clients]);

  const filtered = React.useMemo(() => {
    return pins.filter(pin => {
      const addr = (pin.address || '').toLowerCase();
      const name = (pin.customer_name || '').toLowerCase();
      const matchSearch = !debouncedSearch || addr.includes(debouncedSearch.toLowerCase()) || name.includes(debouncedSearch.toLowerCase());
      const matchFiber = fiberFilter === 'all' || pin.fiber_status === fiberFilter;
      const isCustomer = pin.status === 'sale' || pin.status === 'installed' || pin.status === 'already_customer' || !!clientMap[(pin.address || '').toLowerCase().trim()];
      const matchService = serviceFilter === 'all' || (serviceFilter === 'has_service' ? isCustomer : !isCustomer);
      return matchSearch && matchFiber && matchService;
    });
  }, [pins, debouncedSearch, fiberFilter, serviceFilter, clientMap]);

  // Stats
  const stats = React.useMemo(() => {
    const total = pins.length;
    const fiberAvailable = pins.filter(p => p.fiber_status === 'available').length;
    const hasService = pins.filter(p => p.status === 'sale' || p.status === 'installed' || p.status === 'already_customer' || !!clientMap[(p.address || '').toLowerCase().trim()]).length;
    const fiberAvailableNoService = pins.filter(p => p.fiber_status === 'available' && p.status !== 'sale' && p.status !== 'installed' && p.status !== 'already_customer' && !clientMap[(p.address || '').toLowerCase().trim()]).length;
    return { total, fiberAvailable, hasService, fiberAvailableNoService };
  }, [pins, clientMap]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 pt-safe pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4 pt-4">
          <div>
            <h1 className="text-2xl font-bold">Coverage Scanner</h1>
            <p className="text-sm text-muted-foreground">Frontier fiber availability & service status</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${pinsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard label="Total Addresses" value={stats.total} icon={MapPin} colorClass="bg-slate-500" />
          <StatCard label="Fiber Available" value={stats.fiberAvailable} icon={Wifi} colorClass="bg-green-500" />
          <StatCard label="Active Customers" value={stats.hasService} icon={CheckCircle2} colorClass="bg-blue-500" />
          <StatCard label="Fiber / No Service" value={stats.fiberAvailableNoService} icon={WifiOff} colorClass="bg-orange-500" />
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search address or customer name..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={fiberFilter} onValueChange={setFiberFilter}>
            <SelectTrigger className="flex-1 h-9 text-xs">
              <SelectValue placeholder="Fiber Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fiber</SelectItem>
              <SelectItem value="available">✅ Available</SelectItem>
              <SelectItem value="not_available">❌ Not Available</SelectItem>
              <SelectItem value="under_construction">🔧 Under Construction</SelectItem>
              <SelectItem value="planned">📅 Planned</SelectItem>
              <SelectItem value="unknown">❓ Unknown</SelectItem>
            </SelectContent>
          </Select>
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="flex-1 h-9 text-xs">
              <SelectValue placeholder="Service Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="has_service">✅ Has Service</SelectItem>
              <SelectItem value="no_service">❌ No Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {pinsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No addresses found</p>
            <p className="text-sm mt-1">Try adjusting your filters or add pins on the map first</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-medium">{filtered.length} address{filtered.length !== 1 ? 'es' : ''} found</p>
            {filtered.map(pin => (
              <AddressCard
                key={pin.id}
                pin={pin}
                client={clientMap[(pin.address || '').toLowerCase().trim()]}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}