import defineTrigger from '../../../../helpers/define-trigger.js';
import { agentArgument, agentes } from '../../common/agentes.js';

export default defineTrigger({
  name: 'Novo evento do Vertal Agentes',
  key: 'newAgentEvent',
  pollInterval: 15,
  description:
    'Dispara o fluxo quando o agente escolhido do seu Vertal Agentes emite um evento novo.',
  arguments: [{ ...agentArgument, variables: false }],

  async run($) {
    const data = await agentes($, {
      op: 'agentes_events',
      agent_id: String($.step.parameters.agentId),
    });
    const events = Array.isArray(data?.events) ? data.events : [];
    // O Vertal Agentes devolve do mais novo para o mais antigo.
    for (const event of events) {
      $.pushTriggerItem({
        raw: {
          id: event.id,
          agenteId: event.agentId,
          criadoEm: event.createdAt,
          ...(event.payload && typeof event.payload === 'object' ? event.payload : { payload: event.payload }),
        },
        meta: { internalId: String(event.id) },
      });
    }
  },
});
