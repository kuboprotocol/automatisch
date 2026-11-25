import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import { apiBase, ebayAddAuth } from './common.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// eBay Sell APIs (Inventory, Account, Fulfillment): anunciar produtos e ver pedidos
// da conta de vendedor do usuário.
export default defineApp({
  name: 'eBay',
  key: 'ebay',
  baseUrl: 'https://www.ebay.com',
  apiBaseUrl: 'https://api.ebay.com',
  iconUrl: '{BASE_URL}/apps/ebay/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/ebay/connection',
  primaryColor: '#0064D2',
  supportsConnections: true,
  beforeRequest: [
    ($, config) => {
      if (!config.url?.startsWith('http')) config.baseURL = apiBase($);
      return config;
    },
    ebayAddAuth,
  ],
  auth,
  actions,
  triggers,
  dynamicData,
});
