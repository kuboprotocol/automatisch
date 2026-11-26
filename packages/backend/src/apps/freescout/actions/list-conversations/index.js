import defineAction from '../../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../../helpers/vertal-app-kit.js';

export default defineAction({
  name: 'List conversations',
  key: 'listConversations',
  description: 'Lists recent conversations (newest first), optionally by mailbox, status, customer e-mail or subject text.',
  arguments: [
    dynamicArg('mailboxId', 'Mailbox', 'listMailboxes', { required: false }),
    optionsArg('status', 'Status', ['active', 'pending', 'closed', 'spam'], { required: false, value: 'active' }),
    stringArg('customerEmail', 'Customer e-mail'),
    stringArg('subject', 'Subject contains'),
  ],
  async run($) {
    const p = $.step.parameters;
    const params = { pageSize: 25, sortField: 'updatedAt', sortOrder: 'desc' };
    if (p.mailboxId) params.mailboxId = String(p.mailboxId);
    if (p.status) params.status = p.status;
    if (p.customerEmail) params.customerEmail = String(p.customerEmail).trim();
    if (p.subject) params.subject = String(p.subject).trim();
    const { data } = await $.http.get('/conversations', { params });
    $.setActionItem({
      raw: {
        conversations: (data?._embedded?.conversations || []).map((c) => ({
          id: c.id, number: c.number, subject: c.subject, status: c.status, mailboxId: c.mailboxId,
          customer: c.customer?.email, assignee: c.assignee?.email, preview: c.preview, updatedAt: c.updatedAt,
        })),
        total: data?.page?.totalElements,
      },
    });
  },
});
