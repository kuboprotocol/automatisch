import defineTrigger from '../../../../helpers/define-trigger.js';
import {
  networkArgument,
  tokenArgument,
  walletArgument,
} from '../../common/arguments.js';
import {
  defaultWindow,
  fetchTransactions,
  txItem,
} from '../../common/chain.js';
import { stepContext } from '../../common/step.js';

// internalId = tx:<chainId>:<bloco>:<hash>:<logIndex|-> — o bloco do último item processado diz de onde
// continuar a varredura (sem estado extra no banco).
export const txInternalId = (net, t) =>
  `tx:${net.chainId}:${t.blockNumber}:${t.hash}:${t.logIndex ?? '-'}`;

export function blockFromInternalId(id, chainId) {
  const m = /^tx:(\d+):(\d+):/.exec(String(id || ''));
  return m && Number(m[1]) === chainId ? Number(m[2]) : null;
}

export default defineTrigger({
  name: 'Nova transação recebida',
  key: 'newIncomingTransaction',
  pollInterval: 15,
  description:
    'Dispara quando a carteira MetaMask conectada no Vertal Dev recebe ETH ou um token ERC-20 (só leitura). · New incoming transaction · Nueva transacción recibida',
  arguments: [networkArgument, walletArgument, tokenArgument],

  async run($) {
    const { net, token, address } = await stepContext($);
    const since = blockFromInternalId($.flow?.lastInternalId, net.chainId);
    const { fromBlock, toBlock } = await defaultWindow(net, since);
    const { txs, source } = await fetchTransactions({
      vertalKey: $.auth.data.vertalKey,
      net,
      address,
      token,
      direction: 'in',
      limit: 20,
      fromBlock,
      toBlock,
    });
    // Mais novo primeiro: o motor para no primeiro item já processado.
    for (const t of txs) {
      $.pushTriggerItem({
        raw: { ...txItem(t, net, address), fonte: source },
        meta: { internalId: txInternalId(net, t) },
      });
    }
  },
});
