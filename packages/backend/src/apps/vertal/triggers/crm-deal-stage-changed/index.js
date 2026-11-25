import defineTrigger from '../../../../helpers/define-trigger.js';
import { pushCrmEvents, workspaceArgument } from '../../common/crm.js';

export default defineTrigger({
  name: 'Etapa de negócio mudou no Vertal CRM',
  key: 'crmDealStageChanged',
  pollInterval: 15,
  description:
    'Dispara quando um negócio muda de etapa no Vertal CRM (inclui ganho e perdido). Opcional: só quando chegar a uma etapa.',
  arguments: [
    workspaceArgument,
    {
      label: 'Só quando chegar à etapa (id, opcional)',
      key: 'toStage',
      type: 'string',
      required: false,
      variables: false,
      description: 'Ex.: ganho, proposta. Em branco = qualquer etapa.',
    },
  ],

  async run($) {
    const to = String($.step.parameters.toStage || '').trim();
    await pushCrmEvents($, ['deal.stage_changed'], (ev) => !to || ev.payload?.to === to);
  },
});
