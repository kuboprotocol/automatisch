import { URLSearchParams } from 'node:url';
import { newState, redirectField, redirectUri, textField } from '../../helpers/vertal-app-kit.js';
import { LINKEDIN_OAUTH, LINKEDIN_SCOPES, getUserInfo, personUrn } from './common.js';

async function exchange($, params) {
  const { data } = await $.http.post(`${LINKEDIN_OAUTH}/accessToken`, new URLSearchParams(params).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  return data;
}

function tokenFields(data) {
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    ...(data.scope ? { scope: data.scope } : {}),
  };
}

export default {
  fields: [redirectField('linkedin'), textField('clientId', 'Client ID'), textField('clientSecret', 'Client Secret')],

  async generateAuthUrl($) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: $.auth.data.clientId,
      redirect_uri: redirectUri($),
      state: newState(),
      scope: LINKEDIN_SCOPES.join(' '),
    });
    await $.auth.set({ url: `${LINKEDIN_OAUTH}/authorization?${params.toString()}` });
  },

  async verifyCredentials($) {
    if (!$.auth.data.code) throw new Error('Missing authorization code');
    const data = await exchange($, {
      grant_type: 'authorization_code',
      code: $.auth.data.code,
      redirect_uri: redirectUri($),
      client_id: $.auth.data.clientId,
      client_secret: $.auth.data.clientSecret,
    });
    await $.auth.set({ ...tokenFields(data), code: null });
    const me = await getUserInfo($);
    await $.auth.set({
      personUrn: personUrn(me.sub),
      screenName: me.name || me.email || 'LinkedIn',
    });
  },

  async isStillVerified($) {
    const me = await getUserInfo($);
    return !!me?.sub;
  },

  // Refresh token só existe para parceiros aprovados pelo LinkedIn; sem ele, o token vale 60 dias.
  async refreshToken($) {
    // Sem refresh token: não faz nada; a nova tentativa devolve o erro real (ex.: 401 → reconectar).
    if (!$.auth.data.refreshToken) return;
    const data = await exchange($, {
      grant_type: 'refresh_token',
      refresh_token: $.auth.data.refreshToken,
      client_id: $.auth.data.clientId,
      client_secret: $.auth.data.clientSecret,
    });
    await $.auth.set(tokenFields(data));
  },
};
