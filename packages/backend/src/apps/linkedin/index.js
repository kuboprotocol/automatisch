import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import actions from './actions/index.js';
import { LINKEDIN_API, linkedinAddAuth } from './common.js';

// LinkedIn: perfil do membro (OpenID Connect) e posts no perfil (Share on LinkedIn).
export default defineApp({
  name: 'LinkedIn',
  key: 'linkedin',
  baseUrl: 'https://www.linkedin.com',
  apiBaseUrl: LINKEDIN_API,
  iconUrl: '{BASE_URL}/apps/linkedin/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/linkedin/connection',
  primaryColor: '#0A66C2',
  supportsConnections: true,
  beforeRequest: [linkedinAddAuth],
  auth,
  actions,
});
