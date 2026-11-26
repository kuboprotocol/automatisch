import { URLSearchParams } from 'node:url';

const refreshToken = async ($) => {
  // Personal Access Token (Avançado) não tem refresh.
  if (!$.auth.data.refreshToken) return;
  const { data } = await $.http.post(
    '/oauth/token',
    new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: $.auth.data.clientId,
      client_secret: $.auth.data.clientSecret,
      refresh_token: $.auth.data.refreshToken,
      scope: '',
    }).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      additionalProperties: { skipAddingBaseUrl: true, skipAddingAuthHeader: true },
    }
  );
  await $.auth.set({
    accessToken: data.access_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type || 'Bearer',
    // O Passport gira o refresh token: guardar o novo.
    ...(data.refresh_token ? { refreshToken: data.refresh_token } : {}),
  });
};

export default refreshToken;
