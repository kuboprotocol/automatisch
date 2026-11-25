// Graph API da Meta (Facebook, Instagram, WhatsApp, Meta Ads): login, troca de token e
// chamadas comuns. Um app da Meta ("Vertal Dev") cobre os quatro conectores.
import { URLSearchParams } from 'node:url';
import { newState, redirectUri, redirectField, textField } from './vertal-app-kit.js';

export const GRAPH_VERSION = 'v23.0';
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function metaAuthFields(appKey) {
  return [
    redirectField(appKey),
    textField('clientId', 'App ID'),
    textField('clientSecret', 'App Secret'),
    textField('configId', 'Login configuration ID (Facebook Login for Business)', {
      required: false,
      description: 'Optional. When set, the login uses this configuration instead of the scope list.',
    }),
  ];
}

export function metaAuthUrl(scopes) {
  return async ($) => {
    const params = new URLSearchParams({
      client_id: $.auth.data.clientId,
      redirect_uri: redirectUri($),
      state: newState(),
      response_type: 'code',
    });
    if ($.auth.data.configId) params.set('config_id', $.auth.data.configId);
    else params.set('scope', scopes.join(','));
    await $.auth.set({
      url: `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`,
    });
  };
}

/** Código → token curto → token longo (60 dias). Devolve {accessToken, expiresIn}. */
export async function metaExchangeCode($) {
  if (!$.auth.data.code) throw new Error('Missing authorization code');
  const short = await $.http.get(`${GRAPH_BASE}/oauth/access_token`, {
    params: {
      client_id: $.auth.data.clientId,
      client_secret: $.auth.data.clientSecret,
      redirect_uri: redirectUri($),
      code: $.auth.data.code,
    },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  let token = short.data.access_token;
  let expiresIn = short.data.expires_in;
  try {
    const long = await $.http.get(`${GRAPH_BASE}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: $.auth.data.clientId,
        client_secret: $.auth.data.clientSecret,
        fb_exchange_token: token,
      },
      additionalProperties: { skipAddingAuthHeader: true },
    });
    token = long.data.access_token || token;
    expiresIn = long.data.expires_in || expiresIn;
  } catch {
    // fica com o token curto
  }
  await $.auth.set({ accessToken: token, expiresIn, code: null });
  return token;
}

export async function metaMe($) {
  const { data } = await $.http.get(`${GRAPH_BASE}/me`, { params: { fields: 'id,name' } });
  return data;
}

export function metaAuth(appKey, scopes, { afterVerify } = {}) {
  return {
    fields: metaAuthFields(appKey),
    generateAuthUrl: metaAuthUrl(scopes),
    async verifyCredentials($) {
      await metaExchangeCode($);
      const me = await metaMe($);
      await $.auth.set({ userId: me.id, screenName: me.name || me.id });
      if (afterVerify) await afterVerify($, me);
    },
    async isStillVerified($) {
      const me = await metaMe($);
      return !!me?.id;
    },
  };
}

export function metaAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) {
    requestConfig.headers.Authorization = `Bearer ${$.auth.data.accessToken}`;
  }
  return requestConfig;
}

/** Lista paginada do Graph (segue paging.next até `max`). */
export async function graphList($, path, params = {}, max = 100) {
  const out = [];
  let url = path.startsWith('http') ? path : `${GRAPH_BASE}${path}`;
  let query = { limit: 50, ...params };
  while (url && out.length < max) {
    const { data } = await $.http.get(url, { params: query });
    out.push(...(data.data || []));
    url = data.paging?.next || null;
    query = undefined;
  }
  return out.slice(0, max);
}

/** Páginas do usuário, com token da página. */
export async function listPages($) {
  return graphList($, '/me/accounts', {
    fields: 'id,name,category,access_token,instagram_business_account{id,username,name}',
  });
}

export async function pageToken($, pageId) {
  const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent(pageId)}`, {
    params: { fields: 'access_token' },
  });
  if (!data.access_token) throw new Error('No access to this Page');
  return data.access_token;
}

export function stripPageTokens(pages) {
  return pages.map(({ access_token, ...rest }) => rest);
}
