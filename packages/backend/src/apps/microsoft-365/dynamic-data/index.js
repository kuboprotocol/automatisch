import { listTaskLists } from '../common.js';
import { graphList } from '../../../helpers/microsoft-graph.js';
import { enc } from '../common.js';

export default [
  {
    name: 'List task lists',
    key: 'listTaskLists',
    async run($) {
      const list = await listTaskLists($);
      return { data: list.map((l) => ({ value: l.id, name: l.displayName })) };
    },
  },
  {
    name: 'List open tasks',
    key: 'listOpenTasks',
    async run($) {
      const listId = $.step.parameters.listId;
      if (!listId) return { data: [] };
      const tasks = await graphList($, `/me/todo/lists/${enc(listId)}/tasks`, { $filter: "status ne 'completed'", $top: 100 }, 100);
      return { data: tasks.map((t) => ({ value: t.id, name: t.title })) };
    },
  },
];
