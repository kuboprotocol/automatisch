import { listAccounts } from '../common.js';

export default [
  {
    name: 'List accounts',
    key: 'listAccounts',
    async run($) {
      const accounts = await listAccounts($);
      return { data: accounts.map((a) => ({ value: a.name, name: `${a.displayName || a.name} (${a.state || ''})` })) };
    },
  },
];
