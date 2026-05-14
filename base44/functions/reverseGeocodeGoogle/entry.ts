Deno.serve(async (req) => {
  try {
    const { lat, lng } = await req.json();
    
    if (!lat || !lng) {
      return Response.json({ error: 'lat and lng required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Google Maps API key not configured' }, { status: 500 });
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    
    const data = await response.json();

    if (data.results && data.results.length > 0) {
      // Get the most precise address (first result is typically the most specific)
      const address = data.results[0].formatted_address;
      return Response.json({ address });
    }

    return Response.json({ address: '' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});