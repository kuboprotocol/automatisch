import { googleAuth } from '../../helpers/google-oauth.js';
import { textField } from '../../helpers/vertal-app-kit.js';
import { listAccessibleCustomers } from './common.js';

export const GOOGLE_ADS_SCOPES = ['https://www.googleapis.com/auth/adwords'];

export default googleAuth('google-ads', GOOGLE_ADS_SCOPES, {
  extraFields: [
    textField('developerToken', 'Developer token (optional, legacy)', {
      required: false,
      description: 'Google sunset developer tokens on 2026-09-09; access now follows the Cloud project of the OAuth client.',
    }),
    textField('loginCustomerId', 'Manager account ID (optional, login-customer-id)', { required: false }),
  ],
  async afterVerify($) {
    const ids = await listAccessibleCustomers($);
    return `${ids.length} Google Ads account${ids.length === 1 ? '' : 's'}`;
  },
});
