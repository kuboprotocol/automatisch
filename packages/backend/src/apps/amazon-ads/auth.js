import { URLSearchParams } from 'node:url';
import { dropdownField, newState, redirectField, redirectUri, textField } from '../../helpers/vertal-app-kit.js';
import { listProfiles } from './common.js';

const TOKEN_URLS = {
  NA: 'https://api.amazon.com/auth/o2/token',
  EU: 'https://api.amazon.co.uk/auth/o2/token',
  FE: 'https://api.amazon.co.jp/auth/o2/token',
};

async function tokenRequest($, params) {
  const body = new URLSearchParams({
    ...params,
    client_id: $.auth.data.clientId,
    client_secret: $.auth.data.clientSecret,
  });
  const { data } = await $.http.post(TOKEN_URLS[$.auth.data.region] || TOKEN_URLS.NA, body.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    additionalProperties: { skipAddingAuthHeader: true },
  });
  await $.auth.set({
    accessToken: data.access_token,
    refreshToken: data.refresh_token || $.auth.data.refreshToken,
    expiresIn: data.expires_in,
    tokenType: data.token_type,
    code: null,
  });
}

export default {
  fields: [
    redirectField('amazon-ads'),
    textField('clientId', 'Client ID (Login with Amazon)'),
    textField('clientSecret', 'Client Secret'),
    dropdownField(
      'region',
      'Region',
      [
        { label: 'North America (incl. Brazil)', value: 'NA' },
        { label: 'Europe', value: 'EU' },
        { label: 'Far East', value: 'FE' },
      ],
      'NA'
    ),
  ],

  async generateAuthUrl($) {
    const params = new URLSearchParams({
      client_id: $.auth.data.clientId,
      scope: 'advertising::campaign_management',
      response_type: 'code',
      redirect_uri: redirectUri($),
      state: newState(),
    });
    const host = $.auth.data.region === 'EU' ? 'https://eu.account.amazon.com' : $.auth.data.region === 'FE' ? 'https://apac.account.amazon.com' : 'https://www.amazon.com';
    await $.auth.set({ url: `${host}/ap/oa?${params.toString()}` });
  },

  async verifyCredentials($) {
    if (!$.auth.data.code) throw new Error('Missing authorization code');
    await tokenRequest($, { grant_type: 'authorization_code', code: $.auth.data.code, redirect_uri: redirectUri($) });
    const profiles = await listProfiles($);
    const names = profiles.slice(0, 2).map((p) => p.accountInfo?.name || p.profileId);
    await $.auth.set({
      screenName: `Amazon Ads · ${profiles.length} profile${profiles.length === 1 ? '' : 's'}${names.length ? ` (${names.join(', ')})` : ''}`,
    });
  },

  async refreshToken($) {
    await tokenRequest($, { grant_type: 'refresh_token', refresh_token: $.auth.data.refreshToken });
  },

  async isStillVerified($) {
    await listProfiles($);
    return true;
  },
};
