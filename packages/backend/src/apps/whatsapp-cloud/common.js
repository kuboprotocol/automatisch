import { GRAPH_BASE } from '../../helpers/meta-graph.js';

export const PHONE_FIELDS = 'id,display_phone_number,verified_name,quality_rating,code_verification_status,platform_type,throughput';

export function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

export function onlyId(value) {
  const id = String(value || '').trim();
  if (!/^\d{5,25}$/.test(id)) throw new Error('Invalid ID: use only the numeric ID shown by Meta.');
  return id;
}

export async function phoneNumberInfo($, phoneNumberId) {
  const id = onlyId(phoneNumberId || $.auth.data.phoneNumberId);
  const { data } = await $.http.get(`${GRAPH_BASE}/${id}`, { params: { fields: PHONE_FIELDS } });
  return data;
}

export async function wabaInfo($) {
  const id = onlyId($.auth.data.wabaId);
  const { data } = await $.http.get(`${GRAPH_BASE}/${id}`, { params: { fields: 'id,name,currency,timezone_id' } });
  return data;
}

function needWaba($) {
  if (!$.auth.data.wabaId) {
    throw new Error('Add the WhatsApp Business Account ID to this connection to list templates and numbers.');
  }
  return onlyId($.auth.data.wabaId);
}

export async function listPhoneNumbers($) {
  const waba = needWaba($);
  const { data } = await $.http.get(`${GRAPH_BASE}/${waba}/phone_numbers`, {
    params: { fields: 'id,display_phone_number,verified_name,quality_rating' },
  });
  return data.data || [];
}

export async function listTemplates($) {
  const waba = needWaba($);
  const { data } = await $.http.get(`${GRAPH_BASE}/${waba}/message_templates`, {
    params: { fields: 'id,name,language,status,category', limit: 100 },
  });
  return data.data || [];
}

/** Erros comuns do Graph/WhatsApp com explicação de o que fazer. */
const HINTS = {
  190: 'The access token is invalid or expired. Generate a permanent system user token.',
  100: 'Meta did not accept a parameter (check the phone number ID / account ID and the token permissions).',
  10: 'The token lacks permission. Give it whatsapp_business_messaging and whatsapp_business_management.',
  200: 'The token lacks permission. Give it whatsapp_business_messaging and whatsapp_business_management.',
  131030: 'This recipient is not in the allowed list of the test number. Add it in WhatsApp → API Setup → "To" (up to 5 numbers) or verify your business.',
  131047: 'More than 24 hours since the customer last wrote: send an approved template instead of free text.',
  132001: 'Template not found for this name and language (it must be approved in your WhatsApp account).',
  131026: 'The message could not be delivered to this number (it may not be on WhatsApp).',
};

export function friendlyGraphError(error) {
  const g = error?.details?.error || error?.response?.data?.error;
  if (!g || typeof g !== 'object') return error;
  const code = g.error_subcode && HINTS[g.error_subcode] ? g.error_subcode : g.code;
  const hint = HINTS[code];
  const base = g.error_user_msg || g.message || 'WhatsApp request failed';
  const e = new Error(hint ? `${hint} (Meta ${g.code}: ${base})` : `Meta ${g.code ?? ''}: ${base}`.trim());
  e.details = { error: { code: g.code, message: base, ...(hint ? { hint } : {}) } };
  return e;
}
