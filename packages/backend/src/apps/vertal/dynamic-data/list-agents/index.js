import { agentes } from '../../common/agentes.js';

export default {
  name: 'Listar agentes do Vertal Agentes',
  key: 'listAgents',

  async run($) {
    const data = await agentes($, { op: 'agentes_list' });
    const list = Array.isArray(data?.agents) ? data.agents : [];
    return {
      data: list.map((a) => ({ value: String(a.id), name: a.name || `Agente ${a.id}` })),
    };
  },
};
