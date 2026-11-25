import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, optionsArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { clampTop, graphList } from '../../../helpers/microsoft-graph.js';
import { ITEM_FIELDS, enc, folderChildrenPath, listTaskLists, slimItem } from '../common.js';

const listFiles = defineTrigger({
  name: 'List OneDrive files',
  key: 'listFiles',
  pollInterval: 15,
  description: 'Files and folders in a OneDrive folder (path like "Documents/Reports"; empty = root), newest first.',
  arguments: [stringArg('folder', 'Folder path (optional)'), stringArg('top', 'How many (max 50)', { value: '20' })],
  async run($) {
    const n = clampTop($.step.parameters.top, 20);
    const items = await graphList(
      $,
      folderChildrenPath($.step.parameters.folder),
      { $top: 200, $select: ITEM_FIELDS },
      200
    );
    items.sort((a, b) => String(b.lastModifiedDateTime).localeCompare(String(a.lastModifiedDateTime)));
    pushItems($, items.slice(0, n).map(slimItem));
  },
});

const searchFiles = defineTrigger({
  name: 'Search OneDrive files',
  key: 'searchFiles',
  pollInterval: 15,
  description: 'Searches file names and content in OneDrive.',
  arguments: [stringArg('query', 'Search text', { required: true }), stringArg('top', 'How many (max 50)', { value: '20' })],
  async run($) {
    const n = clampTop($.step.parameters.top, 20);
    const q = String($.step.parameters.query || '').replace(/'/g, "''");
    const items = await graphList($, `/me/drive/root/search(q='${encodeURIComponent(q)}')`, { $top: n, $select: ITEM_FIELDS }, n);
    pushItems($, items.map(slimItem));
  },
});

const taskLists = defineTrigger({
  name: 'List To Do lists',
  key: 'listTaskLists',
  pollInterval: 60,
  description: 'Microsoft To Do task lists.',
  arguments: [],
  async run($) {
    pushItems($, await listTaskLists($));
  },
});

const listTasks = defineTrigger({
  name: 'List To Do tasks',
  key: 'listTasks',
  pollInterval: 15,
  description: 'Tasks of a list (open only by default).',
  arguments: [
    dynamicArg('listId', 'List', 'listTaskLists'),
    optionsArg('status', 'Which tasks', ['open', 'completed', 'all'], { required: false, value: 'open' }),
    stringArg('top', 'How many (max 50)', { value: '20' }),
  ],
  async run($) {
    const { listId, status, top } = $.step.parameters;
    const n = clampTop(top, 20);
    const params = { $top: n };
    if (status === 'completed') params.$filter = "status eq 'completed'";
    else if (status !== 'all') params.$filter = "status ne 'completed'";
    pushItems($, await graphList($, `/me/todo/lists/${enc(listId)}/tasks`, params, n));
  },
});

export default [listFiles, searchFiles, taskLists, listTasks];
