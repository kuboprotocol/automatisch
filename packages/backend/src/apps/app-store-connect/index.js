import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import { ASC_API, ascAddAuth } from './common.js';
import triggers from './triggers/index.js';
import actions from './actions/index.js';

// App Store Connect (iOS / Xcode no Vertal Dev): apps, builds enviados pelo Xcode e avaliações.
// Conexão por chave de API do time (a Apple não tem OAuth para terceiros).
export default defineApp({
  name: 'App Store Connect',
  key: 'app-store-connect',
  baseUrl: 'https://appstoreconnect.apple.com',
  apiBaseUrl: ASC_API,
  iconUrl: '{BASE_URL}/apps/app-store-connect/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/app-store-connect/connection',
  primaryColor: '#0D96F6',
  supportsConnections: true,
  beforeRequest: [ascAddAuth],
  auth,
  actions,
  triggers,
});
