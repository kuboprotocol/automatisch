import { listPhoneNumbers, listTemplates } from '../common.js';

export default [
  {
    name: 'List phone numbers',
    key: 'listPhoneNumbers',
    async run($) {
      const nums = await listPhoneNumbers($);
      return { data: nums.map((n) => ({ value: n.id, name: `${n.display_phone_number} (${n.verified_name || 'WhatsApp'})` })) };
    },
  },
  {
    name: 'List templates',
    key: 'listTemplates',
    async run($) {
      const ts = await listTemplates($);
      return {
        data: ts
          .filter((t) => t.status === 'APPROVED')
          .map((t) => ({ value: `${t.name}|${t.language}`, name: `${t.name} (${t.language})` })),
      };
    },
  },
];
