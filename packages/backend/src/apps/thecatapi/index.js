import defineApp from '../../helpers/define-app.js';
import auth from './auth/index.js';
import triggers from './triggers/index.js';
import actions from './actions/index.js';

export default defineApp({
  name: 'The cat API',
  key: 'thecatapi',
  iconUrl: '{BASE_URL}/apps/thecatapi/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/thecatapi/connection',
  supportsConnections: true,
  baseUrl: 'https://thecatapi.com',
  apiBaseUrl: 'https://api.thecatapi.com',
  primaryColor: '#000000',
  auth,
  triggers,
  actions
});
