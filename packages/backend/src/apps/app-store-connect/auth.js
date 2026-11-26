import { textField } from '../../helpers/vertal-app-kit.js';
import { listApps, withAscErrors } from './common.js';

// Sem OAuth: a Apple só oferece chave de API do time para o App Store Connect.
export default {
  fields: [
    textField('screenName', 'Screen Name', { required: false, description: 'Name of this connection.' }),
    textField('issuerId', 'Issuer ID', {
      description: 'App Store Connect → Users and Access → Integrations → App Store Connect API (UUID at the top).',
    }),
    textField('keyId', 'Key ID', { description: '10-character ID of the team key.' }),
    textField('privateKey', 'Private key (.p8)', {
      description: 'Paste the whole content of AuthKey_<KeyID>.p8 (downloadable only once). Stored encrypted on the server.',
    }),
  ],

  async verifyCredentials($) {
    const apps = await withAscErrors(() => listApps($, 50));
    await $.auth.set({
      screenName: $.auth.data.screenName || `App Store Connect · ${String($.auth.data.keyId || '').trim()} · ${apps.length} app(s)`,
    });
  },

  async isStillVerified($) {
    await listApps($, 1);
    return true;
  },
};
