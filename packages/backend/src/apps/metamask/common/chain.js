// Leituras na rede (Sepolia / Ethereum): saldo em ETH ou ERC-20, metadados do token e transações.
// Fonte das transações, nesta ordem: Etherscan com a chave do Railway → Etherscan pela chave do Vertal Dev →
// varredura limitada por RPC público (blocos recentes para ETH; logs Transfer para ERC-20).
import {
  confirmations,
  etherscanKey,
  normAddress,
  rpcUrl,
  scanBlocks,
} from './config.js';
import { rpc, rpcBatch } from './rpc.js';
import { transport } from './transport.js';
import { serverTxList } from './vertal-wallet.js';

export const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const SEL_BALANCE_OF = '0x70a08231';
const SEL_DECIMALS = '0x313ce567';
const SEL_SYMBOL = '0x95d89b41';

const hex = (n) => `0x${BigInt(n).toString(16)}`;
const big = (h) => {
  try {
    return h && h !== '0x' ? BigInt(h) : 0n;
  } catch {
    return 0n;
  }
};
export const pad32 = (address) => `0x${address.toLowerCase().replace(/^0x/, '').padStart(64, '0')}`;
const topicAddress = (t) => (t ? `0x${t.slice(-40)}`.toLowerCase() : null);

export function fromUnits(v, decimals = 18, maxFrac = 6) {
  const value = BigInt(v);
  const neg = value < 0n;
  const a = neg ? -value : value;
  const base = 10n ** BigInt(decimals);
  const int = a / base;
  const frac = (a % base).toString().padStart(decimals, '0').slice(0, maxFrac).replace(/0+$/, '');
  return `${neg ? '-' : ''}${int}${frac ? `.${frac}` : ''}`;
}

export async function headBlock(net) {
  const latest = Number(big(await rpc(rpcUrl(net), 'eth_blockNumber')));
  return Math.max(0, latest - confirmations());
}

export async function ethBalance(net, address, block) {
  return big(await rpc(rpcUrl(net), 'eth_getBalance', [address, hex(block)]));
}

export async function tokenBalance(net, token, address, block) {
  const data = `${SEL_BALANCE_OF}${pad32(address).slice(2)}`;
  return big(await rpc(rpcUrl(net), 'eth_call', [{ to: token, data }, hex(block)]));
}

/** symbol() string ou bytes32 → texto curto. */
export function decodeSymbol(h) {
  const s = String(h || '').replace(/^0x/, '');
  if (!s) return null;
  let bytes;
  if (s.length >= 192) {
    const len = Number(BigInt(`0x${s.slice(64, 128)}`));
    bytes = s.slice(128, 128 + Math.min(len, 32) * 2);
  } else {
    bytes = s.slice(0, 64).replace(/(00)+$/, '');
  }
  const text = Buffer.from(bytes, 'hex').toString('utf8').replace(/[^\x20-\x7e]/g, '');
  return text.slice(0, 16) || null;
}

const metaCache = new Map();
export async function tokenMeta(net, token) {
  const k = `${net.chainId}:${token}`;
  if (metaCache.has(k)) return metaCache.get(k);
  const [dec, sym] = await rpcBatch(rpcUrl(net), [
    { method: 'eth_call', params: [{ to: token, data: SEL_DECIMALS }, 'latest'] },
    { method: 'eth_call', params: [{ to: token, data: SEL_SYMBOL }, 'latest'] },
  ]).catch(() => [null, null]);
  const d = Number(big(dec));
  const meta = {
    decimals: Number.isInteger(d) && d >= 0 && d <= 36 && dec && dec !== '0x' ? d : 18,
    symbol: decodeSymbol(sym) || `${token.slice(0, 6)}…${token.slice(-4)}`,
  };
  metaCache.set(k, meta);
  return meta;
}

export async function balanceOf(net, address, token, block) {
  if (!token) {
    const wei = await ethBalance(net, address, block);
    return { wei, decimals: 18, symbol: 'ETH' };
  }
  const [wei, meta] = await Promise.all([tokenBalance(net, token, address, block), tokenMeta(net, token)]);
  return { wei, decimals: meta.decimals, symbol: meta.symbol };
}

// ─────────── Transações ───────────

function tx(fields) {
  return {
    hash: fields.hash,
    blockNumber: Number(fields.blockNumber),
    timeStamp: fields.timeStamp ?? null,
    from: (fields.from || '').toLowerCase(),
    to: fields.to ? String(fields.to).toLowerCase() : null,
    valueWei: String(fields.valueWei ?? '0'),
    tokenAddress: fields.tokenAddress ?? null,
    tokenSymbol: fields.tokenSymbol ?? null,
    tokenDecimals: fields.tokenDecimals ?? null,
    logIndex: fields.logIndex ?? null,
    status: fields.status || 'ok',
  };
}

