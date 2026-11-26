import verifyCredentials from './verify-credentials.js';
import isStillVerified from './is-still-verified.js';
import { textField } from '../../../helpers/vertal-app-kit.js';

// A API do Airbrake (v4) só aceita chave: User API key (perfil do usuário). Não existe OAuth.
export default {
  fields: [
    textField('screenName', 'Screen Name', { description: 'Name of this connection.' }),
    textField('instanceUrl', 'API URL', {
      required: false,
      value: 'https://api.airbrake.io',
      description: 'Keep https://api.airbrake.io (Airbrake cloud).',
    }),
    textField('authToken', 'User API key', {
      description: 'Airbrake → your avatar → Profile → "User API key" (not the project key).',
    }),
  ],

  verifyCredentials,
  isStillVerified,
};
