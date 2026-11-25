import defineApp from '../../helpers/define-app.js';
import auth from './auth.js';
import triggers from './triggers/index.js';

// Kwai for Business (Marketing API): contas e relatórios de anúncios.
// Escrita (campanhas/criativos) depende de liberação extra da Kwai por e-mail.
export default defineApp({
  name: 'Kwai Ads',
  key: 'kwai-ads',
  baseUrl: 'https://business.kwai.com',
  apiBaseUrl: 'https://developers.kwai.com',
  iconUrl: '{BASE_URL}/apps/kwai-ads/assets/favicon.svg',
  authDocUrl: '{DOCS_URL}/apps/kwai-ads/connection',
  primaryColor: '#FF7A00',
  supportsConnections: true,
  beforeRequest: [
    ($, config) => {
      if (config.additionalProperties?.skipAddingAuthHeader) return config;
      if ($.auth.data?.accessToken) config.headers['Access-Token'] = $.auth.data.accessToken;
      return config;
    },
  ],
  auth,
  triggers,
});
