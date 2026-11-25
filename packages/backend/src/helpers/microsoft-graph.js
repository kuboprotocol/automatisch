// Microsoft identity platform (v2) + Microsoft Graph para os apps Outlook,
// Microsoft 365 (OneDrive e To Do) e Microsoft Teams do Vertal. Um cliente OAuth
// só ("Vertal Dev", multilocatário + contas pessoais); cada app pede os escopos dele.
import { URLSearchParams } from 'node:url';
import { newState, redirectField, redirectUri, textField } from './vertal-app-kit.js';

export const GRAPH = 'https://graph.microsoft.com/v1.0';
const LOGIN = 'https://login.microsoftonline.com';
const BASE_SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.Read'];

export function msScopes(extra) {
  return [...BASE_SCOPES, ...extra].join(' ');
}

async function tokenRequest($, { tenant, scope }, params) {
  const body = new URLSearchParams({
    ...params,
    client_id: $.auth.data.clientId,
    client_secret: $.auth.data.clientSecret,
    scope,
  });
  const { data } = await $.http.post(`${LOGIN}/${tenant}/oauth2/v2.0/token`, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  await $.auth.set({
    accessToken: data.access_token,
    // o Microsoft gira o refresh token: guarda sempre o mais novo
    refreshToken: data.refresh_token || $.auth.data.refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope,
    code: null,
  });
}

export async function graphMe($) {
  const { data } = await $.http.get(`${GRAPH}/me`, {
    params: { $select: 'id,displayName,mail,userPrincipalName' },
  });
  return data;
}

/**
 * Auth de um app Microsoft. tenant: 'common' (trabalho/escola + pessoais) ou
 * 'organizations' (só trabalho/escola, ex. Teams).
 */
export function microsoftAuth(appKey, scopes, { tenant = 'common' } = {}) {
  const scope = msScopes(scopes);
  const cfg = { tenant, scope };
  return {
    fields: [
      redirectField(appKey),
      textField('clientId', 'Application (client) ID'),
      textField('clientSecret', 'Client secret (value)'),
    ],

    async generateAuthUrl($) {
      const params = new URLSearchParams({
        client_id: $.auth.data.clientId,
        response_type: 'code',
        response_mode: 'query',
        redirect_uri: redirectUri($),
        scope,
        state: newState(),
        prompt: 'select_account',
      });
      await $.auth.set({ url: `${LOGIN}/${tenant}/oauth2/v2.0/authorize?${params.toString()}` });
    },

    async verifyCredentials($) {
      if ($.auth.data.error) {
        throw new Error(`Microsoft: ${$.auth.data.error_description || $.auth.data.error}`);
      }
      if (!$.auth.data.code) throw new Error('Missing authorization code');
      await tokenRequest($, cfg, {
        grant_type: 'authorization_code',
        code: $.auth.data.code,
        redirect_uri: redirectUri($),
      });
      const me = await graphMe($);
      const email = me.mail || me.userPrincipalName;
      await $.auth.set({
        userId: me.id,
        email,
        screenName: [me.displayName, email].filter(Boolean).join(' · ') || 'Microsoft',
      });
    },

    async refreshToken($) {
      await tokenRequest($, cfg, { grant_type: 'refresh_token', refresh_token: $.auth.data.refreshToken });
    },

    async isStillVerified($) {
      const me = await graphMe($);
      return !!me?.id;
    },
  };
}

export function graphAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) {
    requestConfig.headers.Authorization = `Bearer ${$.auth.data.accessToken}`;
  }
  return requestConfig;
}

/** Lista do Graph seguindo @odata.nextLink até `max`. */
export async function graphList($, path, params = {}, max = 50, headers = undefined) {
  const out = [];
  let url = path.startsWith('http') ? path : `${GRAPH}${path}`;
  let query = params;
  while (url && out.length < max) {
    const { data } = await $.http.get(url, { params: query, ...(headers ? { headers } : {}) });
    out.push(...(data.value || []));
    url = data['@odata.nextLink'] || null;
    query = undefined;
  }
  return out.slice(0, max);
}

export function clampTop(value, def = 10, max = 50) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n) || n <= 0) return def;
  return Math.min(n, max);
}

/** "a@x.com, b@y.com" → recipients do Graph. */
export function recipients(value) {
  return String(value || '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

export function enc(id) {
  return encodeURIComponent(String(id));
}

/** Caminho do OneDrive: "Pasta/Sub/arquivo.txt" (sem barra inicial). */
export function drivePath(value) {
  return String(value || '')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}
