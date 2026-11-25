import defineAction from '../../../../helpers/define-action.js';
import { agentArgument, agentes } from '../../common/agentes.js';

export default defineAction({
  name: 'Rodar um agente do Vertal Agentes',
  key: 'runAgent',
  description:
    'Coloca na fila uma execução do agente escolhido no seu Vertal Agentes (roda em segundos).',
  arguments: [agentArgument],

  async run($) {
    const data = await agentes($, {
      op: 'agentes_run',
      agent_id: String($.step.parameters.agentId),
    });
    $.setActionItem({ raw: { enfileirado: true, ...data } });
  },
});
