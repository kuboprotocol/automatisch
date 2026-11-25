// OAuth do Google para os apps de anúncios do Vertal (Google Ads, AdMob, AdSense).
// Um cliente só ("Vertal Fluxos" no Google Cloud); cada app pede os escopos dele.
// O retorno do login cai em https://vertal.dev/fluxos/oauth/<app> (white-label).
import { URLSearchParams } from 'node:url';
import { newState, redirectField, redirectUri, textField } from './vertal-app-kit.js';

const AUTH = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN = 'https://oauth2.googleapis.com/token';
const USERINFO = 'https://openidconnect.googleapis.com/v1/userinfo';
const BASE_SCOPES = ['openid', 'email', 'profile'];

export function googleScopes(extra) {
  return [...BASE_SCOPES, ...extra].join(' ');
}

async function tokenRequest($, params) {
  const body = new URLSearchParams({
    ...params,
    client_id: $.auth.data.clientId,
    client_secret: $.auth.data.clientSecret,
  });
  const { data } = await $.http.post(TOKEN, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  await $.auth.set({
    accessToken: data.access_token,
    // o Google só manda refresh_token no primeiro consentimento: guarda o antigo
    refreshToken: data.refresh_token || $.auth.data.refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    scope: data.scope || $.auth.data.scope,
    code: null,
  });
}

export async function googleUserInfo($) {
  const { data } = await $.http.get(USERINFO);
  return data;
}

/** Auth de um app Google (OAuth web, offline). extraFields: campos a mais (ex.: Google Ads). */
export function googleAuth(appKey, scopes, { extraFields = [], afterVerify } = {}) {
  const scope = googleScopes(scopes);
  return {
    fields: [
      redirectField(appKey),
      textField('clientId', 'Client ID'),
      textField('clientSecret', 'Client Secret'),
      ...extraFields,
    ],

    async generateAuthUrl($) {
      const params = new URLSearchParams({
        client_id: $.auth.data.clientId,
        redirect_uri: redirectUri($),
        response_type: 'code',
        scope,
        access_type: 'offline',
        prompt: 'select_account consent',
        include_granted_scopes: 'true',
        state: newState(),
      });
      await $.auth.set({ url: `${AUTH}?${params.toString()}` });
    },

    async verifyCredentials($) {
      if ($.auth.data.error) throw new Error(`Google: ${$.auth.data.error_description || $.auth.data.error}`);
      if (!$.auth.data.code) throw new Error('Missing authorization code');
      await tokenRequest($, {
        grant_type: 'authorization_code',
        code: $.auth.data.code,
        redirect_uri: redirectUri($),
      });
      const me = await googleUserInfo($);
      const extra = afterVerify ? await afterVerify($).catch(() => '') : '';
      await $.auth.set({
        userId: me.sub,
        email: me.email,
        screenName: [me.name, me.email].filter(Boolean).join(' · ') + (extra ? ` · ${extra}` : ''),
      });
    },

    async refreshToken($) {
      await tokenRequest($, { grant_type: 'refresh_token', refresh_token: $.auth.data.refreshToken });
    },

    async isStillVerified($) {
      const me = await googleUserInfo($);
      return !!me?.sub;
    },
  };
}

export function googleAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) requestConfig.headers.Authorization = `Bearer ${$.auth.data.accessToken}`;
  return requestConfig;
}

/** "YYYY-MM-DD" → { year, month, day } (datas das APIs AdMob/AdSense). */
export function gDate(value) {
  const [year, month, day] = String(value).split('-').map((n) => parseInt(n, 10));
  return { year, month, day };
}

export function dayOffset(offsetDays = 0) {
  return new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10);
}

export function isDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}
