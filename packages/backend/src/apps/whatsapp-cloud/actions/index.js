import defineAction from '../../../helpers/define-action.js';
import { GRAPH_BASE } from '../../../helpers/meta-graph.js';
import { csv, stringArg } from '../../../helpers/vertal-app-kit.js';
import { friendlyGraphError, normalizePhone, onlyId } from '../common.js';

const to = stringArg('to', 'To (phone with country code, e.g. 5511999999999)', { required: true });
const from = stringArg('phoneNumberId', 'Send from (phone number ID)', {
  description: 'Optional. Defaults to the number of this connection.',
});

async function send($, payload) {
  const phoneNumberId = onlyId($.step.parameters.phoneNumberId || $.auth.data.phoneNumberId);
  const number = normalizePhone($.step.parameters.to);
  if (number.length < 8) throw new Error('Invalid recipient: use the full number with country code, digits only.');
  try {
    const { data } = await $.http.post(`${GRAPH_BASE}/${phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: number,
      ...payload,
    });
    $.setActionItem({ raw: data });
  } catch (error) {
    throw friendlyGraphError(error);
  }
}

const sendText = defineAction({
  name: 'Send text message',
  key: 'sendText',
  description: 'Sends a free text message (only within 24h after the customer last wrote to you).',
  arguments: [to, stringArg('body', 'Message', { required: true }), from],
  async run($) {
    const body = String($.step.parameters.body || '').trim();
    if (!body) throw new Error('The message is empty.');
    await send($, { type: 'text', text: { body: body.slice(0, 4096), preview_url: true } });
  },
});

const sendTemplate = defineAction({
  name: 'Send template message',
  key: 'sendTemplate',
  description: 'Sends an approved template message (works outside the 24h customer window). The test number has the "hello_world" template (language en_US).',
  arguments: [
    to,
    stringArg('template', 'Template name (e.g. hello_world)', { required: true }),
    stringArg('language', 'Template language code (e.g. pt_BR, en_US)', { value: 'pt_BR' }),
    stringArg('bodyParameters', 'Body variables (comma separated, in order)'),
    from,
  ],
  async run($) {
    // Aceita também "nome|idioma" (formato da lista de templates).
    const [rawName, langFromName] = String($.step.parameters.template || '').split('|');
    const name = rawName.trim();
    if (!/^[a-z0-9_]{1,512}$/.test(name)) throw new Error('Invalid template name (lowercase letters, numbers and _).');
    const language = String(langFromName || $.step.parameters.language || 'pt_BR').trim();
    const params = csv($.step.parameters.bodyParameters);
    await send($, {
      type: 'template',
      template: {
        name,
        language: { code: language },
        ...(params.length
          ? { components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text })) }] }
          : {}),
      },
    });
  },
});

export default [sendText, sendTemplate];
