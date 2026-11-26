import defineAction from '../../../../helpers/define-action.js';
import { stringArg } from '../../../../helpers/vertal-app-kit.js';
import { mondayQuery } from '../../common.js';

// Comentário ("update") num item do board. Escopo updates:write.
export default defineAction({
  name: 'Create update (comment) on item',
  key: 'createUpdate',
  description: 'Posts an update (comment) on a monday.com item. Text or simple HTML.',
  arguments: [
    stringArg('itemId', 'Item ID', { required: true, description: 'Numeric item ID (from the item URL or the Create item result).' }),
    stringArg('body', 'Text', { required: true }),
  ],
  async run($) {
    const itemId = String($.step.parameters.itemId ?? '').trim();
    if (!/^\d{1,20}$/.test(itemId)) throw new Error('monday.com: Item ID must be numeric');
    const body = String($.step.parameters.body ?? '').trim();
    if (!body) throw new Error('monday.com: text is required');
    const data = await mondayQuery(
      $,
      'mutation ($itemId: ID!, $body: String!) { create_update (item_id: $itemId, body: $body) { id body created_at } }',
      { itemId, body: body.slice(0, 20000) }
    );
    $.setActionItem({ raw: data?.create_update ?? data });
  },
});
