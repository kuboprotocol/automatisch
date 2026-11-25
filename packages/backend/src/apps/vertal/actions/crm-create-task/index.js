import defineAction from '../../../../helpers/define-action.js';
import { crm, workspaceArgument } from '../../common/crm.js';

export default defineAction({
  name: 'Criar tarefa no Vertal CRM',
  key: 'crmCreateTask',
  description: 'Cria uma tarefa/lembrete no Vertal CRM, ligada a um contato ou negócio (opcional). Grátis.',
  arguments: [
    workspaceArgument,
    { label: 'Tarefa', key: 'text', type: 'string', required: true, variables: true },
    {
      label: 'Tipo',
      key: 'type',
      type: 'dropdown',
      required: false,
      variables: true,
      options: ['none', 'email', 'demo', 'lunch', 'meeting', 'follow-up', 'thank-you', 'ship', 'call'].map((v) => ({ label: v, value: v })),
    },
    { label: 'Prazo (data/hora ISO)', key: 'dueDate', type: 'string', required: false, variables: true, description: 'Ex.: 2026-12-01T09:00:00-03:00' },
    { label: 'Id do contato', key: 'contactId', type: 'string', required: false, variables: true },
    { label: 'Id do negócio', key: 'dealId', type: 'string', required: false, variables: true },
  ],

  async run($) {
    const p = $.step.parameters;
    const data = await crm($, {
      op: 'create_task',
      text: p.text,
      type: p.type || 'none',
      dueDate: p.dueDate || undefined,
      contactId: p.contactId || undefined,
      dealId: p.dealId || undefined,
    });
    $.setActionItem({ raw: data.task });
  },
});
