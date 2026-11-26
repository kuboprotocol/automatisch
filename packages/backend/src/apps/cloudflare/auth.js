import { URLSearchParams } from 'node:url';
import { newState, redirectField, redirectUri, textField } from '../../helpers/vertal-app-kit.js';
import { CLOUDFLARE_OAUTH, CLOUDFLARE_SCOPES, getUser } from './common.js';

async function exchange($, params) {
  const { data } = await $.http.post(`${CLOUDFLARE_OAUTH}/token`, new URLSearchParams(params).toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  return data;
}

function tokenFields(data) {
  return {
    accessToken: data.access_token,
    tokenType: data.token_type || 'bearer',
    expiresIn: data.expires_in,
    // A Cloudflare gira o refresh token a cada uso: sempre guardar o novo.
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    ...(data.scope ? { scope: data.scope } : {}),
  };
}

export default {
  fields: [redirectField('cloudflare'), textField('clientId', 'Client ID'), textField('clientSecret', 'Client Secret')],

  async generateAuthUrl($) {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: $.auth.data.clientId,
      redirect_uri: redirectUri($),
      state: newState(),
      scope: CLOUDFLARE_SCOPES.join(' '),
    });
    await $.auth.set({ url: `${CLOUDFLARE_OAUTH}/auth?${params.toString()}` });
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
    const user = await getUser($);
    await $.auth.set({ userId: user?.id, screenName: user?.email || 'Cloudflare' });
  },

  async isStillVerified($) {
    const user = await getUser($);
    return !!user?.id;
  },

  async refreshToken($) {
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
