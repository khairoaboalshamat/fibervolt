import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Invisible component that tracks the current rep's GPS and upserts RepLocation.
 * Mount this once inside the Maps page (or AppLayout) for any logged-in rep.
 */
export default function RepTracker({ user }) {
  const queryClient = useQueryClient();
  const locationRecordId = useRef(null);
  const watchId = useRef(null);

  useEffect(() => {
    if (!user?.email || !navigator.geolocation) return;

    const upsert = async (lat, lng, accuracy) => {
      const payload = {
        rep_email: user.email,
        rep_name: user.full_name || user.email,
        lat,
        lng,
        accuracy,
        last_seen: new Date().toISOString(),
      };

      if (locationRecordId.current) {
        await base44.entities.RepLocation.update(locationRecordId.current, payload);
      } else {
        // Try to find existing record for this rep
        const existing = await base44.entities.RepLocation.filter({ rep_email: user.email }, '-last_seen', 1);
        if (existing.length > 0) {
          locationRecordId.current = existing[0].id;
          await base44.entities.RepLocation.update(existing[0].id, payload);
        } else {
          const created = await base44.entities.RepLocation.create(payload);
          locationRecordId.current = created.id;
        }
      }
      // Update local query cache
      queryClient.setQueryData(['repLocations'], (old = []) => {
        const filtered = old.filter(r => r.rep_email !== user.email);
        return [...filtered, { ...payload, id: locationRecordId.current }];
      });
    };

    watchId.current = navigator.geolocation.watchPosition(
      pos => upsert(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [user?.email]);

  return null;
}