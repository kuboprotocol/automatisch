import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import { TIKTOK_API, tiktokAddAuth } from './common.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// TikTok API for Business (Marketing API): contas de anúncio, campanhas e relatórios.
export default defineApp({
  name: 'TikTok Ads',
  key: 'tiktok-ads',
  baseUrl: 'https://ads.tiktok.com',
  apiBaseUrl: TIKTOK_API,
  iconUrl: '{BASE_URL}/apps/tiktok-ads/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/tiktok-ads/connection',
  primaryColor: '#000000',
  supportsConnections: true,
  beforeRequest: [tiktokAddAuth],
  auth,
  actions,
  triggers,
  dynamicData,
});
