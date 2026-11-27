/* global BigInt */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import app from './index.js';
import auth from './auth/index.js';
import triggers from './triggers/index.js';
import actions from './actions/index.js';
import listWalletsData from './dynamic-data/list-wallets/index.js';
import { transport } from './common/transport.js';
import { READ_METHODS, resetRateLimiter, rpc, rpcBatch } from './common/rpc.js';
import {
  decodeSymbol,
  fromUnits,
  pad32,
  TRANSFER_TOPIC,
} from './common/chain.js';
import { resetServerEtherscanCache } from './common/vertal-wallet.js';
import { LANGS, MESSAGE_KEYS, msg, textsFor } from './common/messages.js';
import { blockFromInternalId } from './triggers/new-incoming-transaction/index.js';
import { previousFromInternalId } from './triggers/balance-changed/index.js';

const ADDR = '0x6166b1c44eaf1102312f4b1ccc82316b163f6d06';
const OTHER = '0x00000000000000000000000000000000000000aa';
const TOKEN = '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984';
const SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';
const WALLET_URL =
  'https://sccizjlpwezsgaxkclot.supabase.co/functions/v1/vertal-code-ai?app=wallet';

const ENV_KEYS = [
  'VERTAL_METAMASK_FLUXOS_ENABLED',
  'VERTAL_METAMASK_ETHERSCAN_KEY',
  'VERTAL_METAMASK_SCAN_BLOCKS',
  'VERTAL_METAMASK_CONFIRMATIONS',
  'VERTAL_METAMASK_RPC_RPS',
  'VERTAL_METAMASK_FLUXOS_LANG',
  'VERTAL_BROKER_ANON_KEY',
];
const saved = {};
const original = { ...transport };

const hex = (n) => `0x${BigInt(n).toString(16)}`;

/**
 * Rede falsa: head, saldos/nonce por bloco, blocos com transações, logs ERC-20.
 * Também responde ao Vertal Dev (?app=wallet) e ao Etherscan.
 */
function fakeNet(opts = {}) {
  const state = {
    head: 1000,
    wallets: [
      { address: ADDR, chainId: 11155111, connectedAt: '2026-11-27T12:00:00Z' },
    ],
    walletError: null,
    serverTx: { ok: true, available: false },
    balance: () => 5n * 10n ** 18n,
    nonce: () => 3n,
    blocks: {},
    logs: [],
    tokenBalance: 1234500000n,
    tokenDecimals: 6,
    tokenSymbol: 'UNI',
    batchSupported: true,
    etherscan: null,
    fail429: 0,
    ...opts,
  };
  const calls = { rpc: [], wallet: [], get: [], batches: 0, sleeps: [] };

  const blockArg = (b) => (b === 'latest' ? state.head : Number(BigInt(b)));
  const answer = (method, params) => {
    calls.rpc.push({ method, params });
    switch (method) {
      case 'eth_blockNumber':
        return hex(state.head);
      case 'eth_getBalance':
        return hex(state.balance(blockArg(params[1])));
      case 'eth_getTransactionCount':
        return hex(state.nonce(blockArg(params[1])));
      case 'eth_getBlockByNumber': {
        const n = Number(BigInt(params[0]));
        return {
          number: hex(n),
          timestamp: hex(1700000000 + n),
          transactions: state.blocks[n] || [],
        };
      }
      case 'eth_getLogs': {
        const f = params[0];
        const from = Number(BigInt(f.fromBlock));
        const to = Number(BigInt(f.toBlock));
        return state.logs.filter((l) => {
          const b = Number(BigInt(l.blockNumber));
          if (b < from || b > to || l.address !== f.address) return false;
          return f.topics.every((t, i) => t === null || t === l.topics[i]);
        });
      }
      case 'eth_call': {
        const data = params[0].data;
        if (data.startsWith('0x70a08231')) return hex(state.tokenBalance);
        if (data === '0x313ce567') return hex(state.tokenDecimals);
        if (data === '0x95d89b41') {
          const b = Buffer.from(state.tokenSymbol).toString('hex');
          return `0x${(32).toString(16).padStart(64, '0')}${(b.length / 2)
            .toString(16)
            .padStart(64, '0')}${b.padEnd(64, '0')}`;
        }
        return '0x';
      }
      default:
        throw new Error(`unexpected ${method}`);
    }
  };

  transport.post = async (url, body, config) => {
    if (url === WALLET_URL || url.startsWith('https://wallet.test')) {
      calls.wallet.push({ url, body, headers: config.headers });
      if (state.walletError) {
        const e = new Error('Request failed');
        e.response = {
          status: state.walletError.status,
          data: { error: state.walletError.error },
        };
        throw e;
      }
      if (body.op === 'addresses')
        return { data: { ok: true, wallets: state.wallets } };
      if (body.op === 'txlist') return { data: state.serverTx };
      return { data: { ok: false, error: 'invalid_op' } };
    }
    if (state.fail429 > 0) {
      state.fail429 -= 1;
      const e = new Error('429');
      e.response = { status: 429, headers: { 'retry-after': '1' } };
      throw e;
    }
    if (Array.isArray(body)) {
      calls.batches += 1;
      if (!state.batchSupported)
        return {
          data: { jsonrpc: '2.0', error: { message: 'batch not supported' } },
        };
      return {
        data: body.map((b) => ({
          jsonrpc: '2.0',
          id: b.id,
          result: answer(b.method, b.params),
        })),
      };
    }
    expect([SEPOLIA_RPC, 'https://ethereum-rpc.publicnode.com']).toContain(url);
    return {
      data: {
        jsonrpc: '2.0',
        id: body.id,
        result: answer(body.method, body.params),
      },
    };
  };
  transport.get = async (url, config) => {
    calls.get.push({ url, params: config.params });
    return { data: state.etherscan };
  };
  transport.sleep = async (ms) => {
    calls.sleeps.push(ms);
  };
  transport.now = () => 1_000_000;
  return { state, calls };
}

