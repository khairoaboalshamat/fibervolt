import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { input } = await req.json();
  if (!input) return Response.json({ predictions: [] });

  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&components=country:us&key=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  const predictions = (data.predictions || []).map(p => p.description);
  return Response.json({ predictions });
});