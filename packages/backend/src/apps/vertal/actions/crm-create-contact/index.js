import defineAction from '../../../../helpers/define-action.js';
import { crm, workspaceArgument } from '../../common/crm.js';

export default defineAction({
  name: 'Criar contato no Vertal CRM',
  key: 'crmCreateContact',
  description: 'Cria (ou encontra pelo e-mail) um contato no Vertal CRM. Grátis.',
  arguments: [
    workspaceArgument,
    { label: 'Nome', key: 'first_name', type: 'string', required: false, variables: true },
    { label: 'Sobrenome', key: 'last_name', type: 'string', required: false, variables: true },
    { label: 'E-mail', key: 'email', type: 'string', required: false, variables: true },
    { label: 'Telefone', key: 'phone', type: 'string', required: false, variables: true },
    { label: 'Cargo', key: 'title', type: 'string', required: false, variables: true },
    { label: 'Empresa', key: 'company', type: 'string', required: false, variables: true, description: 'Nome da empresa (criada se não existir).' },
    { label: 'Observações', key: 'background', type: 'string', required: false, variables: true },
  ],

  async run($) {
    const p = $.step.parameters;
    const data = await crm($, {
      op: 'create_contact',
      contact: { first_name: p.first_name, last_name: p.last_name, email: p.email, phone: p.phone, title: p.title, background: p.background, company: p.company },
    });
    $.setActionItem({ raw: { criado: data.created, ...data.contact } });
  },
});
