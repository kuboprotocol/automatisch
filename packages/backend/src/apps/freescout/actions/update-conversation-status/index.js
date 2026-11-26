import defineAction from '../../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../../helpers/vertal-app-kit.js';
import { numericId } from '../../common/api.js';

export default defineAction({
  name: 'Update conversation status / assignee',
  key: 'updateConversation',
  description: 'Changes the status (active, pending, closed, spam) and/or the assignee of a conversation.',
  arguments: [
    stringArg('conversationId', 'Conversation ID', { required: true }),
    dynamicArg('byUser', 'Done by (agent)', 'listUsers'),
    optionsArg('status', 'Status', ['active', 'pending', 'closed', 'spam'], { required: false }),
    dynamicArg('assignTo', 'Assign to', 'listUsers', { required: false }),
  ],
  async run($) {
    const p = $.step.parameters;
    const conversationId = numericId(p.conversationId, 'Conversation ID');
    const body = { byUser: numericId(p.byUser, 'Agent') };
    if (['active', 'pending', 'closed', 'spam'].includes(p.status)) body.status = p.status;
    if (p.assignTo) body.assignTo = numericId(p.assignTo, 'Assignee');
    if (!body.status && !body.assignTo) throw new Error('FreeScout: choose a status or an assignee');
    await $.http.put(`/conversations/${conversationId}`, body, { headers: { 'Content-Type': 'application/json' } });
    $.setActionItem({ raw: { conversationId, ...body, updated: true } });
  },
});
