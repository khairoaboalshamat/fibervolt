import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function AddressAutocomplete({ value, onChange, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = async (input) => {
    if (!input || input.length < 3) { setSuggestions([]); return; }
    const res = await base44.functions.invoke('placesAutocomplete', { input });
    setSuggestions(res.data?.predictions || []);
    setShowDropdown(true);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (address) => {
    onChange(address);
    setSuggestions([]);
    setShowDropdown(false);
  };

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={handleChange}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder || '123 Main St, City, State 12345'}
      />
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-border rounded-md shadow-lg mt-1 max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={i}
              className="px-3 py-2 text-sm cursor-pointer text-gray-900 font-medium hover:bg-primary hover:text-white border-b border-border last:border-0"
              onMouseDown={() => handleSelect(s)}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}