import defineAction from '../../../../helpers/define-action.js';
import {
  networkArgument,
  tokenArgument,
  walletArgument,
} from '../../common/arguments.js';
import { balanceOf, fromUnits, headBlock } from '../../common/chain.js';
import { stepContext } from '../../common/step.js';

export default defineAction({
  name: 'Consultar saldo',
  key: 'getBalance',
  description:
    'Lê o saldo em ETH ou de um token ERC-20 da carteira MetaMask conectada no Vertal Dev (só leitura). · Get balance · Consultar saldo',
  arguments: [networkArgument, walletArgument, tokenArgument],

  async run($) {
    const { net, token, address } = await stepContext($);
    const head = await headBlock(net);
    const b = await balanceOf(net, address, token, head);
    $.setActionItem({
      raw: {
        rede: net.name,
        chainId: net.chainId,
        carteira: address,
        ativo: b.symbol,
        token: token || null,
        decimais: b.decimals,
        bloco: head,
        saldo: fromUnits(b.wei, b.decimals, 8),
        saldoWei: b.wei.toString(),
        link: `${net.explorer}/address/${address}`,
      },
    });
  },
});