function ctx(parameters = {}, extra = {}) {
  const out = { items: [], action: null };
  const $ = {
    auth: {
      data: { vertalKey: 'vfk1.test', screenName: '' },
      set: async (v) => Object.assign($.auth.data, v),
    },
    step: { parameters },
    flow: { lastInternalId: extra.lastInternalId ?? null },
    execution: { testRun: !!extra.testRun },
    pushTriggerItem: (item) => out.items.push(item),
    setActionItem: (item) => {
      out.action = item;
    },
  };
  return { $, out };
}

const trigger = (key) => triggers.find((t) => t.key === key);
const action = (key) => actions.find((a) => a.key === key);

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  process.env.VERTAL_METAMASK_FLUXOS_ENABLED = 'true';
  process.env.VERTAL_METAMASK_RPC_RPS = '25';
  resetRateLimiter();
  resetServerEtherscanCache();
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  Object.assign(transport, original);
});

describe('metamask app: definition', () => {
  it('is registered as a read-only app with two triggers and two actions', () => {
    expect(app.key).toBe('metamask');
    expect(app.name).toBe('MetaMask (Vertal Wallet)');
    expect(triggers.map((t) => t.key)).toEqual([
      'newIncomingTransaction',
      'balanceChanged',
    ]);
    expect(actions.map((a) => a.key)).toEqual([
      'getBalance',
      'listRecentTransactions',
    ]);
    expect(triggers.every((t) => t.pollInterval === 15)).toBe(true);
    expect(auth.fields.map((f) => f.key)).toEqual(['screenName', 'vertalKey']);
  });

  it('never asks for a private key or seed phrase and only allows read RPC methods', () => {
    const keys = JSON.stringify([
      auth.fields,
      triggers.map((t) => t.arguments),
      actions.map((a) => a.arguments),
    ]);
    expect(keys).not.toMatch(/"key":"[^"]*(private|seed|mnemonic|secret)/i);
    for (const m of [
      'eth_sendRawTransaction',
      'eth_sendTransaction',
      'eth_sign',
      'personal_sign',
      'eth_signTypedData_v4',
    ]) {
      expect(READ_METHODS.has(m)).toBe(false);
    }
  });

  it('refuses any non-read RPC method before sending', async () => {
    const { calls } = fakeNet();
    await expect(
      rpc(SEPOLIA_RPC, 'eth_sendRawTransaction', ['0x00'])
    ).rejects.toThrow('method_not_allowed');
    await expect(
      rpcBatch(SEPOLIA_RPC, [{ method: 'eth_sign', params: [] }])
    ).rejects.toThrow('method_not_allowed');
    expect(calls.rpc).toEqual([]);
  });

  it('has every message in pt, en and es', () => {
    expect(LANGS).toEqual(['pt', 'en', 'es']);
    for (const l of LANGS) {
      for (const k of MESSAGE_KEYS) expect(textsFor(l)[k]).toBeTruthy();
    }
    process.env.VERTAL_METAMASK_FLUXOS_LANG = 'es-AR';
    expect(msg('noWallet')).toContain('ninguna billetera');
    process.env.VERTAL_METAMASK_FLUXOS_LANG = 'en';
    expect(msg('noWallet')).toContain('no wallet connected');
  });
});

