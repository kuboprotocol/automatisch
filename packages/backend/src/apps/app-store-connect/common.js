// App Store Connect API (Apple). A Apple NÃO oferece OAuth para terceiros: o acesso é por
// chave de API do time (Issuer ID + Key ID + arquivo .p8), que assina um JWT ES256 de até 20 min.
// A chave fica só no servidor do motor (dados da conexão criptografados), nunca no navegador.
import crypto from 'node:crypto';

export const ASC_API = 'https://api.appstoreconnect.apple.com';
const ASC_HOST = 'api.appstoreconnect.apple.com';

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

/**
 * Reconstrói o PEM do .p8 mesmo se o usuário colou numa linha só (o <input> tira as quebras)
 * ou com espaços. Aceita com ou sem o cabeçalho BEGIN/END PRIVATE KEY.
 */
export function normalizeP8(value) {
  const raw = String(value || '')
    .replace(/\\n/g, '\n')
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, '')
    .replace(/-----END [A-Z ]*PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  if (!raw || !/^[A-Za-z0-9+/=]+$/.test(raw)) throw new Error('Private key (.p8) inválida: cole o conteúdo do arquivo AuthKey_XXXX.p8');
  const lines = raw.match(/.{1,64}/g).join('\n');
  return `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
}

export function validateIds({ issuerId, keyId }) {
  const iss = String(issuerId || '').trim();
  const kid = String(keyId || '').trim();
  if (!/^[0-9a-fA-F-]{36}$/.test(iss)) throw new Error('Issuer ID inválido (formato UUID, em Usuários e Acesso → Integrações → App Store Connect API)');
  if (!/^[A-Z0-9]{10}$/.test(kid)) throw new Error('Key ID inválido (10 letras/números, ex.: 2X9R4HXF34)');
  return { iss, kid };
}

/** JWT ES256 do App Store Connect (aud appstoreconnect-v1, validade 20 min). */
export function ascToken({ issuerId, keyId, privateKey }, now = Math.floor(Date.now() / 1000)) {
  const { iss, kid } = validateIds({ issuerId, keyId });
  const header = { alg: 'ES256', kid, typ: 'JWT' };
  const payload = { iss, iat: now, exp: now + 19 * 60, aud: 'appstoreconnect-v1' };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const key = crypto.createPrivateKey(normalizeP8(privateKey));
  const sig = crypto.sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' });
  return `${input}.${b64url(sig)}`;
}

/** beforeRequest: JWT só para o host da Apple (nunca vaza para outro domínio). */
export function ascAddAuth($, requestConfig) {
  const url = new URL(requestConfig.url || '', requestConfig.baseURL || ASC_API);
  if (url.host !== ASC_HOST) return requestConfig;
  requestConfig.headers = requestConfig.headers || {};
  requestConfig.headers.Authorization = `Bearer ${ascToken($.auth.data)}`;
  return requestConfig;
}

export function ascId(value, label = 'ID') {
  const v = String(value || '').trim();
  if (!/^[A-Za-z0-9-]{1,64}$/.test(v)) throw new Error(`${label} inválido`);
  return v;
}

export function ascErrorText(error) {
  const status = error?.response?.status;
  const e = error?.response?.data?.errors?.[0];
  if (status === 401) return 'chave recusada (401). Confira Issuer ID, Key ID e o arquivo .p8, e se a chave não foi revogada.';
  if (status === 403) return `a chave não tem permissão para isto (403). Use uma chave de time com papel App Manager ou Admin.${e?.detail ? ` Detalhe: ${e.detail}` : ''}`;
  return e ? `${e.title || ''}${e.detail ? `: ${e.detail}` : ''}`.trim() : null;
}

export async function withAscErrors(fn) {
  try {
    return await fn();
  } catch (error) {
    const text = ascErrorText(error);
    if (text) throw new Error(`App Store Connect: ${text}`);
    throw error;
  }
}

export async function listApps($, limit = 200) {
  const { data } = await $.http.get(`${ASC_API}/v1/apps`, {
    params: { limit, 'fields[apps]': 'name,bundleId,sku,primaryLocale' },
  });
  return (data.data || []).map((a) => ({ id: a.id, name: a.attributes?.name, bundleId: a.attributes?.bundleId, sku: a.attributes?.sku }));
}

export async function listBuilds($, appId) {
  const { data } = await $.http.get(`${ASC_API}/v1/builds`, {
    params: { 'filter[app]': ascId(appId, 'App ID'), sort: '-uploadedDate', limit: 50, 'fields[builds]': 'version,uploadedDate,processingState,expired,minOsVersion' },
  });
  return (data.data || []).map((b) => ({ id: b.id, ...b.attributes }));
}

export async function listCustomerReviews($, appId) {
  const { data } = await $.http.get(`${ASC_API}/v1/apps/${ascId(appId, 'App ID')}/customerReviews`, {
    params: { sort: '-createdDate', limit: 100, include: 'response' },
  });
  const responses = new Map((data.included || []).filter((i) => i.type === 'customerReviewResponses').map((i) => [i.id, i.attributes]));
  return (data.data || []).map((r) => {
    const respId = r.relationships?.response?.data?.id;
    return {
      id: r.id,
      rating: r.attributes?.rating,
      title: r.attributes?.title,
      body: r.attributes?.body,
      reviewer: r.attributes?.reviewerNickname,
      territory: r.attributes?.territory,
      createdDate: r.attributes?.createdDate,
      response: respId ? responses.get(respId)?.responseBody ?? null : null,
    };
  });
}
