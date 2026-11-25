import defineApp from '../../helpers/define-app.js';
import { googleAddAuth } from '../../helpers/google-oauth.js';
import auth from './auth.js';
import { ADSENSE_API } from './common.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// AdSense (só leitura): contas, sites, unidades de anúncio, pagamentos e relatório de ganhos.
export default defineApp({
  name: 'Google AdSense',
  key: 'google-adsense',
  baseUrl: 'https://adsense.google.com',
  apiBaseUrl: ADSENSE_API,
  iconUrl: '{BASE_URL}/apps/google-adsense/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/google-adsense/connection',
  primaryColor: '#FBBC04',
  supportsConnections: true,
  beforeRequest: [googleAddAuth],
  auth,
  actions: [],
  triggers,
  dynamicData,
});
