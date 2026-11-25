import defineApp from '../../helpers/define-app.js';
import { googleAddAuth } from '../../helpers/google-oauth.js';
import auth from './auth.js';
import { ADS_API, adsAddHeaders } from './common.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Google Ads API: contas acessíveis, campanhas, relatório de desempenho e pausar/ativar campanha.
export default defineApp({
  name: 'Google Ads',
  key: 'google-ads',
  baseUrl: 'https://ads.google.com',
  apiBaseUrl: ADS_API,
  iconUrl: '{BASE_URL}/apps/google-ads/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/google-ads/connection',
  primaryColor: '#4285F4',
  supportsConnections: true,
  beforeRequest: [googleAddAuth, adsAddHeaders],
  auth,
  actions,
  triggers,
  dynamicData,
});