describe('metamask app: gating and connection', () => {
  it('is off by default: no call leaves the app', async () => {
    delete process.env.VERTAL_METAMASK_FLUXOS_ENABLED;
    const { calls } = fakeNet();
    const { $ } = ctx();
    await expect(auth.verifyCredentials($)).rejects.toThrow(
      'não está liberado nesta instância'
    );
    await expect(
      action('getBalance').run(ctx({ network: 'sepolia' }).$)
    ).rejects.toThrow('não está liberado');
    expect(calls.wallet).toEqual([]);
    expect(calls.rpc).toEqual([]);
  });

  it('looks the wallet up in Vertal Dev with the user key and names the connection', async () => {
    process.env.VERTAL_BROKER_ANON_KEY = 'anon';
    const { calls } = fakeNet();
    const { $ } = ctx();
    await auth.verifyCredentials($);
    expect(calls.wallet[0].body).toEqual({ op: 'addresses' });
    expect(calls.wallet[0].headers['X-Vertal-Fluxos-Key']).toBe('vfk1.test');
    expect(calls.wallet[0].headers.apikey).toBe('anon');
    expect($.auth.data.screenName).toBe('MetaMask 0x6166…6d06');
    expect(await auth.isStillVerified($)).toBe(true);
  });

  it('points to the setup page when no wallet is connected', async () => {
    fakeNet({ wallets: [] });
    const { $ } = ctx();
    await expect(auth.verifyCredentials($)).rejects.toThrow(
      'https://vertal.dev/connectors/metamask/setup'
    );
    expect(await auth.isStillVerified($)).toBe(false);
  });

  it('explains when the account is not enabled on Vertal Dev', async () => {
    fakeNet({
      walletError: { status: 404, error: 'vertal_metamask_fluxos_disabled' },
    });
    await expect(auth.verifyCredentials(ctx().$)).rejects.toThrow(
      'ainda não liberado para esta conta'
    );
  });

  it('only reads wallets the user connected', async () => {
    fakeNet();
    await expect(
      action('getBalance').run(ctx({ network: 'sepolia', wallet: OTHER }).$)
    ).rejects.toThrow('não está entre as conectadas');
    const r = await listWalletsData.run(ctx().$);
    expect(r.data).toEqual([{ value: ADDR, name: 'MetaMask 0x6166…6d06' }]);
  });

  it('validates the network and token address', async () => {
    fakeNet();
    await expect(
      action('getBalance').run(ctx({ network: 'polygon' }).$)
    ).rejects.toThrow('rede inválida');
    await expect(
      action('getBalance').run(
        ctx({ network: 'sepolia', tokenAddress: '0x12' }).$
      )
    ).rejects.toThrow('token ERC-20 inválido');
  });
});

