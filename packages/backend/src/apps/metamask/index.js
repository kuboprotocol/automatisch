// MetaMask (Vertal Wallet) — SÓ LEITURA. Desligado por padrão (VERTAL_METAMASK_FLUXOS_ENABLED no Railway +
// liberação por conta no Vertal Dev). Nada aqui assina, envia transação ou guarda chave privada/frase-semente.
import defineApp from '../../helpers/define-app.js';
import auth from './auth/index.js';
import triggers from './triggers/index.js';
import actions from './actions/index.js';
import dynamicData from './dynamic-data/index.js';

export default defineApp({
  name: 'MetaMask (Vertal Wallet)',
  key: 'metamask',
  baseUrl: 'https://vertal.dev/connectors/metamask/setup',
  apiBaseUrl: 'https://vertal.dev',
  iconUrl: '{BASE_URL}/apps/metamask/assets/favicon.svg',
  authDocUrl: 'https://vertal.dev/connectors/metamask/setup',
  primaryColor: '#f6851b',
  supportsConnections: true,
  auth,
  triggers,
  actions,
  dynamicData,
});
