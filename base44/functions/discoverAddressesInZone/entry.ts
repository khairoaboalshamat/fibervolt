import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Uses Google Places + Geocoding to find residential addresses within a bounding box polygon
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { polygon } = await req.json();
    // polygon: array of {lat, lng} points
    if (!polygon || polygon.length < 3) {
      return Response.json({ error: 'polygon with at least 3 points required' }, { status: 400 });
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');

    // Calculate bounding box center and radius
    const lats = polygon.map(p => p.lat);
    const lngs = polygon.map(p => p.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    // Radius in meters — approx diagonal of bounding box
    const R = 6371000;
    const dLat = (Math.max(...lats) - Math.min(...lats)) * (Math.PI / 180);
    const dLng = (Math.max(...lngs) - Math.min(...lngs)) * (Math.PI / 180);
    const radius = Math.min(Math.sqrt((dLat * R) ** 2 + (dLng * R) ** 2) / 2, 50000);

    // Use Google Places Nearby Search for residential addresses
    const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${centerLat},${centerLng}&radius=${Math.round(radius)}&type=premise&key=${apiKey}`;

    const placesRes = await fetch(placesUrl);
    const placesData = await placesRes.json();

    const allPlaces = placesData.results || [];
    let nextPageToken = placesData.next_page_token;

    // Fetch up to 3 pages (60 results max)
    for (let page = 0; page < 2 && nextPageToken; page++) {
      await new Promise(r => setTimeout(r, 2000)); // required delay for next_page_token
      const nextUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?pagetoken=${nextPageToken}&key=${apiKey}`;
      const nextRes = await fetch(nextUrl);
      const nextData = await nextRes.json();
      allPlaces.push(...(nextData.results || []));
      nextPageToken = nextData.next_page_token;
    }

    // Point-in-polygon check
    function pointInPolygon(point, poly) {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const xi = poly[i].lat, yi = poly[i].lng;
        const xj = poly[j].lat, yj = poly[j].lng;
        const intersect = ((yi > point.lng) !== (yj > point.lng)) &&
          (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }

    // Filter to places actually inside the polygon and get their addresses
    const addresses = [];
    for (const place of allPlaces) {
      const plat = place.geometry?.location?.lat;
      const plng = place.geometry?.location?.lng;
      if (!plat || !plng) continue;
      if (!pointInPolygon({ lat: plat, lng: plng }, polygon)) continue;

      // Get formatted address via reverse geocode
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${plat},${plng}&key=${apiKey}`;
      const geoRes = await fetch(geocodeUrl);
      const geoData = await geoRes.json();
      const formatted = geoData.results?.[0]?.formatted_address;
      if (formatted) {
        addresses.push({ address: formatted, lat: plat, lng: plng });
      }
    }

    // Deduplicate by address
    const seen = new Set();
    const unique = addresses.filter(a => {
      if (seen.has(a.address)) return false;
      seen.add(a.address);
      return true;
    });

    return Response.json({ addresses: unique, total: unique.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});