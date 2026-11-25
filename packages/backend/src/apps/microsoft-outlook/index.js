import defineApp from '../../helpers/define-app.js';
import { GRAPH, graphAddAuth } from '../../helpers/microsoft-graph.js';
import auth from './auth.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Outlook (Microsoft Graph): e-mail e calendário, contas pessoais e de trabalho/escola.
export default defineApp({
  name: 'Outlook',
  key: 'microsoft-outlook',
  baseUrl: 'https://outlook.office.com',
  apiBaseUrl: GRAPH,
  iconUrl: '{BASE_URL}/apps/microsoft-outlook/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/microsoft-outlook/connection',
  primaryColor: '#0F6CBD',
  supportsConnections: true,
  beforeRequest: [graphAddAuth],
  auth,
  actions,
  triggers,
  dynamicData,
});
