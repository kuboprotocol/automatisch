import { GRAPH_BASE } from '../../helpers/meta-graph.js';

/** IDs das contas do WhatsApp Business liberadas no login (granular_scopes). */
export async function discoverWabas($) {
  const { data } = await $.http.get(`${GRAPH_BASE}/debug_token`, {
    params: {
      input_token: $.auth.data.accessToken,
      access_token: `${$.auth.data.clientId}|${$.auth.data.clientSecret}`,
    },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  const ids = new Set();
  for (const g of data.data?.granular_scopes || []) {
    if (g.scope === 'whatsapp_business_management' || g.scope === 'whatsapp_business_messaging') {
      for (const id of g.target_ids || []) ids.add(String(id));
    }
  }
  await $.auth.set({ wabaIds: [...ids].join(',') });
  return [...ids];
}

export async function wabaIds($) {
  const saved = String($.auth.data.wabaIds || '').split(',').filter(Boolean);
  return saved.length ? saved : discoverWabas($);
}

export async function listPhoneNumbers($) {
  const out = [];
  for (const waba of await wabaIds($)) {
    const { data } = await $.http.get(`${GRAPH_BASE}/${waba}/phone_numbers`, {
      params: { fields: 'id,display_phone_number,verified_name,quality_rating' },
    });
    for (const p of data.data || []) out.push({ ...p, wabaId: waba });
  }
  return out;
}

export async function listTemplates($, wabaId) {
  const ids = wabaId ? [wabaId] : await wabaIds($);
  const out = [];
  for (const waba of ids) {
    const { data } = await $.http.get(`${GRAPH_BASE}/${waba}/message_templates`, {
      params: { fields: 'id,name,language,status,category', limit: 100 },
    });
    for (const t of data.data || []) out.push({ ...t, wabaId: waba });
  }
  return out;
}

export function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}
