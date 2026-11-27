// Mensagens do app MetaMask (Vertal Wallet) em pt-BR, en e es.
// Rótulos dos campos seguem o padrão do fork (pt-BR); as mensagens de erro saem no idioma de
// VERTAL_METAMASK_FLUXOS_LANG (pt padrão).
import { SETUP_URL } from './config.js';

const TEXTS = {
  pt: {
    disabled:
      'MetaMask (Vertal Wallet): este app ainda não está liberado nesta instância do Vertal Fluxos.',
    notAllowed:
      'MetaMask (Vertal Wallet): ainda não liberado para esta conta do Vertal Dev.',
    noWallet: `MetaMask (Vertal Wallet): nenhuma carteira conectada. Conecte a sua MetaMask em ${SETUP_URL} e tente de novo.`,
    walletNotConnected:
      'MetaMask (Vertal Wallet): esta carteira não está entre as conectadas no Vertal Dev.',
    invalidKey: 'MetaMask (Vertal Wallet): chave do Vertal Fluxos inválida.',
    migrationPending:
      'MetaMask (Vertal Wallet): configuração pendente no Vertal Dev (tabela de carteiras).',
    badNetwork:
      'MetaMask (Vertal Wallet): rede inválida (use Sepolia ou Ethereum).',
    badToken: 'MetaMask (Vertal Wallet): endereço do token ERC-20 inválido.',
    rpcUnavailable:
      'MetaMask (Vertal Wallet): o RPC da rede não respondeu. Tente mais tarde ou configure outro RPC.',
    server: 'MetaMask (Vertal Wallet): falha ao falar com o Vertal Dev',
  },
  en: {
    disabled:
      'MetaMask (Vertal Wallet): this app is not enabled on this Vertal Fluxos instance yet.',
    notAllowed:
      'MetaMask (Vertal Wallet): not enabled for this Vertal Dev account yet.',
    noWallet: `MetaMask (Vertal Wallet): no wallet connected. Connect your MetaMask at ${SETUP_URL} and try again.`,
    walletNotConnected:
      'MetaMask (Vertal Wallet): this wallet is not among the ones connected in Vertal Dev.',
    invalidKey: 'MetaMask (Vertal Wallet): invalid Vertal Fluxos key.',
    migrationPending:
      'MetaMask (Vertal Wallet): pending setup on Vertal Dev (wallets table).',
    badNetwork:
      'MetaMask (Vertal Wallet): invalid network (use Sepolia or Ethereum).',
    badToken: 'MetaMask (Vertal Wallet): invalid ERC-20 token address.',
    rpcUnavailable:
      'MetaMask (Vertal Wallet): the network RPC did not answer. Try later or configure another RPC.',
    server: 'MetaMask (Vertal Wallet): could not reach Vertal Dev',
  },
  es: {
    disabled:
      'MetaMask (Vertal Wallet): esta app aún no está habilitada en esta instancia de Vertal Fluxos.',
    notAllowed:
      'MetaMask (Vertal Wallet): aún no habilitado para esta cuenta de Vertal Dev.',
    noWallet: `MetaMask (Vertal Wallet): ninguna billetera conectada. Conecta tu MetaMask en ${SETUP_URL} e inténtalo de nuevo.`,
    walletNotConnected:
      'MetaMask (Vertal Wallet): esta billetera no está entre las conectadas en Vertal Dev.',
    invalidKey: 'MetaMask (Vertal Wallet): clave de Vertal Fluxos inválida.',
    migrationPending:
      'MetaMask (Vertal Wallet): configuración pendiente en Vertal Dev (tabla de billeteras).',
    badNetwork:
      'MetaMask (Vertal Wallet): red inválida (usa Sepolia o Ethereum).',
    badToken: 'MetaMask (Vertal Wallet): dirección de token ERC-20 inválida.',
    rpcUnavailable:
      'MetaMask (Vertal Wallet): el RPC de la red no respondió. Inténtalo más tarde o configura otro RPC.',
    server: 'MetaMask (Vertal Wallet): no se pudo hablar con Vertal Dev',
  },
};

export function lang(env = process.env) {
  const s = String(env.VERTAL_METAMASK_FLUXOS_LANG ?? '').toLowerCase();
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('en')) return 'en';
  return 'pt';
}

export function msg(key, env = process.env) {
  const t = TEXTS[lang(env)];
  return t[key] ?? TEXTS.pt[key] ?? key;
}

export const MESSAGE_KEYS = Object.keys(TEXTS.pt);
export const LANGS = Object.keys(TEXTS);
export const textsFor = (l) => TEXTS[l];
