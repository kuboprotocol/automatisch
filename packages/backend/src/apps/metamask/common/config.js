// MetaMask (Vertal Wallet) — app SÓ LEITURA do Vertal Fluxos.
//
// Regras (Laércio, 27/11/2026): nada de chave privada, frase-semente ou assinatura em lugar nenhum; só lê
// endereços públicos que o usuário JÁ conectou no Vertal Dev (SIWE em /connectors/metamask/setup).
// Desligado por padrão: precisa de VERTAL_METAMASK_FLUXOS_ENABLED=true no Railway (serviços main e worker)
// E do lado do Vertal Dev: VERTAL_METAMASK_ENABLED + usuário em VERTAL_METAMASK_USER_IDS +
// VERTAL_METAMASK_FLUXOS_ENABLED dentro do VERTAL_GPU_CONFIG (só a conta do Laércio).
//
// Variáveis (Railway, todas opcionais além do interruptor):
//   VERTAL_METAMASK_FLUXOS_ENABLED   "true" liga o app (padrão: desligado)
//   VERTAL_METAMASK_RPC_11155111     RPC https da Sepolia   (padrão: publicnode)
//   VERTAL_METAMASK_RPC_1            RPC https da Ethereum  (padrão: publicnode)
//   VERTAL_METAMASK_ETHERSCAN_KEY    chave Etherscan (API v2) direto no Fluxos; sem ela, tenta a do Vertal Dev e depois o RPC
//   VERTAL_METAMASK_SCAN_BLOCKS      blocos lidos por consulta na varredura por RPC (padrão 120, máx. 2000)
//   VERTAL_METAMASK_CONFIRMATIONS    blocos de confirmação antes de considerar (padrão 2, máx. 64)
//   VERTAL_METAMASK_RPC_RPS          chamadas por segundo por RPC (padrão 5, máx. 25)
//   VERTAL_METAMASK_FLUXOS_LANG      idioma das mensagens: pt (padrão), en, es
//   VERTAL_WALLET_URL                rota do Vertal Dev (padrão vertal-code-ai?app=wallet)
//   VERTAL_BROKER_ANON_KEY           (já existe) anon key do Supabase, mesma usada pelo app Vertal

const truthy = (v) => /^(1|true|yes|on|sim)$/i.test(String(v ?? '').trim());

export const isEnabled = (env = process.env) =>
  truthy(env.VERTAL_METAMASK_FLUXOS_ENABLED);

export const SETUP_URL = 'https://vertal.dev/connectors/metamask/setup';

const DEFAULT_WALLET_URL =
  'https://sccizjlpwezsgaxkclot.supabase.co/functions/v1/vertal-code-ai?app=wallet';

export const walletUrl = (env = process.env) =>
  env.VERTAL_WALLET_URL || DEFAULT_WALLET_URL;

export const NETWORKS = {
  sepolia: {
    key: 'sepolia',
    chainId: 11155111,
    name: 'Sepolia (testnet)',
    explorer: 'https://sepolia.etherscan.io',
    defaultRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
  },
  mainnet: {
    key: 'mainnet',
    chainId: 1,
    name: 'Ethereum',
    explorer: 'https://etherscan.io',
    defaultRpc: 'https://ethereum-rpc.publicnode.com',
  },
};

export function network(key) {
  return NETWORKS[String(key || 'sepolia').trim()] || null;
}

export function rpcUrl(net, env = process.env) {
  const custom = String(env[`VERTAL_METAMASK_RPC_${net.chainId}`] ?? '').trim();
  return /^https:\/\/\S+$/.test(custom) ? custom : net.defaultRpc;
}

const intEnv = (v, def, min, max) => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || String(v ?? '').trim() === '') return def;
  return Math.min(max, Math.max(min, n));
};

export const scanBlocks = (env = process.env) =>
  intEnv(env.VERTAL_METAMASK_SCAN_BLOCKS, 120, 1, 2000);
export const confirmations = (env = process.env) =>
  intEnv(env.VERTAL_METAMASK_CONFIRMATIONS, 2, 0, 64);
export const rpcRps = (env = process.env) =>
  intEnv(env.VERTAL_METAMASK_RPC_RPS, 5, 1, 25);

export const etherscanKey = (env = process.env) =>
  String(env.VERTAL_METAMASK_ETHERSCAN_KEY ?? '').trim() || null;

export const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
export const normAddress = (a) =>
  typeof a === 'string' && ADDRESS_RE.test(a.trim())
    ? a.trim().toLowerCase()
    : null;

export const shortAddress = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
