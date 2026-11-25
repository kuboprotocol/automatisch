import defineAction from '../../../helpers/define-action.js';
import { GRAPH_BASE } from '../../../helpers/meta-graph.js';
import { csv, dynamicArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { normalizePhone } from '../common.js';

const phone = dynamicArg('phoneNumberId', 'Send from (business number)', 'listPhoneNumbers');
const to = stringArg('to', 'To (phone with country code, e.g. 5511999999999)', { required: true });

async function send($, phoneNumberId, payload) {
  const { data } = await $.http.post(`${GRAPH_BASE}/${encodeURIComponent(phoneNumberId)}/messages`, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    ...payload,
  });
  $.setActionItem({ raw: data });
}

const sendTemplate = defineAction({
  name: 'Send template message',
  key: 'sendTemplate',
  description: 'Sends an approved template message (works outside the 24h customer window).',
  arguments: [
    phone,
    to,
    dynamicArg('template', 'Template', 'listTemplates'),
    stringArg('bodyParameters', 'Body variables (comma separated, in order)'),
  ],
  async run($) {
    const { phoneNumberId, template, bodyParameters } = $.step.parameters;
    const [name, language = 'pt_BR'] = String(template).split('|');
    const params = csv(bodyParameters);
    await send($, phoneNumberId, {
      to: normalizePhone($.step.parameters.to),
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

const sendText = defineAction({
  name: 'Send text message',
  key: 'sendText',
  description: 'Sends a free text message (only within 24h after the customer last wrote to you).',
  arguments: [phone, to, stringArg('body', 'Message', { required: true })],
  async run($) {
    const { phoneNumberId, body } = $.step.parameters;
    await send($, phoneNumberId, {
      to: normalizePhone($.step.parameters.to),
      type: 'text',
      text: { body, preview_url: true },
    });
  },
});

export default [sendTemplate, sendText];
