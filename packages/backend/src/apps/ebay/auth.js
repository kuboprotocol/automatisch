import { URLSearchParams } from 'node:url';
import { dropdownField, newState, redirectField, textField } from '../../helpers/vertal-app-kit.js';
import { identityBase, isSandbox } from './common.js';

export const EBAY_SCOPES = [
  'https://api.ebay.com/oauth/api_scope',
  'https://api.ebay.com/oauth/api_scope/sell.inventory',
  'https://api.ebay.com/oauth/api_scope/sell.account',
  'https://api.ebay.com/oauth/api_scope/sell.fulfillment',
  'https://api.ebay.com/oauth/api_scope/commerce.identity.readonly',
];

function tokenUrl($) {
  return isSandbox($)
    ? 'https://api.sandbox.ebay.com/identity/v1/oauth2/token'
    : 'https://api.ebay.com/identity/v1/oauth2/token';
}

async function tokenRequest($, params) {
  const basic = Buffer.from(`${$.auth.data.clientId}:${$.auth.data.clientSecret}`).toString('base64');
  const { data } = await $.http.post(tokenUrl($), new URLSearchParams(params).toString(), {
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  await $.auth.set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || $.auth.data.refreshToken,
    expiresIn: data.expires_in,
    refreshTokenExpiresIn: data.refresh_token_expires_in ?? $.auth.data.refreshTokenExpiresIn,
    code: null,
  });
}

async function me($) {
  const { data } = await $.http.get(`${identityBase($)}/commerce/identity/v1/user/`);
  return data;
}

export default {
  fields: [
    redirectField('ebay'),
    textField('clientId', 'App ID (Client ID)'),
    textField('clientSecret', 'Cert ID (Client Secret)'),
    textField('ruName', 'RuName (eBay redirect URL name)'),
    dropdownField(
      'environment',
      'Environment',
      [
        { label: 'Production', value: 'production' },
        { label: 'Sandbox', value: 'sandbox' },
      ],
      'production'
    ),
  ],

  async generateAuthUrl($) {
    const params = new URLSearchParams({
      client_id: $.auth.data.clientId,
      redirect_uri: $.auth.data.ruName,
      response_type: 'code',
      scope: EBAY_SCOPES.join(' '),
      state: newState(),
    });
    const host = isSandbox($) ? 'https://auth.sandbox.ebay.com' : 'https://auth.ebay.com';
    await $.auth.set({ url: `${host}/oauth2/authorize?${params.toString().replace(/\+/g, '%20')}` });
  },

  async verifyCredentials($) {
    if (!$.auth.data.code) throw new Error('Missing authorization code');
    await tokenRequest($, {
      grant_type: 'authorization_code',
      code: $.auth.data.code,
      redirect_uri: $.auth.data.ruName,
    });
    let screenName = 'eBay';
    try {
      const u = await me($);
      screenName = u.username ? `eBay · ${u.username}` : screenName;
      await $.auth.set({ userId: u.userId });
    } catch {
      // identidade opcional
    }
    await $.auth.set({ screenName: isSandbox($) ? `${screenName} (sandbox)` : screenName });
  },

  async refreshToken($) {
    await tokenRequest($, {
      grant_type: 'refresh_token',
      refresh_token: $.auth.data.refreshToken,
      scope: EBAY_SCOPES.join(' '),
    });
  },

  async isStillVerified($) {
    const u = await me($);
    return !!u;
  },
};
