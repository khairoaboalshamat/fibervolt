import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { lat, lng } = await req.json();

    if (!lat || !lng) {
      return Response.json({ error: 'lat and lng required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'API key not configured' }, { status: 500 });
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const address = data.results[0].formatted_address;
      return Response.json({ address });
    }

    return Response.json({ address: '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});