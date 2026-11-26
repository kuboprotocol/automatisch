import verifyCredentials from './verify-credentials.js';
import isStillVerified from './is-still-verified.js';
import { textField } from '../../../helpers/vertal-app-kit.js';

// FreeScout (auto-hospedado) só autentica a API por chave (módulo oficial "API & Webhooks");
// não existe OAuth oficial. Chave: Manage → API & Webhooks (global) ou "My API Keys" (por usuário).
export default {
  fields: [
    textField('screenName', 'Screen Name', { description: 'Name of this connection.' }),
    textField('instanceUrl', 'FreeScout instance URL', {
      description: 'Address of your FreeScout, e.g. https://support.example.com (the API & Webhooks module must be active).',
    }),
    textField('apiKey', 'API Key', {
      description: 'FreeScout → Manage → API & Webhooks → API Key (or your personal key under "My API Keys").',
    }),
  ],

  verifyCredentials,
  isStillVerified,
};
