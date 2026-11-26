import { URLSearchParams } from 'node:url';
import { redirectUri } from '../../../helpers/vertal-app-kit.js';
import getCurrentUser from '../common/get-current-user.js';

const verifyCredentials = async ($) => {
  if (!$.auth.data.code) {
    // Avançado: Personal Access Token, sem login OAuth.
    if (!$.auth.data.personalAccessToken) throw new Error('Missing authorization code');
    const user = await getCurrentUser($);
    await $.auth.set({ screenName: user?.attributes?.email || 'Firefly III' });
    return;
  }

  const { data } = await $.http.post(
    '/oauth/token',
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: $.auth.data.clientId,
      client_secret: $.auth.data.clientSecret,
      code: $.auth.data.code,
      redirect_uri: redirectUri($),
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      additionalProperties: { skipAddingBaseUrl: true, skipAddingAuthHeader: true },
    }
  );
  if (!data?.access_token) throw new Error('Firefly III: no access token returned');

  await $.auth.set({
    accessToken: data.access_token,
    tokenType: data.token_type || 'Bearer',
    expiresIn: data.expires_in,
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
    code: null,
  });

  const user = await getCurrentUser($);
  await $.auth.set({ screenName: user?.attributes?.email || 'Firefly III' });
};

export default verifyCredentials;
