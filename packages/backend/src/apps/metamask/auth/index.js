// Conexão: a mesma chave do Vertal Fluxos (vfk1) do app "Vertal". Nada de chave privada, frase-semente
// ou assinatura: o app só lê os endereços públicos que o usuário já conectou no Vertal Dev.
import { shortAddress } from '../common/config.js';
import { msg } from '../common/messages.js';
import { listWallets } from '../common/vertal-wallet.js';

const wallets = ($) => listWallets($.auth.data.vertalKey);

export default {
  fields: [
    {
      key: 'screenName',
      label: 'Nome da conexão',
      type: 'string',
      required: false,
      readOnly: false,
      value: null,
      placeholder: null,
      description: 'Em branco = "MetaMask 0x1234…abcd".',
      clickToCopy: false,
    },
    {
      key: 'vertalKey',
      label: 'Chave do Vertal Fluxos',
      type: 'string',
      required: true,
      readOnly: false,
      value: null,
      placeholder: null,
      description:
        'A mesma VERTAL_FLUXOS_KEY do app "Vertal" (Cofre do Vertal Dev). A carteira vem de https://vertal.dev/connectors/metamask/setup — nunca digite aqui chave privada ou frase-semente.',
      clickToCopy: false,
    },
  ],

  async verifyCredentials($) {
    const list = await wallets($);
    if (!list.length) throw new Error(msg('noWallet'));
    await $.auth.set({
      screenName:
        $.auth.data.screenName || `MetaMask ${shortAddress(list[0].address)}`,
    });
  },

  async isStillVerified($) {
    try {
      return (await wallets($)).length > 0;
    } catch {
      return false;
    }
  },
};
