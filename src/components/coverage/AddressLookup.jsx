import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import AddressResultCard from '@/components/coverage/AddressResultCard.jsx';

export default function AddressLookup({ pins, clientMap }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const fetchSuggestions = async (value) => {
    setQuery(value);
    if (value.length < 3) { setSuggestions([]); return; }
    try {
      const res = await base44.functions.invoke('placesAutocomplete', { input: value });
      setSuggestions(res.data?.predictions || []);
    } catch {
      setSuggestions([]);
    }
  };

  const selectAddress = async (suggestion) => {
    setSuggestions([]);
    setQuery(suggestion.description);
    setLoading(true);
    setResult(null);
    try {
      const addr = suggestion.description.toLowerCase().trim();
      const pin = pins.find(p => p.address && p.address.toLowerCase().trim() === addr);
      const client = clientMap[addr];
      setResult({
        address: suggestion.description,
        fiberStatus: pin?.fiber_status || 'unknown',
        isCustomer: !!client || pin?.status === 'sale' || pin?.status === 'installed' || pin?.status === 'already_customer',
        customerName: client?.name,
        repName: pin?.rep_name,
        status: pin?.status,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Search any address to check fiber availability and customer status.</p>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input value={query} onChange={e => fetchSuggestions(e.target.value)} placeholder="Enter an address..." className="pl-9" />
        {suggestions.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {suggestions.map(s => (
              <button key={s.place_id} onClick={() => selectAddress(s)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-0">
                {s.description}
              </button>
            ))}
          </div>
        )}
      </div>
      {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Checking...</div>}
      {result && !loading && <AddressResultCard {...result} />}
    </div>
  );
}