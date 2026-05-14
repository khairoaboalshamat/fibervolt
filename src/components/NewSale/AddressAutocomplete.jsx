import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';

export default function AddressAutocomplete({ value, onChange, placeholder }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // If already loaded, go straight to ready
    if (window.google?.maps?.places) {
      setReady(true);
      return;
    }

    base44.functions.invoke('getGoogleMapsKey', {}).then(res => {
      const apiKey = res.data?.key;
      if (!apiKey) return;

      // If script already injected, wait for it
      if (document.getElementById('gmaps-script')) {
        const interval = setInterval(() => {
          if (window.google?.maps?.places) {
            clearInterval(interval);
            setReady(true);
          }
        }, 100);
        return;
      }

      // Set up callback before injecting script
      window.__gmapsCallback = () => setReady(true);

      const script = document.createElement('script');
      script.id = 'gmaps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=__gmapsCallback`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    });
  }, []);

  // Init autocomplete once Maps is ready and input is mounted
  useEffect(() => {
    if (!ready || !inputRef.current || autocompleteRef.current) return;
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
  }, [ready]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || '123 Main St, City, State 12345'}
    />
  );
}