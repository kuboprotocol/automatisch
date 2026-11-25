import defineAction from '../../../../helpers/define-action.js';
import { crm, workspaceArgument } from '../../common/crm.js';

export default defineAction({
  name: 'Atualizar negócio no Vertal CRM',
  key: 'crmUpdateDeal',
  description: 'Muda a etapa, o valor ou o fechamento previsto de um negócio do Vertal CRM. Grátis.',
  arguments: [
    workspaceArgument,
    { label: 'Id do negócio', key: 'id', type: 'string', required: true, variables: true },
    {
      label: 'Nova etapa',
      key: 'stage',
      type: 'dropdown',
      required: false,
      variables: true,
      source: { type: 'query', name: 'getDynamicData', arguments: [{ name: 'key', value: 'listCrmStages' }] },
    },
    { label: 'Valor', key: 'amount', type: 'string', required: false, variables: true },
    { label: 'Fechamento previsto (AAAA-MM-DD)', key: 'expected_closing_date', type: 'string', required: false, variables: true },
    { label: 'Nome', key: 'name', type: 'string', required: false, variables: true },
  ],

  async run($) {
    const p = $.step.parameters;
    const deal = {};
    for (const k of ['stage', 'amount', 'expected_closing_date', 'name']) {
      if (p[k] !== undefined && p[k] !== null && String(p[k]).trim() !== '') deal[k] = p[k];
    }
    const data = await crm($, { op: 'update_deal', id: p.id, deal });
    $.setActionItem({ raw: data.deal });
  },
});
