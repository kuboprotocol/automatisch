import { URLSearchParams } from 'node:url';
import { newState, redirectField, redirectUri, textField } from '../../helpers/vertal-app-kit.js';
import { mapi } from './common.js';

const OAUTH = 'https://business.kwai.com/oauth';

async function token($, params) {
  const { data } = await $.http.get(`${OAUTH}/token`, {
    params: { ...params, client_id: $.auth.data.clientId, client_secret: $.auth.data.clientSecret },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  if (!data?.access_token) throw new Error(`Kwai: ${data?.error_description || data?.error || 'token request failed'}`);
  await $.auth.set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || $.auth.data.refreshToken,
    expiresIn: data.expires_in,
    scope: data.scope,
    code: null,
  });
}

export default {
  fields: [redirectField('kwai-ads'), textField('clientId', 'App ID (client id)'), textField('clientSecret', 'Secret ID')],

  async generateAuthUrl($) {
    const params = new URLSearchParams({
      client_id: $.auth.data.clientId,
      response_type: 'code',
      redirect_uri: redirectUri($),
      state: newState(),
    });
    await $.auth.set({ url: `${OAUTH}/authorize?${params.toString()}` });
  },

  async verifyCredentials($) {
    if (!$.auth.data.code) throw new Error('Missing authorization code');
    await token($, { grant_type: 'authorization_code', code: $.auth.data.code, redirect_uri: redirectUri($) });
    let n = 0;
    try {
      const data = await mapi($, '/rest/n/mapi/report/crmAccountQueryByAgentOrCorp', {});
      n = Array.isArray(data) ? data.length : (data?.list || data?.accounts || []).length;
    } catch {
      // conta sem permissão de relatório ainda
    }
    await $.auth.set({ screenName: `Kwai Ads · ${n} account${n === 1 ? '' : 's'}` });
  },

  async refreshToken($) {
    await token($, { grant_type: 'refresh_token', refresh_token: $.auth.data.refreshToken });
  },

  async isStillVerified($) {
    await mapi($, '/rest/n/mapi/report/crmAccountQueryByAgentOrCorp', {});
    return true;
  },
};
