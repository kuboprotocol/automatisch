import { listPages } from '../../../helpers/meta-graph.js';

export default [
  {
    name: 'List Pages',
    key: 'listPages',
    async run($) {
      const pages = await listPages($);
      return { data: pages.map((p) => ({ value: p.id, name: p.name })) };
    },
  },
];
