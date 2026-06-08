// api/frappe.js — Frappe CRM serverless function for DealAI
// Handles: leads, contacts, deals (CRM Deal doctype)

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const FRAPPE_URL = process.env.FRAPPE_URL;
  const FRAPPE_API_KEY = process.env.FRAPPE_API_KEY;
  const FRAPPE_API_SECRET = process.env.FRAPPE_API_SECRET;

  if (!FRAPPE_URL || !FRAPPE_API_KEY || !FRAPPE_API_SECRET) {
    return res.status(500).json({ error: 'Frappe credentials not configured' });
  }

  const authHeader = `token ${FRAPPE_API_KEY}:${FRAPPE_API_SECRET}`;

  const { action } = req.query;

  try {
    // ── FETCH ALL CRM DATA ──────────────────────────────────────────────
    if (action === 'sync' || !action) {
      const [leadsRes, contactsRes, dealsRes] = await Promise.all([
        // Leads
        fetch(`${FRAPPE_URL}/api/resource/CRM Lead?fields=["name","lead_name","email_id","mobile_no","status","lead_owner","source","territory","annual_revenue","company","industry","creation","modified"]&limit=100&order_by=modified desc`, {
          headers: { Authorization: authHeader }
        }),
        // Contacts
        fetch(`${FRAPPE_URL}/api/resource/Contact?fields=["name","first_name","last_name","email_id","mobile_no","company_name","designation","creation","modified"]&limit=100&order_by=modified desc`, {
          headers: { Authorization: authHeader }
        }),
        // CRM Deals
        fetch(`${FRAPPE_URL}/api/resource/CRM Deal?fields=["name","deal_name","status","deal_owner","annual_revenue","currency","probability","expected_closing_date","organization","territory","creation","modified"]&limit=100&order_by=modified desc`, {
          headers: { Authorization: authHeader }
        }),
      ]);

      const [leadsData, contactsData, dealsData] = await Promise.all([
        leadsRes.json(),
        contactsRes.json(),
        dealsRes.json(),
      ]);

      return res.status(200).json({
        success: true,
        synced_at: new Date().toISOString(),
        leads: leadsData.data || [],
        contacts: contactsData.data || [],
        deals: dealsData.data || [],
        counts: {
          leads: (leadsData.data || []).length,
          contacts: (contactsData.data || []).length,
          deals: (dealsData.data || []).length,
        }
      });
    }

    // ── FETCH SINGLE LEAD ───────────────────────────────────────────────
    if (action === 'lead') {
      const { id } = req.query;
      const r = await fetch(`${FRAPPE_URL}/api/resource/CRM Lead/${id}`, {
        headers: { Authorization: authHeader }
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data.data });
    }

    // ── FETCH SINGLE DEAL ───────────────────────────────────────────────
    if (action === 'deal') {
      const { id } = req.query;
      const r = await fetch(`${FRAPPE_URL}/api/resource/CRM Deal/${id}`, {
        headers: { Authorization: authHeader }
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data.data });
    }

    // ── UPDATE DEAL STATUS ──────────────────────────────────────────────
    if (action === 'update_deal' && req.method === 'POST') {
      const { id, status } = req.body;
      const r = await fetch(`${FRAPPE_URL}/api/resource/CRM Deal/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      const data = await r.json();
      return res.status(200).json({ success: true, data: data.data });
    }

    return res.status(400).json({ error: 'Unknown action' });

  } catch (err) {
    console.error('Frappe API error:', err);
    return res.status(500).json({ error: err.message || 'Frappe API failed' });
  }
}
