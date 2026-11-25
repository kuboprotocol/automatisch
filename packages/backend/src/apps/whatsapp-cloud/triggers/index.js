import defineTrigger from '../../../helpers/define-trigger.js';
import { pushItems } from '../../../helpers/vertal-app-kit.js';
import { friendlyGraphError, listPhoneNumbers, listTemplates, phoneNumberInfo } from '../common.js';

const wrap = (fn) => async ($) => {
  try {
    await fn($);
  } catch (error) {
    throw friendlyGraphError(error);
  }
};

const phone = defineTrigger({
  name: 'Business phone number',
  key: 'phoneNumber',
  pollInterval: 60,
  description: 'Display name, number and quality rating of the connected number.',
  arguments: [],
  run: wrap(async ($) => {
    pushItems($, [await phoneNumberInfo($)]);
  }),
});

const phones = defineTrigger({
  name: 'List business phone numbers',
  key: 'listPhoneNumbers',
  pollInterval: 60,
  description: 'Numbers of the WhatsApp Business account (needs the account ID in the connection).',
  arguments: [],
  run: wrap(async ($) => {
    pushItems($, await listPhoneNumbers($));
  }),
});

const templates = defineTrigger({
  name: 'List message templates',
  key: 'listTemplates',
  pollInterval: 60,
  description: 'Message templates and their approval status (needs the account ID in the connection).',
  arguments: [],
  run: wrap(async ($) => {
    pushItems($, await listTemplates($));
  }),
});

export default [phone, phones, templates];