/** Etherscan API v2 direto (chave no Railway). Mais novo primeiro; null em falha. */
export async function etherscanDirect(key, net, address, token, startBlock, limit) {
  try {
    const params = {
      chainid: String(net.chainId),
      module: 'account',
      action: token ? 'tokentx' : 'txlist',
      address,
      startblock: String(startBlock),
      endblock: '99999999',
      page: '1',
      offset: String(limit),
      sort: 'desc',
      apikey: key,
    };
    if (token) params.contractaddress = token;
    const { data } = await transport.get('https://api.etherscan.io/v2/api', { params, timeout: 15000 });
    if (!Array.isArray(data?.result)) return data?.message === 'No transactions found' ? [] : null;
    return data.result.slice(0, limit).map((t) =>
      tx({
        hash: t.hash,
        blockNumber: t.blockNumber,
        timeStamp: t.timeStamp ? Number(t.timeStamp) : null,
        from: t.from,
        to: t.to,
        valueWei: /^\d+$/.test(String(t.value ?? '')) ? String(t.value) : '0',
        tokenAddress: token ? String(t.contractAddress || token).toLowerCase() : null,
        tokenSymbol: token ? t.tokenSymbol || null : null,
        tokenDecimals: token && /^\d+$/.test(String(t.tokenDecimal ?? '')) ? Number(t.tokenDecimal) : null,
        logIndex: token && /^\d+$/.test(String(t.logIndex ?? '')) ? Number(t.logIndex) : null,
        status: t.isError === '1' ? 'failed' : 'ok',
      })
    );
  } catch {
    return null;
  }
}

const LOG_CHUNK = 1000;

async function tokenLogs(net, token, address, fromBlock, toBlock, side) {
  const out = [];
  const topics = side === 'in' ? [TRANSFER_TOPIC, null, pad32(address)] : [TRANSFER_TOPIC, pad32(address)];
  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK) {
    const end = Math.min(toBlock, start + LOG_CHUNK - 1);
    const logs = await rpc(rpcUrl(net), 'eth_getLogs', [
      { address: token, fromBlock: hex(start), toBlock: hex(end), topics },
    ]);
    for (const l of Array.isArray(logs) ? logs : []) {
      if (l.removed) continue;
      out.push(
        tx({
          hash: l.transactionHash,
          blockNumber: Number(big(l.blockNumber)),
          timeStamp: l.blockTimestamp ? Number(big(l.blockTimestamp)) : null,
          from: topicAddress(l.topics?.[1]),
          to: topicAddress(l.topics?.[2]),
          valueWei: big(l.data).toString(),
          tokenAddress: token,
          logIndex: Number(big(l.logIndex)),
        })
      );
    }
  }
  return out;
}

/**
 * ETH por varredura de blocos. Antes de ler os blocos, compara saldo e nonce no início e no fim da janela:
 * nonce igual = a carteira não enviou nada; nonce e saldo iguais = nada chegou → não lê os blocos.
 * (Transferências internas de contratos não aparecem em blocos; com Etherscan elas também não entram aqui.)
 */
async function ethScan(net, address, fromBlock, toBlock, direction) {
  const url = rpcUrl(net);
  if (fromBlock > 0) {
    try {
      const [b0, b1, n0, n1] = await rpcBatch(url, [
        { method: 'eth_getBalance', params: [address, hex(fromBlock - 1)] },
        { method: 'eth_getBalance', params: [address, hex(toBlock)] },
        { method: 'eth_getTransactionCount', params: [address, hex(fromBlock - 1)] },
        { method: 'eth_getTransactionCount', params: [address, hex(toBlock)] },
      ]);
      const sameNonce = big(n0) === big(n1);
      const sameBalance = big(b0) === big(b1);
      if (sameNonce && (sameBalance || direction === 'out')) return { txs: [], skipped: true };
      if (direction === 'in' && sameNonce && big(b1) < big(b0)) return { txs: [], skipped: true };
    } catch {
      // estado antigo podado no RPC: segue para a varredura
    }
  }
  const out = [];
  const BATCH = 10;
  for (let end = toBlock; end >= fromBlock; end -= BATCH) {
    const start = Math.max(fromBlock, end - BATCH + 1);
    const calls = [];
    for (let b = end; b >= start; b -= 1) calls.push({ method: 'eth_getBlockByNumber', params: [hex(b), true] });
    const blocks = await rpcBatch(url, calls);
    for (const block of blocks) {
      if (!block || !Array.isArray(block.transactions)) continue;
      const ts = Number(big(block.timestamp));
      for (const t of block.transactions) {
        const to = t.to ? t.to.toLowerCase() : null;
        const from = (t.from || '').toLowerCase();
        const incoming = to === address && big(t.value) > 0n;
        const outgoing = from === address;
        if ((direction === 'in' && incoming) || (direction === 'out' && outgoing) || (direction === 'all' && (incoming || outgoing))) {
          out.push(
            tx({
              hash: t.hash,
              blockNumber: Number(big(t.blockNumber ?? block.number)),
              timeStamp: ts,
              from,
              to,
              valueWei: big(t.value).toString(),
            })
          );
        }
      }
    }
  }
  return { txs: out, skipped: false };
}

