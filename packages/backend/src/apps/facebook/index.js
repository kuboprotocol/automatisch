import defineApp from '../../helpers/define-app.js';
import { metaAddAuth, metaAuth, GRAPH_BASE } from '../../helpers/meta-graph.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

export default defineApp({
  name: 'Facebook',
  key: 'facebook',
  baseUrl: 'https://www.facebook.com',
  apiBaseUrl: GRAPH_BASE,
  iconUrl: '{BASE_URL}/apps/facebook/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/facebook/connection',
  primaryColor: '#1877F2',
  supportsConnections: true,
  beforeRequest: [metaAddAuth],
  auth: metaAuth('facebook', [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'read_insights',
    'business_management',
  ]),
  actions,
  triggers,
  dynamicData,
});
