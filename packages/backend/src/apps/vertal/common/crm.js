// Vertal Fluxos → Vertal CRM: as chamadas vão para a edge function vertal-code-ai (?app=crm)
// com a chave vfk1 do PRÓPRIO usuário (a mesma da conexão "Vertal"). CRUD do CRM é grátis.
// O workspace usado é o primeiro do usuário no Vertal CRM (ou o id informado no passo).
import axios from 'axios';

const DEFAULT_CRM_URL =
  'https://sccizjlpwezsgaxkclot.supabase.co/functions/v1/vertal-code-ai?app=crm';

export const crmUrl = () => process.env.VERTAL_CRM_URL || DEFAULT_CRM_URL;

export async function crm($, payload, { timeout = 30000 } = {}) {
  const anon = process.env.VERTAL_BROKER_ANON_KEY || '';
  const headers = {
    'Content-Type': 'application/json',
    'X-Vertal-Fluxos-Key': $.auth.data.vertalKey,
  };
  if (anon) {
    headers.apikey = anon;
    headers.Authorization = `Bearer ${anon}`;
  }
  const workspaceId = $.step?.parameters?.workspaceId || undefined;
  let data;
  try {
    ({ data } = await axios.post(crmUrl(), { ...payload, workspaceId }, { headers, timeout }));
  } catch (error) {
    const body = error?.response?.data;
    const code = body?.error || error?.message || 'falha';
    if (code === 'vertal_crm_disabled') {
      throw new Error('Vertal CRM: ainda não liberado para esta conta.');
    }
    throw new Error(`Vertal CRM: ${code}`);
  }
  if (!data?.ok) throw new Error(`Vertal CRM: ${data?.error || 'falha'}`);
  return data;
}

export const workspaceArgument = {
  label: 'Workspace do Vertal CRM (opcional)',
  key: 'workspaceId',
  type: 'string',
  required: false,
  variables: true,
  description: 'Em branco = o seu primeiro workspace do Vertal CRM.',
};

// Gatilhos por consulta: o Vertal CRM devolve do mais novo para o mais antigo; dedup pelo id do evento.
export async function pushCrmEvents($, types, filter = () => true) {
  const data = await crm($, { op: 'events_since', types, limit: 50 });
  for (const ev of data.events || []) {
    const record = ev.payload?.record || {};
    if (!filter(ev, record)) continue;
    $.pushTriggerItem({
      raw: {
        eventoId: ev.id,
        tipo: ev.type,
        criadoEm: ev.created_at,
        de: ev.payload?.from ?? null,
        para: ev.payload?.to ?? null,
        ...record,
      },
      meta: { internalId: String(ev.id) },
    });
  }
}
