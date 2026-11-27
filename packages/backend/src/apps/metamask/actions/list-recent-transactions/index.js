import defineAction from '../../../../helpers/define-action.js';
import {
  networkArgument,
  tokenArgument,
  walletArgument,
} from '../../common/arguments.js';
import { defaultWindow, fetchTransactions, txItem } from '../../common/chain.js';
import { scanBlocks } from '../../common/config.js';
import { stepContext } from '../../common/step.js';

export default defineAction({
  name: 'Listar transações recentes',
  key: 'listRecentTransactions',
  description:
    'Lista as transações recentes da carteira MetaMask conectada no Vertal Dev (ETH ou um token ERC-20; só leitura). · List recent transactions · Listar transacciones recientes',
  arguments: [
    networkArgument,
    walletArgument,
    tokenArgument,
    {
      label: 'Quais transações',
      key: 'direction',
      type: 'dropdown',
      required: false,
      value: 'all',
      variables: false,
      options: [
        { label: 'Todas', value: 'all' },
        { label: 'Recebidas', value: 'in' },
        { label: 'Enviadas', value: 'out' },
      ],
    },
    {
      label: 'Quantidade (1–50)',
      key: 'limit',
      type: 'string',
      required: false,
      value: '10',
      variables: true,
    },
  ],

  async run($) {
    const { net, token, address } = await stepContext($);
    const p = $.step.parameters || {};
    const direction = ['all', 'in', 'out'].includes(p.direction) ? p.direction : 'all';
    const limit = Math.min(50, Math.max(1, Math.floor(Number(p.limit) || 10)));
    const { fromBlock, toBlock } = await defaultWindow(net);
    // Com Etherscan o histórico não fica preso à janela de blocos recentes.
    const r = await fetchTransactions({
      vertalKey: $.auth.data.vertalKey,
      net,
      address,
      token,
      direction,
      limit,
      fromBlock,
      toBlock,
    });
    let txs = r.txs;
    let source = r.source;
    if (r.source === 'etherscan' && txs.length < limit) {
      const full = await fetchTransactions({
        vertalKey: $.auth.data.vertalKey, net, address, token, direction, limit, fromBlock: 0, toBlock,
      });
      if (full.source === 'etherscan') {
        txs = full.txs;
        source = full.source;
      }
    }
    $.setActionItem({
      raw: {
        rede: net.name,
        chainId: net.chainId,
        carteira: address,
        fonte: source,
        blocos: source === 'rpc' ? { de: fromBlock, ate: toBlock, quantidade: scanBlocks() } : null,
        aviso:
          source === 'rpc'
            ? `Sem Etherscan: só os últimos ${scanBlocks()} blocos confirmados foram lidos.`
            : null,
        total: txs.length,
        transacoes: txs.map((t) => txItem(t, net, address)),
      },
    });
  },
});
