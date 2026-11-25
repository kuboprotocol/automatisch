import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import { amazonAddAuth, apiHost } from './common.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Amazon Ads API (Sponsored Products): perfis, campanhas e relatórios do anunciante.
export default defineApp({
  name: 'Amazon Ads',
  key: 'amazon-ads',
  baseUrl: 'https://advertising.amazon.com',
  apiBaseUrl: 'https://advertising-api.amazon.com',
  iconUrl: '{BASE_URL}/apps/amazon-ads/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/amazon-ads/connection',
  primaryColor: '#232F3E',
  supportsConnections: true,
  beforeRequest: [
    ($, config) => {
      if (!config.url?.startsWith('http')) config.baseURL = apiHost($);
      return config;
    },
    amazonAddAuth,
  ],
  auth,
  actions,
  triggers,
  dynamicData,
});
