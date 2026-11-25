import { googleAuth } from '../../helpers/google-oauth.js';
import { listAccounts } from './common.js';

export const ADMOB_SCOPES = [
  'https://www.googleapis.com/auth/admob.readonly',
  'https://www.googleapis.com/auth/admob.report',
];

export default googleAuth('google-admob', ADMOB_SCOPES, {
  async afterVerify($) {
    const accounts = await listAccounts($);
    return accounts.length ? `AdMob ${accounts.map((a) => a.publisherId).join(', ')}` : 'no AdMob account';
  },
});
