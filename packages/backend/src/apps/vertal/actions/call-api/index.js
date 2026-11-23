import defineAction from '../../../../helpers/define-action.js';
import { callBroker } from '../../../../helpers/vertal-broker.js';

const parseHeaders = (raw) => {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Cabeçalhos: use um objeto JSON.');
  }
  return parsed;
};

export default defineAction({
  name: 'Chamar um conector do Vertal',
  key: 'callApi',
  description:
    'Chama a API de um conector do Vertal (Cloudflare, Supabase, Resend, Render, Figma, MongoDB, RPC Web3…) com os segredos do seu Cofre, sem expor as chaves. Use {{NOME_DO_SEGREDO}} na URL, nos cabeçalhos ou no corpo.',
  arguments: [
    {
      label: 'Método',
      key: 'method',
      type: 'dropdown',
      required: true,
      value: 'GET',
      variables: true,
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({
        label: m,
        value: m,
      })),
    },
    {
      label: 'URL',
      key: 'url',
      type: 'string',
      required: true,
      variables: true,
      description:
        'HTTPS. Ex.: https://api.cloudflare.com/client/v4/user/tokens/verify',
    },
    {
      label: 'Cabeçalhos (JSON)',
      key: 'headers',
      type: 'string',
      required: false,
      variables: true,
      description: 'Ex.: {"Authorization":"Bearer {{CLOUDFLARE_API_TOKEN}}"}',
    },
    {
      label: 'Corpo',
      key: 'body',
      type: 'string',
      required: false,
      variables: true,
    },
  ],

  async run($) {
    const { method, url, headers, body } = $.step.parameters;
    const request = { method: method || 'GET', url, headers: parseHeaders(headers) };
    if (body && request.method !== 'GET') request.body = String(body);

    const data = await callBroker($.auth.data.vertalKey, { op: 'api', request });
    if (data?.error) throw new Error(`Vertal: ${data.error}`);

    let parsedBody = data?.body;
    try {
      parsedBody = JSON.parse(data.body);
    } catch {
      // corpo não é JSON: fica como texto
    }

    $.setActionItem({
      raw: { ok: data?.ok, status: data?.status, body: parsedBody },
    });
  },
});
