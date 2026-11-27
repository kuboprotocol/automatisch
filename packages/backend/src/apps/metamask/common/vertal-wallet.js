// Fluxos → Vertal Dev (edge function vertal-code-ai?app=wallet) com a chave vfk1 do PRÓPRIO usuário,
// o mesmo caminho do Vertal CRM. Devolve só endereços públicos já conectados por SIWE.
import { isEnabled, normAddress, walletUrl } from './config.js';
import { msg } from './messages.js';
import { transport } from './transport.js';

const ERROR_KEYS = {
  vertal_metamask_fluxos_disabled: 'notAllowed',
  invalid_fluxos_key: 'invalidKey',
  missing_fluxos_key: 'invalidKey',
  migration_pending: 'migrationPending',
  not_connected: 'noWallet',
};

export function assertEnabled() {
  if (!isEnabled()) throw new Error(msg('disabled'));
}

export async function callWallet(vertalKey, payload, { timeout = 20000 } = {}) {
  assertEnabled();
  const anon = process.env.VERTAL_BROKER_ANON_KEY || '';
  const headers = {
    'Content-Type': 'application/json',
    'X-Vertal-Fluxos-Key': vertalKey || '',
  };
  if (anon) {
    headers.apikey = anon;
    headers.Authorization = `Bearer ${anon}`;
  }
  let data;
  try {
    ({ data } = await transport.post(walletUrl(), payload, {
      headers,
      timeout,
    }));
  } catch (error) {
    const code = error?.response?.data?.error;
    if (code && ERROR_KEYS[code]) throw new Error(msg(ERROR_KEYS[code]));
    throw new Error(`${msg('server')}: ${code || error?.message || 'falha'}`);
  }
  if (!data?.ok) {
    const code = data?.error;
    if (code && ERROR_KEYS[code]) throw new Error(msg(ERROR_KEYS[code]));
    throw new Error(`${msg('server')}: ${code || 'falha'}`);
  }
  return data;
}

/** Carteiras conectadas no Vertal Dev (endereços em minúsculas). Pode ser lista vazia. */
export async function listWallets(vertalKey) {
  const data = await callWallet(vertalKey, { op: 'addresses' });
  const wallets = Array.isArray(data.wallets) ? data.wallets : [];
  return wallets
    .map((w) => ({
      address: normAddress(w?.address),
      chainId: Number(w?.chainId) || null,
      connectedAt: w?.connectedAt || null,
    }))
    .filter((w) => w.address);
}

/** Carteira do passo: a escolhida (precisa estar entre as conectadas) ou a primeira conectada. */
export async function resolveWallet($) {
  const wallets = await listWallets($.auth.data.vertalKey);
  if (!wallets.length) throw new Error(msg('noWallet'));
  const wanted = String($.step?.parameters?.wallet ?? '').trim();
  if (!wanted) return wallets[0].address;
  const addr = normAddress(wanted);
  const found = addr && wallets.find((w) => w.address === addr);
  if (!found) throw new Error(msg('walletNotConnected'));
  return found.address;
}

// Etherscan pelo Vertal Dev (chave no VERTAL_GPU_CONFIG). Sem chave lá, guarda "indisponível" por 10 min
// para não chamar o servidor a cada consulta.
let serverEtherscanOffUntil = 0;
export function resetServerEtherscanCache() {
  serverEtherscanOffUntil = 0;
}

export async function serverTxList(
  vertalKey,
  { chainId, tokenAddress, startBlock, limit }
) {
  if (transport.now() < serverEtherscanOffUntil) return null;
  let data;
  try {
    data = await callWallet(vertalKey, {
      op: 'txlist',
      chainId,
      tokenAddress: tokenAddress || undefined,
      startBlock,
      limit,
    });
  } catch {
    return null; // cai para o RPC
  }
  if (!data.available) {
    serverEtherscanOffUntil = transport.now() + 10 * 60_000;
    return null;
  }
  return Array.isArray(data.txs) ? data.txs : null;
}
