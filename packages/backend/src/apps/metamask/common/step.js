// Lê e valida os parâmetros comuns de um passo.
import { network, normAddress } from './config.js';
import { msg } from './messages.js';
import { resolveWallet } from './vertal-wallet.js';

export async function stepContext($) {
  const p = $.step?.parameters || {};
  const net = network(p.network);
  if (!net) throw new Error(msg('badNetwork'));
  const rawToken = String(p.tokenAddress ?? '').trim();
  const token = rawToken ? normAddress(rawToken) : null;
  if (rawToken && !token) throw new Error(msg('badToken'));
  const address = await resolveWallet($);
  return { net, token, address };
}
