import defineTrigger from '../../../helpers/define-trigger.js';
import { pushItems } from '../../../helpers/vertal-app-kit.js';
import { listPhoneNumbers, listTemplates } from '../common.js';

const phones = defineTrigger({
  name: 'List business phone numbers',
  key: 'listPhoneNumbers',
  pollInterval: 60,
  description: 'Phone numbers of the WhatsApp Business accounts you connected.',
  arguments: [],
  async run($) {
    pushItems($, await listPhoneNumbers($));
  },
});

const templates = defineTrigger({
  name: 'List message templates',
  key: 'listTemplates',
  pollInterval: 60,
  description: 'Message templates and their approval status.',
  arguments: [],
  async run($) {
    pushItems($, await listTemplates($));
  },
});

export default [phones, templates];
