import { listIgAccounts } from '../common.js';

export default [
  {
    name: 'List Instagram accounts',
    key: 'listIgAccounts',
    async run($) {
      const accounts = await listIgAccounts($);
      return { data: accounts.map((a) => ({ value: a.id, name: a.pageName ? `@${a.username || a.id} (${a.pageName})` : `@${a.username || a.id}` })) };
    },
  },
];
