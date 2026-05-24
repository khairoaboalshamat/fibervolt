import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import AddressResultCard from './AddressResultCard.jsx';

export default function AddressLookup({ pins, clients, clientMap }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [result, setResult] = useState(null);
  const [looking, setLooking] = useState(false);
  const debounceRef = useRef();

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoadingSugg(true);
      try {
        const res = await base44.functions.invoke('placesAutocomplete', { input: val });
        setSuggestions(res.data?.predictions || []);
      } finally {
        setLoadingSugg(false);
      }
    }, 400);
  };

  const handleSelect = async (prediction) => {
    setQuery(prediction.description);
    setSuggestions([]);
    setLooking(true);
    setResult(null);
    try {
      const geo = await base44.functions.invoke('reverseGeocode', { address: prediction.description });
      const { lat, lng } = geo.data || {};
      // Try to find existing pin near this address
      const addrLower = prediction.description.toLowerCase();
      const existingPin = pins.find(p => (p.address || '').toLowerCase().includes(addrLower.split(',')[0]) || addrLower.includes((p.address || '').toLowerCase().split(',')[0]));
      const existingClient = clientMap[addrLower] || clients.find(c => (c.address || '').toLowerCase().includes(addrLower.split(',')[0]));
      setResult({ address: prediction.description, lat, lng, pin: existingPin || null, client: existingClient || null });
    } finally {
      setLooking(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Type any address to instantly check fiber availability and service status.</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="e.g. 123 Main St, Dallas, TX"
          value={query}
          onChange={e => handleInput(e.target.value)}
        />
        {loadingSugg && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {suggestions.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-lg">
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSelect(s)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-muted border-b border-border last:border-0 transition-colors">
              {s.description}
            </button>
          ))}
        </div>
      )}

      {looking && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Looking up address...
        </div>
      )}

      {result && !looking && (
        <AddressResultCard address={result.address} pin={result.pin} client={result.client} />
      )}
    </div>
  );
}