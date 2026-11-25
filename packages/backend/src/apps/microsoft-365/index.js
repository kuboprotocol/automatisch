import defineApp from '../../helpers/define-app.js';
import { GRAPH, graphAddAuth } from '../../helpers/microsoft-graph.js';
import auth from './auth.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Microsoft 365 (Microsoft Graph): arquivos do OneDrive e tarefas do Microsoft To Do.
export default defineApp({
  name: 'Microsoft 365',
  key: 'microsoft-365',
  baseUrl: 'https://www.microsoft365.com',
  apiBaseUrl: GRAPH,
  iconUrl: '{BASE_URL}/apps/microsoft-365/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/microsoft-365/connection',
  primaryColor: '#FFFFFF',
  supportsConnections: true,
  beforeRequest: [graphAddAuth],
  auth,
  actions,
  triggers,
  dynamicData,
});
