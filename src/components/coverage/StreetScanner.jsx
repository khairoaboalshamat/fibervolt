import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import AddressResultCard from './AddressResultCard.jsx';

// Uses AI to generate likely house addresses on a street, then checks each one
export default function StreetScanner({ pins, clients, clientMap, user, onPinsCreated }) {
  const [street, setStreet] = useState('');
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const debounceRef = useRef();

  const handleInput = (val) => {
    setStreet(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSugg(true);
      try {
        const res = await base44.functions.invoke('placesAutocomplete', { input: val });
        setSuggestions((res.data?.predictions || []).filter(p => p.types?.includes('route') || p.types?.includes('street_address') || true).slice(0, 5));
      } finally {
        setLoadingSugg(false);
      }
    }, 400);
  };

  const handleScan = async (selectedStreet) => {
    const s = selectedStreet || street;
    if (!s.trim()) return;
    setSuggestions([]);
    setStreet(s);
    setScanning(true);
    setResults([]);
    setError(null);

    try {
      // Use AI to generate a list of likely addresses on this street
      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a realistic list of 20 house/building addresses on this street: "${s}". 
        Include house numbers ranging from low to high (e.g. 100, 102, 104... or 1, 3, 5...). 
        Return ONLY the full addresses including the street name and city/state if provided.
        Make them look like real US residential addresses.`,
        response_json_schema: {
          type: 'object',
          properties: {
            addresses: { type: 'array', items: { type: 'string' } }
          }
        }
      });

      const addresses = aiResult?.addresses || [];
      if (!addresses.length) { setError('Could not generate addresses for this street.'); setScanning(false); return; }

      setProgress({ done: 0, total: addresses.length });
      const scanned = [];
      const newPins = [];

      for (let i = 0; i < addresses.length; i++) {
        const addr = addresses[i];
        const addrLower = addr.toLowerCase();
        const existingPin = pins.find(p => (p.address || '').toLowerCase().includes(addrLower.split(',')[0]) || addrLower.includes((p.address || '').toLowerCase().split(',')[0]));
        const existingClient = clientMap[addrLower] || clients.find(c => (c.address || '').toLowerCase().includes(addrLower.split(',')[0]));

        let resultPin = existingPin;
        if (!existingPin) {
          try {
            const geo = await base44.functions.invoke('reverseGeocode', { address: addr });
            const { lat, lng } = geo.data || {};
            if (lat && lng) {
              newPins.push({ address: addr, lat, lng, status: 'lead', rep_email: user?.email, rep_name: user?.full_name || user?.email, source: 'upload' });
            }
          } catch { /* skip */ }
        }

        scanned.push({ address: addr, pin: resultPin || null, client: existingClient || null });
        setProgress({ done: i + 1, total: addresses.length });
      }

      if (newPins.length > 0) {
        await base44.entities.MapPin.bulkCreate(newPins);
        onPinsCreated?.(newPins.length);
      }

      setResults(scanned);
    } catch (e) {
      setError(e.message || 'Scan failed.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Enter a street name and we'll generate and scan addresses on that street for fiber and service status.</p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="e.g. Main St, Dallas TX" value={street} onChange={e => handleInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()} />
          {loadingSugg && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <Button onClick={() => handleScan()} disabled={scanning || !street.trim()}>
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scan'}
        </Button>
      </div>

      {suggestions.length > 0 && !scanning && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleScan(s.description)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-muted border-b border-border last:border-0">
              {s.description}
            </button>
          ))}
        </div>
      )}

      {scanning && (
        <div className="flex flex-col items-center justify-center py-10 gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="text-center">
            <p className="font-semibold">Scanning street addresses...</p>
            <p className="text-sm text-muted-foreground">{progress.done} / {progress.total}</p>
          </div>
          {progress.total > 0 && (
            <div className="w-full bg-muted rounded-full h-2">
              <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg p-3 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {results.length > 0 && !scanning && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{results.length} addresses scanned on "{street}"</p>
            <Button variant="outline" size="sm" onClick={() => { setResults([]); setStreet(''); }}>Clear</Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Fiber Available', val: results.filter(r => r.pin?.fiber_status === 'available').length, color: 'text-green-700 bg-green-50 border-green-200' },
              { label: 'Has Service', val: results.filter(r => r.pin?.status === 'sale' || r.pin?.status === 'installed' || r.client).length, color: 'text-blue-700 bg-blue-50 border-blue-200' },
              { label: 'Opportunity', val: results.filter(r => r.pin?.fiber_status === 'available' && r.pin?.status !== 'sale' && r.pin?.status !== 'installed' && !r.client).length, color: 'text-orange-700 bg-orange-50 border-orange-200' },
            ].map(s => (
              <div key={s.label} className={`rounded-lg border p-2 text-center ${s.color}`}>
                <p className="text-xl font-bold">{s.val}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3 max-h-[50vh] overflow-y-auto">
            {results.map((r, i) => <AddressResultCard key={i} address={r.address} pin={r.pin} client={r.client} />)}
          </div>
        </div>
      )}
    </div>
  );
}