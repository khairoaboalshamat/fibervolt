import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// FCC Broadband Map API - free, no key required
// Checks if Frontier offers fiber at a given lat/lng
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { lat, lng } = await req.json();
    if (!lat || !lng) return Response.json({ error: 'lat and lng required' }, { status: 400 });

    // FCC Broadband Map availability API
    const url = `https://broadbandmap.fcc.gov/api/public/map/listAvailability?latitude=${lat}&longitude=${lng}&unit=0&category=Residential+Fixed+Broadband`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
      }
    });

    if (!res.ok) {
      return Response.json({ fiber_status: 'unknown', providers: [] });
    }

    const data = await res.json();
    const providers = data.availability || [];

    // Look for Frontier (provider_id starts with 130 or name contains Frontier)
    const frontierProviders = providers.filter(p =>
      p.brand_name?.toLowerCase().includes('frontier') ||
      p.doing_business_as?.toLowerCase().includes('frontier')
    );

    // Check if any Frontier offering is fiber (tech_code 50 = fiber to premises)
    const frontierFiber = frontierProviders.filter(p => p.technology === 50 || p.technology === 40);

    let fiber_status = 'not_available';
    if (frontierFiber.length > 0) {
      fiber_status = 'available';
    } else if (frontierProviders.length > 0) {
      // Frontier present but not fiber (copper/DSL)
      fiber_status = 'not_available';
    } else {
      fiber_status = 'not_available';
    }

    return Response.json({
      fiber_status,
      frontier_fiber: frontierFiber.length > 0,
      frontier_present: frontierProviders.length > 0,
      frontier_providers: frontierProviders.map(p => ({
        name: p.brand_name || p.doing_business_as,
        technology: p.technology,
        max_down: p.max_advertised_download_speed,
        max_up: p.max_advertised_upload_speed,
      })),
      total_providers: providers.length,
    });
  } catch (error) {
    return Response.json({ fiber_status: 'unknown', error: error.message }, { status: 500 });
  }
});