describe('metamask app: RPC client', () => {
  it('retries a 429 honoring Retry-After and throttles', async () => {
    const { calls } = fakeNet({ fail429: 1 });
    process.env.VERTAL_METAMASK_RPC_RPS = '2';
    const r = await rpc(SEPOLIA_RPC, 'eth_blockNumber');
    expect(r).toBe(hex(1000));
    expect(calls.sleeps).toContain(1000); // Retry-After: 1
  });

  it('gives a clear message after the retries', async () => {
    fakeNet({ fail429: 10 });
    await expect(rpc(SEPOLIA_RPC, 'eth_blockNumber')).rejects.toThrow(
      'RPC da rede não respondeu'
    );
  });

  it('falls back to single calls when the RPC refuses batches', async () => {
    const { calls } = fakeNet({ batchSupported: false });
    const out = await rpcBatch(SEPOLIA_RPC, [
      { method: 'eth_blockNumber' },
      { method: 'eth_getBalance', params: [ADDR, 'latest'] },
    ]);
    expect(out[0]).toBe(hex(1000));
    expect(calls.batches).toBe(1);
  });

  it('formats units and decodes token symbols', () => {
    expect(fromUnits(1500000000000000000n, 18)).toBe('1.5');
    expect(fromUnits(-25n, 1)).toBe('-2.5');
    expect(
      decodeSymbol(`0x${Buffer.from('USDC').toString('hex').padEnd(64, '0')}`)
    ).toBe('USDC');
  });
});

describe('metamask app: actions', () => {
  it('reads the ETH balance at the confirmed head', async () => {
    const { calls } = fakeNet();
    const { $, out } = ctx({ network: 'sepolia' });
    await action('getBalance').run($);
    expect(out.action.raw).toMatchObject({
      carteira: ADDR,
      ativo: 'ETH',
      saldo: '5',
      saldoWei: '5000000000000000000',
      bloco: 998, // 2 confirmações
      chainId: 11155111,
    });
    const bal = calls.rpc.find((c) => c.method === 'eth_getBalance');
    expect(bal.params).toEqual([ADDR, hex(998)]);
  });

  it('reads an ERC-20 balance with decimals and symbol', async () => {
    const { calls } = fakeNet();
    const { $, out } = ctx({
      network: 'sepolia',
      tokenAddress: TOKEN.toUpperCase().replace('0X', '0x'),
    });
    await action('getBalance').run($);
    expect(out.action.raw).toMatchObject({
      ativo: 'UNI',
      saldo: '1234.5',
      decimais: 6,
      token: TOKEN,
    });
    const call = calls.rpc.find(
      (c) =>
        c.method === 'eth_call' && c.params[0].data.startsWith('0x70a08231')
    );
    expect(call.params[0].data).toBe(`0x70a08231${pad32(ADDR).slice(2)}`);
  });

  it('lists recent transactions from a bounded block scan without Etherscan', async () => {
    process.env.VERTAL_METAMASK_SCAN_BLOCKS = '20';
    const { calls } = fakeNet({
      nonce: (b) => (b >= 990 ? 4n : 3n),
      blocks: {
        985: [
          {
            hash: '0xin1',
            from: OTHER,
            to: ADDR,
            value: hex(10n ** 17n),
            blockNumber: hex(985),
          },
        ],
        992: [
          {
            hash: '0xout1',
            from: ADDR,
            to: OTHER,
            value: hex(1n),
            blockNumber: hex(992),
          },
        ],
        999: [
          {
            hash: '0xtoo-new',
            from: OTHER,
            to: ADDR,
            value: hex(1n),
            blockNumber: hex(999),
          },
        ],
      },
    });
    const { $, out } = ctx({
      network: 'sepolia',
      direction: 'all',
      limit: '5',
    });
    await action('listRecentTransactions').run($);
    expect(out.action.raw.fonte).toBe('rpc');
    expect(out.action.raw.transacoes.map((t) => t.hash)).toEqual([
      '0xout1',
      '0xin1',
    ]);
    expect(out.action.raw.transacoes[1]).toMatchObject({
      direcao: 'recebida',
      valor: '0.1',
      ativo: 'ETH',
    });
    expect(out.action.raw.blocos).toEqual({
      de: 979,
      ate: 998,
      quantidade: 20,
    });
    // Lê só a janela (20 blocos), em lotes.
    expect(
      calls.rpc.filter((c) => c.method === 'eth_getBlockByNumber')
    ).toHaveLength(20);
    // Pergunta ao Vertal Dev se há Etherscan lá (não há).
    expect(calls.wallet.some((c) => c.body.op === 'txlist')).toBe(true);
  });

  it('uses Etherscan directly when the Railway key is set', async () => {
    process.env.VERTAL_METAMASK_ETHERSCAN_KEY = 'RAILWAYKEY';
    const { calls } = fakeNet({
      etherscan: {
        status: '1',
        result: [
          {
            hash: '0xe1',
            blockNumber: '995',
            timeStamp: '1700000000',
            from: OTHER,
            to: ADDR,
            value: '7',
            isError: '0',
          },
          {
            hash: '0xe0',
            blockNumber: '500',
            timeStamp: '1690000000',
            from: ADDR,
            to: OTHER,
            value: '1',
            isError: '1',
          },
        ],
      },
    });
    const { $, out } = ctx({
      network: 'mainnet',
      direction: 'all',
      limit: '10',
    });
    await action('listRecentTransactions').run($);
    expect(out.action.raw.fonte).toBe('etherscan');
    expect(out.action.raw.transacoes.map((t) => t.hash)).toEqual([
      '0xe1',
      '0xe0',
    ]);
    expect(out.action.raw.transacoes[1].status).toBe('failed');
    expect(calls.get[0].url).toBe('https://api.etherscan.io/v2/api');
    expect(calls.get[0].params).toMatchObject({
      chainid: '1',
      action: 'txlist',
      address: ADDR,
      apikey: 'RAILWAYKEY',
    });
    expect(calls.rpc.some((c) => c.method === 'eth_getBlockByNumber')).toBe(
      false
    );
  });
});

