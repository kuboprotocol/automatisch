import defineApp from '../../helpers/define-app.js';
import { metaAddAuth, GRAPH_BASE } from '../../helpers/meta-graph.js';
import auth from './auth.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// WhatsApp Business (Cloud API oficial da Meta) por token: o cliente cola o token
// permanente do usuário do sistema + o ID do número. Caminho fácil enquanto o login
// pelo Facebook (app "whatsapp", Embedded Signup) depende da verificação da Meta.
export default defineApp({
  name: 'WhatsApp Business (token)',
  key: 'whatsapp-cloud',
  baseUrl: 'https://business.whatsapp.com',
  apiBaseUrl: GRAPH_BASE,
  iconUrl: '{BASE_URL}/apps/whatsapp-cloud/assets/favicon.svg',
  authDocUrl: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  primaryColor: '#25D366',
  supportsConnections: true,
  beforeRequest: [metaAddAuth],
  auth,
  actions,
  triggers,
  dynamicData,
});
