import defineApp from '../../helpers/define-app.js';
import addAuthHeader from './common/add-auth-header.js';
import auth from './auth/index.js';
import setBaseUrl from './common/set-base-url.js';
import triggers from './triggers/index.js';
import actions from './actions/index.js';
import dynamicData from './dynamic-data/index.js';

export default defineApp({
  name: 'Firefly III',
  key: 'firefly-iii',
  baseUrl: 'https://firefly-iii.org',
  apiBaseUrl: '',
  iconUrl: '{BASE_URL}/apps/firefly-iii/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/firefly-iii/connection',
  primaryColor: '#CD5029',
  supportsConnections: true,
  beforeRequest: [setBaseUrl, addAuthHeader],
  auth,
  triggers,
  actions,
  dynamicData,
});
