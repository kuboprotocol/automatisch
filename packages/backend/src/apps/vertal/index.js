import defineApp from '../../helpers/define-app.js';
import auth from './auth/index.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

export default defineApp({
  name: 'Vertal',
  key: 'vertal',
  baseUrl: 'https://vertal.dev',
  apiBaseUrl: 'https://vertal.dev',
  iconUrl: '{BASE_URL}/apps/vertal/assets/favicon.svg',
  authDocUrl: 'https://vertal.dev/connectors',
  primaryColor: '#7c3aed',
  supportsConnections: true,
  auth,
  actions,
  triggers,
  dynamicData,
});
