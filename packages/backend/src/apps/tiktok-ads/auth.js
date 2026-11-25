import { URLSearchParams } from 'node:url';
import { newState, redirectField, redirectUri, textField } from '../../helpers/vertal-app-kit.js';
import { TIKTOK_API, unwrap } from './common.js';

async function me($) {
  return unwrap(await $.http.get(`${TIKTOK_API}/user/info/`));
}

export default {
  fields: [redirectField('tiktok-ads'), textField('clientId', 'App ID'), textField('clientSecret', 'Secret')],

  async generateAuthUrl($) {
    const params = new URLSearchParams({
      app_id: $.auth.data.clientId,
      state: newState(),
      redirect_uri: redirectUri($),
    });
    await $.auth.set({ url: `https://business-api.tiktok.com/portal/auth?${params.toString()}` });
  },

  async verifyCredentials($) {
    const authCode = $.auth.data.auth_code || $.auth.data.code;
    if (!authCode) throw new Error('Missing authorization code');
    const data = unwrap(
      await $.http.post(
        `${TIKTOK_API}/oauth2/access_token/`,
        { app_id: $.auth.data.clientId, secret: $.auth.data.clientSecret, auth_code: authCode },
        { additionalProperties: { skipAddingAuthHeader: true } }
      )
    );
    await $.auth.set({
      accessToken: data.access_token,
      scope: Array.isArray(data.scope) ? data.scope.join(',') : data.scope,
      advertiserIds: (data.advertiser_ids || []).join(','),
      code: null,
      auth_code: null,
    });
    let screenName = 'TikTok Ads';
    try {
      const u = await me($);
      screenName = u.display_name || u.email || screenName;
    } catch {
      // sem permissão de perfil: fica o nome padrão
    }
    const n = (data.advertiser_ids || []).length;
    await $.auth.set({ screenName: `${screenName} · ${n} ad account${n === 1 ? '' : 's'}` });
  },

  async isStillVerified($) {
    const u = await me($);
    return !!u;
  },
};
