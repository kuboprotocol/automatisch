import generateAuthUrl from './generate-auth-url.js';
import verifyCredentials from './verify-credentials.js';
import refreshToken from './refresh-token.js';
import isStillVerified from './is-still-verified.js';
import { redirectField, textField } from '../../../helpers/vertal-app-kit.js';

// Firefly III é auto-hospedado: cada usuário cria o próprio cliente OAuth na instância
// (Options → Profile → OAuth → Create new client, com o endereço de retorno do Vertal).
// Nada de cliente global nem segredo no servidor do Vertal: tudo fica na conexão do usuário.
export default {
  fields: [
    redirectField('firefly-iii'),
    textField('instanceUrl', 'Instance URL', {
      description: 'Address of your Firefly III, e.g. https://firefly.example.com',
    }),
    {
      ...textField('clientId', 'Client ID', {
        description: 'Firefly III → Options → Profile → OAuth → Create new client (confidential). Use the redirect URL shown here.',
      }),
      oauthOnly: true,
    },
    { ...textField('clientSecret', 'Client Secret'), oauthOnly: true },
    {
      ...textField('personalAccessToken', 'Personal Access Token (Avançado)', {
        required: false,
        description: 'Optional, instead of the OAuth login: Options → Profile → OAuth → Personal Access Tokens → Create new token.',
      }),
      advanced: true,
    },
  ],

  generateAuthUrl,
  verifyCredentials,
  isStillVerified,
  refreshToken,
};
