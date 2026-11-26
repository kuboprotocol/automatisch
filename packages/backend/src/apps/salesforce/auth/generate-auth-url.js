import qs from 'qs';
import { createCodeVerifier, codeChallengeFor } from '../common/pkce.js';

export default async function generateAuthUrl($) {
  const oauthRedirectUrlField = $.app.auth.fields.find(
    (field) => field.key == 'oAuthRedirectUrl'
  );
  const redirectUri = oauthRedirectUrlField.value;
  const codeVerifier = createCodeVerifier();
  const searchParams = qs.stringify({
    client_id: $.auth.data.consumerKey,
    redirect_uri: redirectUri,
    response_type: 'code',
    code_challenge: codeChallengeFor(codeVerifier),
    code_challenge_method: 'S256',
  });

  await $.auth.set({
    url: `${$.auth.data.oauth2Url}/authorize?${searchParams}`,
    codeVerifier,
  });
}
