import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process pin_updated actions
    if (data?.action !== 'pin_updated') {
      return Response.json({ success: true });
    }

    // Get all admin users
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    // Send notification email to each admin
    const promises = admins.map(admin =>
      base44.integrations.Core.SendEmail({
        to: admin.email,
        from_name: 'Field Canvassing App',
        subject: 'Pin Status Updated',
        body: `
          <h2>Pin Status Update</h2>
          <p><strong>Rep:</strong> ${data.rep_name || data.rep_email}</p>
          <p><strong>Update:</strong> ${data.detail}</p>
          <p><strong>Status:</strong> ${data.meta?.status || 'Unknown'}</p>
          <p>Log time: ${new Date().toLocaleString()}</p>
        `
      }).catch(err => console.error(`Failed to notify ${admin.email}:`, err))
    );

    await Promise.all(promises);

    return Response.json({ success: true, notified: admins.length });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});