describe('metamask app: triggers', () => {
  it('new incoming transaction: skips reading blocks when nonce and balance did not change', async () => {
    const { calls } = fakeNet();
    const { $, out } = ctx({ network: 'sepolia' });
    await trigger('newIncomingTransaction').run($);
    expect(out.items).toEqual([]);
    expect(calls.rpc.some((c) => c.method === 'eth_getBlockByNumber')).toBe(
      false
    );
  });

  it('new incoming transaction: pushes incoming ETH newest first and resumes after the last block', async () => {
    process.env.VERTAL_METAMASK_SCAN_BLOCKS = '50';
    const { calls } = fakeNet({
      balance: (b) => (b >= 990 ? 6n * 10n ** 18n : 5n * 10n ** 18n),
      blocks: {
        990: [
          {
            hash: '0xa',
            from: OTHER,
            to: ADDR,
            value: hex(10n ** 18n),
            blockNumber: hex(990),
          },
          {
            hash: '0xzero',
            from: OTHER,
            to: ADDR,
            value: '0x0',
            blockNumber: hex(990),
          },
        ],
        995: [
          {
            hash: '0xb',
            from: OTHER,
            to: ADDR,
            value: hex(2n),
            blockNumber: hex(995),
          },
        ],
        996: [
          {
            hash: '0xout',
            from: ADDR,
            to: OTHER,
            value: hex(1n),
            blockNumber: hex(996),
          },
        ],
      },
    });
    const { $, out } = ctx(
      { network: 'sepolia' },
      { lastInternalId: 'tx:11155111:980:0xold:-' }
    );
    await trigger('newIncomingTransaction').run($);
    expect(out.items.map((i) => i.raw.hash)).toEqual(['0xb', '0xa']);
    expect(out.items[1].meta.internalId).toBe('tx:11155111:990:0xa:-');
    expect(out.items[1].raw).toMatchObject({
      valor: '1',
      de: OTHER,
      para: ADDR,
      fonte: 'rpc',
      link: 'https://sepolia.etherscan.io/tx/0xa',
    });
    // Continua do bloco 981 (o último processado foi 980), não da janela inteira.
    const scanned = calls.rpc
      .filter((c) => c.method === 'eth_getBlockByNumber')
      .map((c) => Number(BigInt(c.params[0])));
    expect(Math.min(...scanned)).toBe(981);
    expect(Math.max(...scanned)).toBe(998);
  });

  it('new incoming transaction: ERC-20 via Transfer logs filtered by recipient', async () => {
    const { calls } = fakeNet({
      logs: [
        {
          address: TOKEN,
          blockNumber: hex(970),
          transactionHash: '0xt1',
          logIndex: hex(3),
          data: hex(2500000n),
          topics: [TRANSFER_TOPIC, pad32(OTHER), pad32(ADDR)],
        },
        {
          address: TOKEN,
          blockNumber: hex(971),
          transactionHash: '0xt2',
          logIndex: hex(0),
          data: hex(1n),
          topics: [TRANSFER_TOPIC, pad32(ADDR), pad32(OTHER)],
        },
      ],
    });
    const { $, out } = ctx({ network: 'sepolia', tokenAddress: TOKEN });
    await trigger('newIncomingTransaction').run($);
    expect(out.items).toHaveLength(1);
    expect(out.items[0].raw).toMatchObject({
      hash: '0xt1',
      ativo: 'UNI',
      valor: '2.5',
      token: TOKEN,
    });
    expect(out.items[0].meta.internalId).toBe('tx:11155111:970:0xt1:3');
    const logs = calls.rpc.find((c) => c.method === 'eth_getLogs');
    expect(logs.params[0].topics).toEqual([TRANSFER_TOPIC, null, pad32(ADDR)]);
  });

  it('asks Vertal Dev for Etherscan only once while it says "not available"', async () => {
    const { calls } = fakeNet();
    await trigger('newIncomingTransaction').run(ctx({ network: 'sepolia' }).$);
    await trigger('newIncomingTransaction').run(ctx({ network: 'sepolia' }).$);
    expect(calls.wallet.filter((c) => c.body.op === 'txlist')).toHaveLength(1);
  });

  it('balance changed: silent when equal, fires with the difference when it changes', async () => {
    const net = fakeNet();
    const key = `bal:11155111:${ADDR}:eth`;
    const same = ctx(
      { network: 'sepolia' },
      { lastInternalId: `${key}:5000000000000000000:900` }
    );
    await trigger('balanceChanged').run(same.$);
    expect(same.out.items).toEqual([]);

    net.state.balance = () => 4n * 10n ** 18n;
    const changed = ctx(
      { network: 'sepolia' },
      { lastInternalId: `${key}:5000000000000000000:900` }
    );
    await trigger('balanceChanged').run(changed.$);
    expect(changed.out.items[0].raw).toMatchObject({
      saldoAnterior: '5',
      saldoAtual: '4',
      diferenca: '-1',
      ativo: 'ETH',
    });
    expect(changed.out.items[0].meta.internalId).toBe(
      `${key}:4000000000000000000:998`
    );
  });

  it('balance changed: first run compares with N blocks ago; test run always returns a sample', async () => {
    fakeNet({ balance: (b) => (b >= 950 ? 7n : 5n) });
    const first = ctx({ network: 'sepolia' });
    await trigger('balanceChanged').run(first.$);
    expect(first.out.items[0].raw).toMatchObject({
      saldoAnteriorWei: '5',
      saldoAtualWei: '7',
      diferencaWei: '2',
    });

    fakeNet();
    const test = ctx({ network: 'sepolia' }, { testRun: true });
    await trigger('balanceChanged').run(test.$);
    expect(test.out.items).toHaveLength(1);
    expect(test.out.items[0].raw.saldoAnterior).toBeNull();
  });

  it('parses its own internal ids', () => {
    expect(blockFromInternalId('tx:1:123:0xa:-', 1)).toBe(123);
    expect(blockFromInternalId('tx:1:123:0xa:-', 11155111)).toBeNull();
    expect(blockFromInternalId('bal:1:x', 1)).toBeNull();
    expect(previousFromInternalId('bal:1:0xa:eth:42:7', 'bal:1:0xa:eth')).toBe(
      42n
    );
    expect(
      previousFromInternalId('bal:1:0xa:0xt:42:7', 'bal:1:0xa:eth')
    ).toBeNull();
  });
});
