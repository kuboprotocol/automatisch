import defineAction from '../../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../../helpers/vertal-app-kit.js';
import { STATUSES, numericId, resourceId } from '../../common/api.js';

export default defineAction({
  name: 'Reply to conversation',
  key: 'replyToConversation',
  description: 'Adds an agent reply (sent to the customer by e-mail) or an internal note to a conversation.',
  arguments: [
    stringArg('conversationId', 'Conversation ID', { required: true }),
    optionsArg('type', 'Type', [
      { label: 'Reply (e-mail to customer)', value: 'message' },
      { label: 'Internal note', value: 'note' },
    ], { value: 'message' }),
    stringArg('text', 'Text', { required: true }),
    dynamicArg('userId', 'Agent', 'listUsers'),
    optionsArg('status', 'New status (optional)', STATUSES, { required: false }),
  ],
  async run($) {
    const p = $.step.parameters;
    const conversationId = numericId(p.conversationId, 'Conversation ID');
    const text = String(p.text ?? '').trim();
    if (!text) throw new Error('FreeScout: text is required');
    const body = {
      type: p.type === 'note' ? 'note' : 'message',
      text,
      user: numericId(p.userId, 'Agent'),
      ...(STATUSES.includes(p.status) ? { status: p.status } : {}),
    };
    const response = await $.http.post(`/conversations/${conversationId}/threads`, body, { headers: { 'Content-Type': 'application/json' } });
    $.setActionItem({ raw: { threadId: resourceId(response), conversationId, type: body.type } });
  },
});
