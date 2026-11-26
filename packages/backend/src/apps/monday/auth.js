import { URLSearchParams } from 'node:url';
import { newState, redirectField, redirectUri, textField } from '../../helpers/vertal-app-kit.js';
import { MONDAY_AUTH, MONDAY_SCOPES, getMe, screenNameOf } from './common.js';

// clientId/clientSecret: cliente OAuth (do Vertal, ou app próprio do usuário).
// apiToken: alternativa "Avançado" — token pessoal (Perfil → Desenvolvedores → Meus tokens); sem login OAuth.
export default {
  fields: [
    redirectField('monday'),
    { ...textField('clientId', 'Client ID'), oauthOnly: true },
    { ...textField('clientSecret', 'Client Secret'), oauthOnly: true },
    {
      ...textField('apiToken', 'API token (Avançado)', {
        required: false,
        description: 'Opcional, em vez do login: monday.com → avatar → Developers → My access tokens → Show/Copy.',
      }),
      advanced: true,
    },
  ],

  async generateAuthUrl($) {
    const params = new URLSearchParams({
      client_id: $.auth.data.clientId,
      redirect_uri: redirectUri($),
      state: newState(),
      scope: MONDAY_SCOPES.join(' '),
      // Conta que ainda não instalou o app vê a tela de instalação antes do consentimento.
      force_install_if_needed: 'true',
    });
    await $.auth.set({ url: `${MONDAY_AUTH}/authorize?${params.toString()}` });
  },

  async verifyCredentials($) {
    if (!$.auth.data.code) {
      if (!$.auth.data.apiToken) throw new Error('Missing authorization code');
      const me = await getMe($);
      await $.auth.set({ userId: me?.id ? String(me.id) : undefined, screenName: screenNameOf(me) });
      return;
    }
    const { data } = await $.http.post(
      `${MONDAY_AUTH}/token`,
      new URLSearchParams({
        client_id: $.auth.data.clientId,
        client_secret: $.auth.data.clientSecret,
        code: $.auth.data.code,
        redirect_uri: redirectUri($),
      }).toString(),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        additionalProperties: { skipAddingAuthHeader: true },
      }
    );
    if (!data?.access_token) throw new Error('monday.com: no access token returned');
    await $.auth.set({
      accessToken: data.access_token,
      tokenType: data.token_type || 'bearer',
      ...(data.scope ? { scope: data.scope } : {}),
      code: null,
    });
    const me = await getMe($);
    await $.auth.set({ userId: me?.id ? String(me.id) : undefined, screenName: screenNameOf(me) });
  },

  async isStillVerified($) {
    const me = await getMe($);
    return !!me?.id;
  },
};
