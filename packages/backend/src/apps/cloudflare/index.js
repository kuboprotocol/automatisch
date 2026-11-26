import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import actions from './actions/index.js';
import { CLOUDFLARE_API, cloudflareAddAuth } from './common.js';

// Cloudflare: contas, zonas, DNS, Workers e cache do próprio usuário, por login OAuth.
export default defineApp({
  name: 'Cloudflare',
  key: 'cloudflare',
  baseUrl: 'https://www.cloudflare.com',
  apiBaseUrl: CLOUDFLARE_API,
  iconUrl: '{BASE_URL}/apps/cloudflare/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/cloudflare/connection',
  primaryColor: '#F38020',
  supportsConnections: true,
  beforeRequest: [cloudflareAddAuth],
  auth,
  actions,
});
