import defineApp from '../../helpers/define-app.js';
import { googleAddAuth } from '../../helpers/google-oauth.js';
import auth from './auth.js';
import { ADMOB_API } from './common.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// AdMob (só leitura): contas, apps, blocos de anúncio, relatórios de rede e de mediação.
export default defineApp({
  name: 'Google AdMob',
  key: 'google-admob',
  baseUrl: 'https://admob.google.com',
  apiBaseUrl: ADMOB_API,
  iconUrl: '{BASE_URL}/apps/google-admob/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/google-admob/connection',
  primaryColor: '#EA4335',
  supportsConnections: true,
  beforeRequest: [googleAddAuth],
  auth,
  actions: [],
  triggers,
  dynamicData,
});
