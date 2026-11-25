import defineAction from '../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { GRAPH, MAX_UPLOAD_BYTES, drivePath, enc, slimItem } from '../common.js';

const uploadFile = defineAction({
  name: 'Upload file to OneDrive',
  key: 'uploadFile',
  description:
    'Creates or replaces a file (up to 4 MB) at a OneDrive path, from text content or from a public URL.',
  arguments: [
    stringArg('path', 'File path (e.g. Vertal/report.md)', { required: true }),
    stringArg('content', 'Text content (or leave empty and use URL)'),
    stringArg('sourceUrl', 'Download from URL (optional)'),
    optionsArg('conflict', 'If the file exists', ['replace', 'rename', 'fail'], { required: false, value: 'rename' }),
  ],
  async run($) {
    const { path, content, sourceUrl, conflict } = $.step.parameters;
    const target = drivePath(path);
    if (!target) throw new Error('File path is required');
    let body;
    let contentType = 'text/plain; charset=utf-8';
    if (sourceUrl) {
      const res = await $.http.get(sourceUrl, {
        responseType: 'arraybuffer',
        maxContentLength: MAX_UPLOAD_BYTES,
        additionalProperties: { skipAddingAuthHeader: true },
      });
      body = Buffer.from(res.data);
      contentType = res.headers?.['content-type'] || 'application/octet-stream';
    } else {
      body = Buffer.from(String(content ?? ''), 'utf8');
    }
    if (body.length > MAX_UPLOAD_BYTES) throw new Error('File larger than 4 MB');
    const { data } = await $.http.put(`${GRAPH}/me/drive/root:/${target}:/content`, body, {
      params: { '@microsoft.graph.conflictBehavior': conflict || 'rename' },
      headers: { 'Content-Type': contentType },
    });
    $.setActionItem({ raw: slimItem(data) });
  },
});

const createFolder = defineAction({
  name: 'Create OneDrive folder',
  key: 'createFolder',
  description: 'Creates a folder inside a parent folder (empty = root).',
  arguments: [stringArg('parent', 'Parent folder path (optional)'), stringArg('name', 'Folder name', { required: true })],
  async run($) {
    const { parent, name } = $.step.parameters;
    const p = drivePath(parent);
    const url = p ? `${GRAPH}/me/drive/root:/${p}:/children` : `${GRAPH}/me/drive/root/children`;
    const { data } = await $.http.post(url, {
      name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });
    $.setActionItem({ raw: slimItem(data) });
  },
});

const createTask = defineAction({
  name: 'Create To Do task',
  key: 'createTask',
  description: 'Adds a task to a Microsoft To Do list.',
  arguments: [
    dynamicArg('listId', 'List', 'listTaskLists'),
    stringArg('title', 'Title', { required: true }),
    stringArg('notes', 'Notes (optional)'),
    stringArg('due', 'Due date (YYYY-MM-DD, optional)'),
    optionsArg('importance', 'Importance', ['normal', 'high', 'low'], { required: false, value: 'normal' }),
  ],
  async run($) {
    const { listId, title, notes, due, importance } = $.step.parameters;
    const task = { title, importance: importance || 'normal' };
    if (notes) task.body = { content: notes, contentType: 'text' };
    if (due) {
      if (!/^\d{4}-\d{2}-\d{2}/.test(due)) throw new Error('Due date must be YYYY-MM-DD');
      task.dueDateTime = { dateTime: `${due.slice(0, 10)}T12:00:00`, timeZone: 'UTC' };
    }
    const { data } = await $.http.post(`${GRAPH}/me/todo/lists/${enc(listId)}/tasks`, task);
    $.setActionItem({ raw: data });
  },
});

const completeTask = defineAction({
  name: 'Complete To Do task',
  key: 'completeTask',
  description: 'Marks a To Do task as completed.',
  arguments: [
    dynamicArg('listId', 'List', 'listTaskLists'),
    dynamicArg('taskId', 'Task', 'listOpenTasks', { dependsOn: ['listId'] }),
  ],
  async run($) {
    const { listId, taskId } = $.step.parameters;
    const { data } = await $.http.patch(`${GRAPH}/me/todo/lists/${enc(listId)}/tasks/${enc(taskId)}`, {
      status: 'completed',
    });
    $.setActionItem({ raw: data });
  },
});

export default [uploadFile, createFolder, createTask, completeTask];
