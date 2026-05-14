import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function AddressAutocomplete({ value, onChange, placeholder }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [apiKey, setApiKey] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Fetch the key once
  useEffect(() => {
    base44.functions.invoke('getGoogleMapsKey', {}).then(res => {
      setApiKey(res.data?.key);
    });
  }, []);

  // Load Google Maps script once we have the key
  useEffect(() => {
    if (!apiKey) return;
    if (window.google?.maps?.places) { setScriptLoaded(true); return; }
    const existing = document.getElementById('gmaps-script');
    if (existing) { existing.addEventListener('load', () => setScriptLoaded(true)); return; }
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [apiKey]);

  // Init autocomplete once script is loaded
  useEffect(() => {
    if (!scriptLoaded || !inputRef.current) return;
    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
    });
    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (place?.formatted_address) {
        onChange(place.formatted_address);
      }
    });
  }, [scriptLoaded]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '123 Main St, City, State 12345'}
    />
  );
}