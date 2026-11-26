import defineApp from '../../helpers/define-app.js';
import { googleAddAuth } from '../../helpers/google-oauth.js';
import auth from './auth.js';
import { PLAY_API } from './common.js';
import triggers from './triggers/index.js';
import actions from './actions/index.js';

// Google Play Console (Google Play Developer API): avaliações e respostas, faixas de lançamento,
// assinaturas e produtos. Login com Google; o acesso a cada app é dado no próprio Play Console.
export default defineApp({
  name: 'Google Play Console',
  key: 'google-play-console',
  baseUrl: 'https://play.google.com/console',
  apiBaseUrl: PLAY_API,
  iconUrl: '{BASE_URL}/apps/google-play-console/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/google-play-console/connection',
  primaryColor: '#01875F',
  supportsConnections: true,
  beforeRequest: [googleAddAuth],
  auth,
  actions,
  triggers,
});
