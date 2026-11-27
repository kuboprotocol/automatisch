// JSON-RPC público (só leitura) com limite de chamadas por segundo por RPC, novas tentativas em 429/5xx
// e lotes (batch) com volta para chamadas avulsas quando o RPC não aceita lote.
import { rpcRps } from './config.js';
import { msg } from './messages.js';
import { transport } from './transport.js';

// Só leituras. Qualquer método fora desta lista é recusado antes de sair (nada de eth_sendRawTransaction etc.).
export const READ_METHODS = new Set([
  'eth_blockNumber',
  'eth_getBalance',
  'eth_getTransactionCount',
  'eth_getBlockByNumber',
  'eth_getLogs',
  'eth_call',
  'eth_chainId',
]);

const nextSlot = new Map();
export function resetRateLimiter() {
  nextSlot.clear();
}

async function throttle(url) {
  const gap = Math.ceil(1000 / rpcRps());
  const now = transport.now();
  const at = Math.max(now, nextSlot.get(url) ?? 0);
  nextSlot.set(url, at + gap);
  if (at > now) await transport.sleep(at - now);
}

const RETRIES = 2;

function retryDelay(error, attempt) {
  const ra = Number(error?.response?.headers?.['retry-after']);
  if (Number.isFinite(ra) && ra > 0) return Math.min(5000, ra * 1000);
  return 500 * 3 ** attempt; // 500 ms, 1,5 s
}

const retryable = (error) => {
  const s = error?.response?.status;
  return !s || s === 429 || s >= 500;
};

async function send(url, body) {
  let lastError;
  for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
    await throttle(url);
    try {
      const { data } = await transport.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });
      return data;
    } catch (error) {
      lastError = error;
      if (!retryable(error) || attempt === RETRIES) break;
      await transport.sleep(retryDelay(error, attempt));
    }
  }
  const e = new Error(msg('rpcUnavailable'));
  e.cause = lastError;
  throw e;
}

let ids = 1;

export async function rpc(url, method, params = []) {
  if (!READ_METHODS.has(method))
    throw new Error(`method_not_allowed:${method}`);
  const data = await send(url, { jsonrpc: '2.0', id: ids++, method, params });
  if (!data || data.error) {
    const e = new Error(`rpc_error:${data?.error?.message ?? 'empty'}`);
    e.rpcError = data?.error ?? null;
    throw e;
  }
  return data.result;
}

/** Várias leituras em um lote; se o RPC recusar lote, faz uma a uma. Resultado na mesma ordem. */
export async function rpcBatch(url, calls) {
  if (!calls.length) return [];
  for (const c of calls) {
    if (!READ_METHODS.has(c.method))
      throw new Error(`method_not_allowed:${c.method}`);
  }
  const body = calls.map((c) => ({
    jsonrpc: '2.0',
    id: ids++,
    method: c.method,
    params: c.params || [],
  }));
  let data = null;
  try {
    data = await send(url, body);
  } catch {
    data = null;
  }
  if (
    Array.isArray(data) &&
    data.length === body.length &&
    data.every((d) => d && !d.error)
  ) {
    const byId = new Map(data.map((d) => [d.id, d.result]));
    return body.map((b) => byId.get(b.id));
  }
  const out = [];
  for (const c of calls) out.push(await rpc(url, c.method, c.params || []));
  return out;
}
