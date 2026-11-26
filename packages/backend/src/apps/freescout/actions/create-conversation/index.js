import defineAction from '../../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../../helpers/vertal-app-kit.js';
import { STATUSES, numericId, resourceId } from '../../common/api.js';

// Abre uma conversa (ticket) no mailbox. "customer" = mensagem do cliente (ex.: formulário do site);
// "message" = e-mail enviado por um agente ao cliente.
export default defineAction({
  name: 'Create conversation',
  key: 'createConversation',
  description: 'Creates a conversation (ticket) in a FreeScout mailbox, as a customer message or as an agent e-mail to the customer.',
  arguments: [
    dynamicArg('mailboxId', 'Mailbox', 'listMailboxes'),
    stringArg('subject', 'Subject', { required: true }),
    stringArg('customerEmail', 'Customer e-mail', { required: true }),
    stringArg('customerName', 'Customer first name'),
    stringArg('text', 'Message', { required: true }),
    optionsArg('from', 'Written by', [
      { label: 'Customer (incoming)', value: 'customer' },
      { label: 'Agent (e-mail to customer)', value: 'message' },
    ], { value: 'customer' }),
    dynamicArg('userId', 'Agent (needed when written by an agent)', 'listUsers', { required: false }),
    optionsArg('status', 'Status', STATUSES, { required: false, value: 'active' }),
  ],
  async run($) {
    const p = $.step.parameters;
    const mailboxId = numericId(p.mailboxId, 'Mailbox');
    const email = String(p.customerEmail ?? '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('FreeScout: invalid customer e-mail');
    const subject = String(p.subject ?? '').trim();
    const text = String(p.text ?? '').trim();
    if (!subject || !text) throw new Error('FreeScout: subject and message are required');
    const customer = { email, ...(p.customerName ? { firstName: String(p.customerName).trim().slice(0, 40) } : {}) };
    const thread = p.from === 'message'
      ? { type: 'message', text, user: numericId(p.userId, 'Agent') }
      : { type: 'customer', text, customer };
    const body = {
      type: 'email',
      mailboxId,
      subject: subject.slice(0, 998),
      customer,
      threads: [thread],
      ...(STATUSES.includes(p.status) ? { status: p.status } : {}),
    };
    const response = await $.http.post('/conversations', body, { headers: { 'Content-Type': 'application/json' } });
    $.setActionItem({ raw: { id: resourceId(response), mailboxId, subject: body.subject, customer: email } });
  },
});
