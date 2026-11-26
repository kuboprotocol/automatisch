import defineAction from '../../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../../helpers/vertal-app-kit.js';
import { TRANSACTION_TYPES, buildTransaction } from '../../common/transactions.js';

export default defineAction({
  name: 'Create transaction',
  key: 'createTransaction',
  description:
    'Creates a transaction (expense, income or transfer). Withdrawal: source = your asset account, destination = expense account (name is created if new). Deposit: source = revenue account, destination = asset account.',
  arguments: [
    optionsArg('type', 'Type', TRANSACTION_TYPES, { value: 'withdrawal' }),
    stringArg('description', 'Description', { required: true }),
    stringArg('amount', 'Amount', { required: true, description: 'e.g. 49.90' }),
    stringArg('date', 'Date (YYYY-MM-DD)', { description: 'Empty = today.' }),
    { ...dynamicArg('sourceId', 'Source account (asset)', 'listAssetAccounts', { required: false }) },
    stringArg('sourceName', 'Source account name', { description: 'Used when no source account is selected (e.g. the employer for a deposit).' }),
    { ...dynamicArg('destinationId', 'Destination account (asset)', 'listAssetAccounts', { required: false }) },
    stringArg('destinationName', 'Destination account name', { description: 'e.g. the store for an expense.' }),
    stringArg('categoryName', 'Category'),
    stringArg('currencyCode', 'Currency code', { description: 'e.g. BRL. Empty = account currency.' }),
    stringArg('tags', 'Tags (comma separated)'),
    stringArg('notes', 'Notes'),
  ],
  async run($) {
    const body = buildTransaction($.step.parameters);
    const { data } = await $.http.post('/v1/transactions', body, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/vnd.api+json' },
    });
    const journal = data?.data;
    $.setActionItem({
      raw: {
        id: journal?.id,
        transactions: (journal?.attributes?.transactions || []).map((t) => ({
          transaction_journal_id: t.transaction_journal_id,
          type: t.type,
          date: t.date,
          amount: t.amount,
          currency_code: t.currency_code,
          description: t.description,
          source_name: t.source_name,
          destination_name: t.destination_name,
          category_name: t.category_name,
        })),
      },
    });
  },
});
