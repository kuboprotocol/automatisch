import defineAction from '../../../../helpers/define-action.js';
import { crm, workspaceArgument } from '../../common/crm.js';

export default defineAction({
  name: 'Criar negócio no Vertal CRM',
  key: 'crmCreateDeal',
  description: 'Cria um negócio no funil padrão do Vertal CRM (ou no funil informado). Grátis.',
  arguments: [
    workspaceArgument,
    { label: 'Nome do negócio', key: 'name', type: 'string', required: true, variables: true },
    { label: 'Valor', key: 'amount', type: 'string', required: false, variables: true, description: 'Número, ex.: 1500' },
    {
      label: 'Etapa',
      key: 'stage',
      type: 'dropdown',
      required: false,
      variables: true,
      description: 'Em branco = primeira etapa do funil.',
      source: { type: 'query', name: 'getDynamicData', arguments: [{ name: 'key', value: 'listCrmStages' }] },
    },
    { label: 'Fechamento previsto (AAAA-MM-DD)', key: 'expected_closing_date', type: 'string', required: false, variables: true },
    { label: 'Id do contato', key: 'contactId', type: 'string', required: false, variables: true },
    { label: 'Id da empresa', key: 'companyId', type: 'string', required: false, variables: true },
    { label: 'Id do funil', key: 'pipelineId', type: 'string', required: false, variables: true },
    { label: 'Descrição', key: 'description', type: 'string', required: false, variables: true },
  ],

  async run($) {
    const p = $.step.parameters;
    const data = await crm($, {
      op: 'create_deal',
      deal: { name: p.name, amount: p.amount, stage: p.stage, expected_closing_date: p.expected_closing_date, description: p.description },
      contactId: p.contactId || undefined,
      companyId: p.companyId || undefined,
      pipelineId: p.pipelineId || undefined,
    });
    $.setActionItem({ raw: data.deal });
  },
});
