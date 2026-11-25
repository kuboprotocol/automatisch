import defineAction from '../../../../helpers/define-action.js';
import { crm, workspaceArgument } from '../../common/crm.js';

export default defineAction({
  name: 'Atualizar contato no Vertal CRM',
  key: 'crmUpdateContact',
  description: 'Atualiza um contato do Vertal CRM pelo id (ou pelo e-mail). Campos em branco ficam como estão. Grátis.',
  arguments: [
    workspaceArgument,
    { label: 'Id do contato', key: 'id', type: 'string', required: false, variables: true, description: 'Ou preencha o e-mail para achar o contato.' },
    { label: 'E-mail para achar o contato', key: 'findEmail', type: 'string', required: false, variables: true },
    { label: 'Nome', key: 'first_name', type: 'string', required: false, variables: true },
    { label: 'Sobrenome', key: 'last_name', type: 'string', required: false, variables: true },
    { label: 'Telefone', key: 'phone', type: 'string', required: false, variables: true },
    { label: 'Cargo', key: 'title', type: 'string', required: false, variables: true },
    {
      label: 'Status',
      key: 'status',
      type: 'dropdown',
      required: false,
      variables: true,
      options: [
        { label: 'Frio', value: 'cold' },
        { label: 'Morno', value: 'warm' },
        { label: 'Quente', value: 'hot' },
        { label: 'Cliente', value: 'in-contract' },
      ],
    },
    { label: 'Observações', key: 'background', type: 'string', required: false, variables: true },
  ],

  async run($) {
    const p = $.step.parameters;
    let id = p.id;
    if (!id && p.findEmail) {
      const found = await crm($, { op: 'find_contact', email: p.findEmail });
      id = found.contact?.id;
    }
    if (!id) throw new Error('Vertal CRM: contato não encontrado.');
    const contact = {};
    for (const k of ['first_name', 'last_name', 'phone', 'title', 'status', 'background']) {
      if (p[k] !== undefined && p[k] !== null && String(p[k]).trim() !== '') contact[k] = p[k];
    }
    const data = await crm($, { op: 'update_contact', id, contact });
    $.setActionItem({ raw: data.contact });
  },
});
