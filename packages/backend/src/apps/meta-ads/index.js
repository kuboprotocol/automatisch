import defineApp from '../../helpers/define-app.js';
import { metaAddAuth, metaAuth, GRAPH_BASE } from '../../helpers/meta-graph.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Meta Ads (Marketing API): contas de anúncio, campanhas e relatórios do usuário.
export default defineApp({
  name: 'Meta Ads',
  key: 'meta-ads',
  baseUrl: 'https://adsmanager.facebook.com',
  apiBaseUrl: GRAPH_BASE,
  iconUrl: '{BASE_URL}/apps/meta-ads/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/meta-ads/connection',
  primaryColor: '#0866FF',
  supportsConnections: true,
  beforeRequest: [metaAddAuth],
  auth: metaAuth('meta-ads', ['public_profile', 'ads_read', 'ads_management', 'business_management']),
  actions,
  triggers,
  dynamicData,
});
