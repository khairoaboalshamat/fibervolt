import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function MapSearchBar({ onSelectLocation }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setSuggestions([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setQuery(prediction.description);
    setSuggestions([]);
    // Geocode the selected address using Nominatim
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(prediction.description)}&format=json&limit=1`);
      const data = await res.json();
      if (data[0]) {
        onSelectLocation({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
      }
    } catch {}
  };

  const clear = () => { setQuery(''); setSuggestions([]); };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center bg-white/95 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-white/30">
        <Search className="h-4 w-4 text-gray-400 ml-3 shrink-0" />
        <input
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
        <ul className="absolute top-full mt-1 left-0 right-0 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[2000] max-h-60 overflow-y-auto">
          {suggestions.map((p) => (
            <li
              key={p.place_id}
              onMouseDown={() => handleSelect(p)}
              className="px-4 py-2.5 text-sm text-gray-800 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
            >
              <span className="font-medium">{p.structured_formatting?.main_text}</span>
              <span className="text-gray-400 ml-1 text-xs">{p.structured_formatting?.secondary_text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}