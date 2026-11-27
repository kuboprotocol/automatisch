/* global BigInt */
import defineTrigger from '../../../../helpers/define-trigger.js';
import {
  networkArgument,
  tokenArgument,
  walletArgument,
} from '../../common/arguments.js';
import { balanceOf, fromUnits, headBlock } from '../../common/chain.js';
import { scanBlocks } from '../../common/config.js';
import { stepContext } from '../../common/step.js';

// internalId = bal:<chainId>:<carteira>:<token|eth>:<saldoWei>:<bloco>. O saldo anterior vem do último
// item processado; na primeira consulta, do saldo de N blocos atrás (se o RPC ainda tiver esse estado).
export const balanceKey = (net, address, token) =>
  `bal:${net.chainId}:${address}:${token || 'eth'}`;

export function previousFromInternalId(id, key) {
  const s = String(id || '');
  if (!s.startsWith(`${key}:`)) return null;
  const [wei] = s.slice(key.length + 1).split(':');
  return /^\d+$/.test(wei) ? BigInt(wei) : null;
}

export default defineTrigger({
  name: 'Saldo mudou',
  key: 'balanceChanged',
  pollInterval: 15,
  description:
    'Dispara quando o saldo (ETH ou um token ERC-20) da carteira MetaMask conectada no Vertal Dev muda (só leitura). · Balance changed · Saldo cambió',
  arguments: [networkArgument, walletArgument, tokenArgument],

  async run($) {
    const { net, token, address } = await stepContext($);
    const head = await headBlock(net);
    const current = await balanceOf(net, address, token, head);
    const key = balanceKey(net, address, token);

    let previous = previousFromInternalId($.flow?.lastInternalId, key);
    if (previous === null && !$.execution?.testRun) {
      try {
        previous = (
          await balanceOf(net, address, token, Math.max(0, head - scanBlocks()))
        ).wei;
      } catch {
        previous = current.wei; // estado antigo indisponível: só começa a comparar a partir de agora
      }
    }
    const changed = previous === null || previous !== current.wei;
    if (!changed && !$.execution?.testRun) return;

    const diff = previous === null ? null : current.wei - previous;
    $.pushTriggerItem({
      raw: {
        rede: net.name,
        chainId: net.chainId,
        carteira: address,
        ativo: current.symbol,
        token: token || null,
        decimais: current.decimals,
        bloco: head,
        saldoAtual: fromUnits(current.wei, current.decimals, 8),
        saldoAtualWei: current.wei.toString(),
        saldoAnterior:
          previous === null ? null : fromUnits(previous, current.decimals, 8),
        saldoAnteriorWei: previous === null ? null : previous.toString(),
        diferenca: diff === null ? null : fromUnits(diff, current.decimals, 8),
        diferencaWei: diff === null ? null : diff.toString(),
        link: `${net.explorer}/address/${address}`,
      },
      meta: { internalId: `${key}:${current.wei}:${head}` },
    });
  },
});
