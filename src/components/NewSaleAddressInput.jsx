import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

function loadGoogleMapsScript(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-maps-script')) {
      const check = setInterval(() => {
        if (window.google?.maps?.places) { clearInterval(check); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function AddressAutocomplete({ value, onChange, placeholder }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    base44.functions.invoke('getGoogleMapsKey', {})
      .then(res => {
        const key = res.data?.key;
        if (!key) return;
        return loadGoogleMapsScript(key);
      })
      .then(() => setReady(true))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
    try {
      const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['address'],
        componentRestrictions: { country: 'us' },
      });
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.formatted_address) onChange(place.formatted_address);
      });
      autocompleteRef.current = ac;
    } catch (e) {}
  }, [ready, onChange]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || '123 Main St, City, State 12345'}
      autoComplete="off"
    />
  );
}