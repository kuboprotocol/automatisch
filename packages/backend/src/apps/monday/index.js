import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import { MONDAY_API, mondayAddAuth } from './common.js';
import triggers from './triggers/index.js';
import actions from './actions/index.js';
import dynamicData from './dynamic-data/index.js';

export default defineApp({
  name: 'Monday',
  key: 'monday',
  iconUrl: '{BASE_URL}/apps/monday/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/monday/connection',
  supportsConnections: true,
  baseUrl: 'https://monday.com',
  apiBaseUrl: MONDAY_API,
  primaryColor: '#F62B54',
  beforeRequest: [mondayAddAuth],
  auth,
  triggers,
  actions,
  dynamicData,
});
