// Cloudflare: OAuth 2.0 self-managed (Authorization Code com client secret, client_secret_post).
// Docs: https://developers.cloudflare.com/fundamentals/oauth/ — endpoints em dash.cloudflare.com/oauth2/*.
// A API (v4) aceita o access token do OAuth como Bearer, igual a um API token.
export const CLOUDFLARE_OAUTH = 'https://dash.cloudflare.com/oauth2';
export const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';

// Precisam estar cadastrados no cliente OAuth (Manage Account > OAuth clients). offline_access traz o refresh token.
export const CLOUDFLARE_SCOPES = [
  'user-details.read',
  'account-settings.read',
  'memberships.read',
  'zone.read',
  'dns.read',
  'dns.write',
  'workers-scripts.read',
  'workers-scripts.write',
  'workers-routes.write',
  'workers-kv-storage.write',
  'page.write',
  'cache.purge',
  'offline_access',
];

export function cloudflareAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) requestConfig.headers.Authorization = `Bearer ${$.auth.data.accessToken}`;
  return requestConfig;
}

/** Resposta padrão da API v4: { success, errors, result }. Devolve result ou lança o erro legível. */
export function unwrap(data) {
  if (data && data.success === false) {
    const msg = (data.errors || []).map((e) => `${e.code}: ${e.message}`).join('; ') || 'request failed';
    throw new Error(`Cloudflare: ${msg}`);
  }
  return data?.result ?? data;
}

export async function cfGet($, path, params) {
  const { data } = await $.http.get(`${CLOUDFLARE_API}${path}`, params ? { params } : undefined);
  return unwrap(data);
}

export async function getUser($) {
  return cfGet($, '/user');
}

/** Só IDs no formato da Cloudflare (32 hex), para não montar caminhos com texto do usuário. */
export function cfId(value, label) {
  const v = String(value ?? '').trim();
  if (!/^[0-9a-f]{32}$/i.test(v)) throw new Error(`Cloudflare: ${label} inválido (esperado ID de 32 caracteres hexadecimais)`);
  return v;
}

export const DNS_TYPES = ['A', 'AAAA', 'CNAME', 'TXT', 'MX', 'NS', 'SRV', 'CAA'];

export function buildDnsRecord({ type, name, content, ttl, proxied, priority, comment }) {
  const t = String(type || '').toUpperCase();
  if (!DNS_TYPES.includes(t)) throw new Error(`Cloudflare: tipo de registro não suportado (${type})`);
  if (!name || !content) throw new Error('Cloudflare: nome e conteúdo do registro são obrigatórios');
  const n = Number(ttl);
  const record = {
    type: t,
    name: String(name).trim(),
    content: String(content).trim(),
    ttl: Number.isFinite(n) && n >= 60 ? Math.floor(n) : 1,
  };
  if (['A', 'AAAA', 'CNAME'].includes(t)) record.proxied = proxied === true || proxied === 'true';
  if (t === 'MX' && priority !== undefined && priority !== '') record.priority = Number(priority);
  if (comment) record.comment = String(comment).slice(0, 100);
  return record;
}
