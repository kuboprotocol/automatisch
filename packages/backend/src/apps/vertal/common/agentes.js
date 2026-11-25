// Vertal Fluxos → Vertal Agentes: as chamadas passam pelo corretor do Vertal
// (chave vfk1 do usuário). O Vertal usa o Vertal Agentes do MESMO usuário; aqui
// nunca há URL, login ou segredo de webhook do Vertal Agentes.
import { callBroker } from '../../../helpers/vertal-broker.js';

export async function agentes($, payload) {
  let data;
  try {
    data = await callBroker($.auth.data.vertalKey, payload, { timeout: 30000 });
  } catch (error) {
    const body = error?.response?.data;
    const message = body?.message || body?.error || error?.message || 'falha';
    throw new Error(`Vertal Agentes: ${message}`);
  }
  if (!data?.ok) {
    throw new Error(`Vertal Agentes: ${data?.message || data?.error || 'falha'}`);
  }
  return data.data;
}

export const agentArgument = {
  label: 'Agente',
  key: 'agentId',
  type: 'dropdown',
  required: true,
  variables: true,
  description: 'Agente do seu Vertal Agentes.',
  source: {
    type: 'query',
    name: 'getDynamicData',
    arguments: [{ name: 'key', value: 'listAgents' }],
  },
};

export function parsePayload(raw) {
  if (raw === undefined || raw === null || raw === '') return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(String(raw));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // texto simples: vai como { mensagem }
  }
  return { mensagem: String(raw) };
}
