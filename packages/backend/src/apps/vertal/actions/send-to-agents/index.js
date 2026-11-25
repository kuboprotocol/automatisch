import defineAction from '../../../../helpers/define-action.js';
import { agentArgument, agentes, parsePayload } from '../../common/agentes.js';

export default defineAction({
  name: 'Enviar para Vertal Agentes',
  key: 'sendToAgents',
  description:
    'Entrega um evento a um agente receptor (webhook) do seu Vertal Agentes. O evento pode disparar outros agentes.',
  arguments: [
    { ...agentArgument, description: 'Agente receptor (webhook) do seu Vertal Agentes.' },
    {
      label: 'Evento (JSON)',
      key: 'payload',
      type: 'string',
      required: false,
      variables: true,
      description:
        'Objeto JSON com os dados do evento. Pode usar variáveis dos passos anteriores. Texto simples vira {"mensagem": "..."}.',
    },
  ],

  async run($) {
    // O usuário aprovou ao montar e publicar o fluxo.
    const data = await agentes($, {
      op: 'agentes_event',
      agent_id: String($.step.parameters.agentId),
      payload: parsePayload($.step.parameters.payload),
    });
    $.setActionItem({ raw: { entregue: true, ...data } });
  },
});