const sortDesc = (a, b) => b.blockNumber - a.blockNumber || (b.logIndex ?? 0) - (a.logIndex ?? 0);

/**
 * Transações da carteira (mais novas primeiro).
 * direction: 'in' (recebidas), 'out' (enviadas) ou 'all'. fromBlock/toBlock limitam a janela.
 */
export async function fetchTransactions({ vertalKey, net, address, token, direction = 'in', limit = 20, fromBlock, toBlock }) {
  const want = (t) => {
    if (t.blockNumber < fromBlock || t.blockNumber > toBlock) return false;
    const incoming = t.to === address;
    const outgoing = t.from === address;
    if (direction === 'in') return incoming && (token || BigInt(t.valueWei || '0') > 0n);
    if (direction === 'out') return outgoing;
    return incoming || outgoing;
  };
  const key = etherscanKey();
  // Pede mais itens do que o limite porque o Etherscan também devolve as enviadas.
  const fetchLimit = Math.min(50, Math.max(limit * 2, 20));
  let txs = key ? await etherscanDirect(key, net, address, token, fromBlock, fetchLimit) : null;
  let source = txs ? 'etherscan' : null;
  if (!txs && vertalKey) {
    txs = await serverTxList(vertalKey, { chainId: net.chainId, tokenAddress: token, startBlock: fromBlock, limit: fetchLimit });
    if (txs) {
      source = 'etherscan';
      txs = txs.map((t) => tx({ ...t, from: t.from, to: t.to }));
    }
  }
  let skipped = false;
  if (!txs) {
    source = 'rpc';
    if (token) {
      const sides = direction === 'all' ? ['in', 'out'] : [direction];
      txs = [];
      for (const side of sides) txs.push(...(await tokenLogs(net, token, address, fromBlock, toBlock, side)));
      const meta = await tokenMeta(net, token);
      txs = txs.map((t) => ({ ...t, tokenSymbol: meta.symbol, tokenDecimals: meta.decimals }));
    } else {
      const r = await ethScan(net, address, fromBlock, toBlock, direction);
      txs = r.txs;
      skipped = r.skipped;
    }
  }
  const seen = new Set();
  const list = txs
    .filter(want)
    .filter((t) => {
      const k = `${t.hash}:${t.logIndex ?? ''}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .sort(sortDesc)
    .slice(0, limit);
  return { source, txs: list, fromBlock, toBlock, skipped };
}

/** Janela padrão: últimos N blocos confirmados (N = VERTAL_METAMASK_SCAN_BLOCKS). */
export async function defaultWindow(net, sinceBlock = null) {
  const toBlock = await headBlock(net);
  const floor = Math.max(0, toBlock - scanBlocks() + 1);
  const fromBlock = Number.isInteger(sinceBlock) && sinceBlock + 1 > floor ? Math.min(sinceBlock + 1, toBlock) : floor;
  return { fromBlock, toBlock };
}

/** Item no formato que vai para os próximos passos do fluxo. */
export function txItem(t, net, address) {
  const decimals = t.tokenAddress ? t.tokenDecimals ?? 18 : 18;
  return {
    rede: net.name,
    chainId: net.chainId,
    carteira: address,
    hash: t.hash,
    bloco: t.blockNumber,
    dataHora: t.timeStamp ? new Date(t.timeStamp * 1000).toISOString() : null,
    de: t.from,
    para: t.to,
    direcao: t.to === address ? 'recebida' : 'enviada',
    ativo: t.tokenAddress ? t.tokenSymbol || 'ERC-20' : 'ETH',
    token: t.tokenAddress || null,
    valor: fromUnits(t.valueWei || '0', decimals, 8),
    valorWei: String(t.valueWei || '0'),
    decimais: decimals,
    status: t.status || 'ok',
    link: `${net.explorer}/tx/${t.hash}`,
  };
}

export { normAddress };
