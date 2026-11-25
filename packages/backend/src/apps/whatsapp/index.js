import defineApp from '../../helpers/define-app.js';
import { metaAddAuth, metaAuth, GRAPH_BASE } from '../../helpers/meta-graph.js';
import { discoverWabas } from './common.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// WhatsApp Business (Cloud API) pelo login do Facebook: a conta do WhatsApp Business
// (WABA) liberada no login é descoberta pelo debug_token.
export default defineApp({
  name: 'WhatsApp Business',
  key: 'whatsapp',
  baseUrl: 'https://business.whatsapp.com',
  apiBaseUrl: GRAPH_BASE,
  iconUrl: '{BASE_URL}/apps/whatsapp/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/whatsapp/connection',
  primaryColor: '#25D366',
  supportsConnections: true,
  beforeRequest: [metaAddAuth],
  auth: metaAuth(
    'whatsapp',
    ['public_profile', 'whatsapp_business_management', 'whatsapp_business_messaging', 'business_management'],
    { afterVerify: discoverWabas }
  ),
  actions,
  triggers,
  dynamicData,
});
