import defineAction from '../../../../helpers/define-action.js';
import { optionsArg } from '../../../../helpers/vertal-app-kit.js';

export const ACCOUNT_TYPES = ['asset', 'expense', 'revenue', 'liabilities', 'all'];

export default defineAction({
  name: 'List accounts',
  key: 'listAccounts',
  description: 'Lists Firefly III accounts with current balance (asset accounts by default).',
  arguments: [optionsArg('type', 'Account type', ACCOUNT_TYPES, { required: false, value: 'asset' })],
  async run($) {
    const type = ACCOUNT_TYPES.includes($.step.parameters.type) ? $.step.parameters.type : 'asset';
    const { data } = await $.http.get('/v1/accounts', { params: { type, limit: 100, page: 1 } });
    $.setActionItem({
      raw: {
        accounts: (data?.data || []).map((a) => ({
          id: a.id,
          name: a.attributes?.name,
          type: a.attributes?.type,
          current_balance: a.attributes?.current_balance,
          currency_code: a.attributes?.currency_code,
          active: a.attributes?.active,
        })),
      },
    });
  },
});
