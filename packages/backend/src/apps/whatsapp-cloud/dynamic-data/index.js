import { listTemplates } from '../common.js';

export default [
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
