import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Haversine distance in km between two lat/lng points
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Accept a pinId OR a raw {lat, lng, address} to assign
    const body = await req.json();
    const { pin_id, lat, lng, address, dry_run = false } = body;

    if (!pin_id && (!lat || !lng)) {
      return Response.json({ error: 'Provide pin_id or lat+lng' }, { status: 400 });
    }

    // --- 1. Resolve the pin ---
    let pin;
    if (pin_id) {
      const pins = await base44.asServiceRole.entities.MapPin.list('-created_date', 5000);
      pin = pins.find(p => p.id === pin_id);
      if (!pin) return Response.json({ error: 'Pin not found' }, { status: 404 });
    } else {
      pin = { lat, lng, address, fiber_status: 'available' };
    }

    if (pin.fiber_status !== 'available') {
      return Response.json({ error: 'Pin fiber_status is not "available"', pin_id: pin.id }, { status: 422 });
    }

    // --- 2. Load rep locations (last seen within 48 hours) ---
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const repLocations = await base44.asServiceRole.entities.RepLocation.list('-last_seen', 200);
    const activeReps = repLocations.filter(r => r.last_seen && r.last_seen >= cutoff);

    if (activeReps.length === 0) {
      return Response.json({ assigned: false, reason: 'No reps with recent location data found' });
    }

    // --- 3. Count open workload per rep (non-terminal pins) ---
    const allPins = await base44.asServiceRole.entities.MapPin.list('-created_date', 5000);
    const OPEN_STATUSES = ['lead', 'knocked', 'follow_up', 'interested', 'callback'];
    const workloadMap = {};
    allPins.forEach(p => {
      if (p.rep_email && OPEN_STATUSES.includes(p.status)) {
        workloadMap[p.rep_email] = (workloadMap[p.rep_email] || 0) + 1;
      }
    });

    // --- 4. Score each rep: distance + workload penalty ---
    const MAX_WORKLOAD_PENALTY_KM = 10; // up to 10 km extra for heavy workload (50+ pins)
    const WORKLOAD_SCALE = 50;

    const scored = activeReps.map(rep => {
      const distKm = haversineKm(pin.lat, pin.lng, rep.lat, rep.lng);
      const workload = workloadMap[rep.rep_email] || 0;
      const workloadPenalty = Math.min(workload / WORKLOAD_SCALE, 1) * MAX_WORKLOAD_PENALTY_KM;
      const score = distKm + workloadPenalty;
      return { rep, distKm: Math.round(distKm * 10) / 10, workload, score };
    });

    scored.sort((a, b) => a.score - b.score);
    const best = scored[0];

    // --- 5. Assign (unless dry_run) ---
    if (!dry_run && pin.id) {
      await base44.asServiceRole.entities.MapPin.update(pin.id, {
        rep_email: best.rep.rep_email,
        rep_name: best.rep.rep_name || best.rep.rep_email,
        status: pin.status === 'lead' || !pin.status ? 'lead' : pin.status,
      });

      // Log the assignment
      await base44.asServiceRole.entities.ActivityLog.create({
        rep_email: best.rep.rep_email,
        rep_name: best.rep.rep_name || best.rep.rep_email,
        action: 'pin_updated',
        detail: `Auto-assigned fiber lead at ${pin.address || `${pin.lat},${pin.lng}`} (${best.distKm} km away, ${best.workload} open leads)`,
        entity_id: pin.id,
        meta: { fiber_status: 'available', auto_assigned: true, distance_km: best.distKm, workload: best.workload },
      });
    }

    return Response.json({
      assigned: true,
      dry_run,
      pin_id: pin.id,
      address: pin.address,
      assigned_to: {
        rep_email: best.rep.rep_email,
        rep_name: best.rep.rep_name,
        distance_km: best.distKm,
        open_leads: best.workload,
      },
      all_candidates: scored.slice(0, 5).map(s => ({
        rep_email: s.rep.rep_email,
        rep_name: s.rep.rep_name,
        distance_km: s.distKm,
        open_leads: s.workload,
        score: Math.round(s.score * 10) / 10,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});