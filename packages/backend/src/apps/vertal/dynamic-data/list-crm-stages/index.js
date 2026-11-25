import { crm } from '../../common/crm.js';

export default {
  name: 'Listar etapas do Vertal CRM',
  key: 'listCrmStages',

  async run($) {
    const data = await crm($, { op: 'list_pipelines' });
    const out = [];
    for (const p of data.pipelines || []) {
      for (const s of p.stages || []) {
        out.push({ value: s.id, name: (data.pipelines.length > 1 ? `${p.name} · ` : '') + s.label });
      }
    }
    return { data: out };
  },
};
