import defineApp from '../../helpers/define-app.js';
import { metaAddAuth, metaAuth, GRAPH_BASE } from '../../helpers/meta-graph.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Instagram profissional (Business/Creator) ligado a uma Página do Facebook,
// pelo login do Facebook (Instagram Graph API).
export default defineApp({
  name: 'Instagram',
  key: 'instagram',
  baseUrl: 'https://www.instagram.com',
  apiBaseUrl: GRAPH_BASE,
  iconUrl: '{BASE_URL}/apps/instagram/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/instagram/connection',
  primaryColor: '#E1306C',
  supportsConnections: true,
  beforeRequest: [metaAddAuth],
  auth: metaAuth('instagram', [
    'public_profile',
    'instagram_basic',
    'instagram_content_publish',
    'instagram_manage_insights',
    'pages_show_list',
    'pages_read_engagement',
    'business_management',
  ]),
  actions,
  triggers,
  dynamicData,
});
