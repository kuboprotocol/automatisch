import defineApp from '../../helpers/define-app.js';
import { GRAPH, graphAddAuth } from '../../helpers/microsoft-graph.js';
import auth from './auth.js';
import actions from './actions/index.js';
import triggers from './triggers/index.js';
import dynamicData from './dynamic-data/index.js';

// Microsoft Teams (Microsoft Graph). Só contas de trabalho/escola.
export default defineApp({
  name: 'Microsoft Teams',
  key: 'microsoft-teams',
  baseUrl: 'https://teams.microsoft.com',
  apiBaseUrl: GRAPH,
  iconUrl: '{BASE_URL}/apps/microsoft-teams/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/microsoft-teams/connection',
  primaryColor: '#5B5FC7',
  supportsConnections: true,
  beforeRequest: [graphAddAuth],
  auth,
  actions,
  triggers,
  dynamicData,
});
