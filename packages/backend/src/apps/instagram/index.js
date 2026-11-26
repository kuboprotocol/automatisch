import defineApp from '../../helpers/define-app.js';
import { metaAddAuth, metaAuth, GRAPH_BASE } from '../../helpers/meta-graph.js';
import { igScreenName } from './common.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Instagram profissional (Business/Creator) ligado a uma Página do Facebook,
// pelo login do Facebook (Instagram Graph API + mensagens diretas pela Messenger Platform).
// Mesmo app da Meta dos conectores Facebook / WhatsApp / Meta Ads.
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
    'instagram_manage_messages',
    'pages_show_list',
    'pages_manage_metadata',
    'pages_read_engagement',
    'business_management',
  ], {
    // Login unificado: o /me do token é o usuário de sistema da empresa; mostra as contas do Instagram.
    async afterVerify($) {
      try {
        const name = await igScreenName($);
        if (name) await $.auth.set({ screenName: `Instagram · ${name}` });
      } catch {
        // mantém o nome do /me
      }
    },
    // Com configuração (config_id), mostra as opções "Instagram" e "Facebook" no login.
    loginPrompt: 'login',
  }),
  actions,
  triggers,
  dynamicData,
});
