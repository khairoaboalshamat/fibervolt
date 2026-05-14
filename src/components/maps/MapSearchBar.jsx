import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function MapSearchBar({ onSelectLocation }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await base44.functions.invoke('placesAutocomplete', { input: val });
        setSuggestions(res.data?.predictions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 350);
  };

  const handleSelect = async (prediction) => {
    setSuggestions([]);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(prediction.description)}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        onSelectLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        setOpen(false);
        setQuery('');
      }
    } catch {}
  };

  const clear = () => { setQuery(''); setSuggestions([]); };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="bg-white/95 backdrop-blur-sm text-gray-400 rounded-xl p-2.5 hover:bg-white transition-colors shadow-lg border border-white/30 shrink-0"
        title="Search address"
      >
        <Search className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Search Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
              <Search className="h-4 w-4 text-gray-400 ml-3 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleChange}
                placeholder="Search address..."
                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 px-2 py-2.5 outline-none"
              />
              {query && (
                <button onClick={clear} className="mr-2 text-gray-400 hover:text-gray-600">
                  <X className="h-4 w-4" />
                </button>
              )}
              {loading && (
                <div className="mr-3 h-3.5 w-3.5 border-2 border-gray-300 border-t-primary rounded-full animate-spin shrink-0" />
              )}
            </div>

            {suggestions.length > 0 && (
              <ul className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto">
                {suggestions.map((p) => (
                  <li
                    key={p.place_id}
                    onMouseDown={() => handleSelect(p)}
                    className="px-3 py-2.5 text-sm text-gray-800 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-0"
                  >
                    <span className="font-medium">{p.structured_formatting?.main_text}</span>
                    <span className="text-gray-400 ml-1 text-xs">{p.structured_formatting?.secondary_text}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}