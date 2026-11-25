import { googleAuth } from '../../helpers/google-oauth.js';
import { listAccounts } from './common.js';

export const ADSENSE_SCOPES = ['https://www.googleapis.com/auth/adsense.readonly'];

export default googleAuth('google-adsense', ADSENSE_SCOPES, {
  async afterVerify($) {
    const accounts = await listAccounts($);
    return accounts.length ? `AdSense ${accounts.map((a) => a.name.replace('accounts/', '')).join(', ')}` : 'no AdSense account';
  },
});
