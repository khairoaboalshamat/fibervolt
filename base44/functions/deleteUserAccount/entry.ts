import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Delete all user-related data
    const [sales, pins, logs, locations, repTiers, boosts] = await Promise.all([
      base44.asServiceRole.entities.Sale.filter({ 'rep_email': user.email }),
      base44.asServiceRole.entities.MapPin.filter({ 'rep_email': user.email }),
      base44.asServiceRole.entities.ActivityLog.filter({ 'rep_email': user.email }),
      base44.asServiceRole.entities.RepLocation.filter({ 'rep_email': user.email }),
      base44.asServiceRole.entities.RepTier.filter({ 'rep_email': user.email }),
      base44.asServiceRole.entities.RepBoost.filter({ 'rep_email': user.email }),
    ]);

    // Batch delete all records
    const deletePromises = [
      ...sales.map(s => base44.asServiceRole.entities.Sale.delete(s.id)),
      ...pins.map(p => base44.asServiceRole.entities.MapPin.delete(p.id)),
      ...logs.map(l => base44.asServiceRole.entities.ActivityLog.delete(l.id)),
      ...locations.map(l => base44.asServiceRole.entities.RepLocation.delete(l.id)),
      ...repTiers.map(t => base44.asServiceRole.entities.RepTier.delete(t.id)),
      ...boosts.map(b => base44.asServiceRole.entities.RepBoost.delete(b.id)),
    ];

    await Promise.all(deletePromises);

    return Response.json({ success: true, message: 'Account and all data deleted' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});