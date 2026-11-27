import { shortAddress } from '../../common/config.js';
import { listWallets } from '../../common/vertal-wallet.js';

export default {
  name: 'Listar carteiras conectadas',
  key: 'listWallets',

  async run($) {
    const wallets = await listWallets($.auth.data.vertalKey);
    return {
      data: wallets.map((w) => ({
        value: w.address,
        name: `MetaMask ${shortAddress(w.address)}`,
      })),
    };
  },
};
