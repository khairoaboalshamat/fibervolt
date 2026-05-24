import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Entity automation handler — fires when a MapPin is created or updated.
 * Calls assignFiberLead for any pin that just became fiber_status=available
 * and has no rep assigned yet.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    // Only act on fiber_status = available pins with no rep assigned
    if (!data || data.fiber_status !== 'available') {
      return Response.json({ skipped: true, reason: 'Not a fiber-available pin' });
    }

    // Skip if already has a rep assigned (don't re-assign)
    if (data.rep_email) {
      return Response.json({ skipped: true, reason: 'Rep already assigned' });
    }

    // For updates, only proceed if fiber_status just changed to available
    if (event?.type === 'update' && old_data?.fiber_status === 'available') {
      return Response.json({ skipped: true, reason: 'fiber_status was already available before update' });
    }

    if (!data.lat || !data.lng) {
      return Response.json({ skipped: true, reason: 'Pin has no coordinates' });
    }

    // Delegate to the assignFiberLead function
    const result = await base44.asServiceRole.functions.invoke('assignFiberLead', {
      pin_id: data.id,
    });

    return Response.json({ routed: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});