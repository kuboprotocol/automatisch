import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, optionsArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { clampTop, graphList } from '../../../helpers/microsoft-graph.js';
import {
  EVENT_FIELDS,
  GRAPH,
  MESSAGE_FIELDS,
  calendarPath,
  enc,
  folderPath,
  listCalendars,
  listMailFolders,
  tzHeaders,
} from '../common.js';

const folderArg = dynamicArg('folderId', 'Folder (empty = all mail)', 'listMailFolders', { required: false });
const calendarArg = dynamicArg('calendarId', 'Calendar (empty = default)', 'listCalendars', { required: false });
const tzArg = stringArg('timeZone', 'Time zone (IANA or Windows, default UTC)', { value: 'America/Sao_Paulo' });

const listMessages = defineTrigger({
  name: 'List or search emails',
  key: 'listMessages',
  pollInterval: 15,
  description: 'Most recent emails (newest first). Optional search text (KQL, e.g. from:ana subject:invoice) and unread-only filter.',
  arguments: [
    folderArg,
    stringArg('search', 'Search (optional)'),
    optionsArg('unreadOnly', 'Unread only', ['false', 'true'], { required: false, value: 'false' }),
    stringArg('top', 'How many (max 50)', { value: '10' }),
  ],
  async run($) {
    const { folderId, search, unreadOnly, top } = $.step.parameters;
    const n = clampTop(top);
    const params = { $top: n, $select: MESSAGE_FIELDS };
    if (search) {
      // $search não combina com $orderby; o Graph já ordena por relevância/data
      // ($search também não aceita $filter: o filtro de não lidos é feito aqui)
      params.$search = `"${String(search).replace(/"/g, '')}"`;
      params.$top = 50;
    } else {
      params.$orderby = 'receivedDateTime desc';
      // com $orderby, o campo ordenado precisa vir primeiro no $filter (regra do Graph)
      if (String(unreadOnly) === 'true') params.$filter = 'receivedDateTime ge 1900-01-01T00:00:00Z and isRead eq false';
    }
    let items = await graphList($, folderPath(folderId), params, search ? 50 : n);
    if (search && String(unreadOnly) === 'true') items = items.filter((m) => m.isRead === false);
    pushItems($, items.slice(0, n));
  },
});

const getMessage = defineTrigger({
  name: 'Read email',
  key: 'getMessage',
  pollInterval: 15,
  description: 'Full email (body as text) by message id.',
  arguments: [stringArg('messageId', 'Message ID', { required: true })],
  async run($) {
    const { data } = await $.http.get(`${GRAPH}/me/messages/${enc($.step.parameters.messageId)}`, {
      params: { $select: `${MESSAGE_FIELDS},body,replyTo,bccRecipients` },
      headers: { Prefer: 'outlook.body-content-type="text"' },
    });
    pushItems($, [data]);
  },
});

const listEvents = defineTrigger({
  name: 'List upcoming events',
  key: 'listEvents',
  pollInterval: 15,
  description: 'Events from now (or a start date) for the next N days, in start order.',
  arguments: [
    calendarArg,
    stringArg('days', 'Days ahead (default 7, max 90)', { value: '7' }),
    stringArg('start', 'Start (ISO date/time, default now)'),
    tzArg,
    stringArg('top', 'How many (max 50)', { value: '10' }),
  ],
  async run($) {
    const { calendarId, days, start, timeZone, top } = $.step.parameters;
    const n = clampTop(top);
    const from = start ? new Date(start) : new Date();
    if (Number.isNaN(from.getTime())) throw new Error('Invalid start date');
    const d = Math.min(Math.max(parseInt(days, 10) || 7, 1), 90);
    const to = new Date(from.getTime() + d * 86400000);
    const items = await graphList(
      $,
      calendarPath(calendarId, 'calendarView'),
      {
        startDateTime: from.toISOString(),
        endDateTime: to.toISOString(),
        $orderby: 'start/dateTime',
        $top: n,
        $select: EVENT_FIELDS,
      },
      n,
      tzHeaders(timeZone)
    );
    pushItems($, items);
  },
});

const mailFolders = defineTrigger({
  name: 'List mail folders',
  key: 'listMailFolders',
  pollInterval: 60,
  description: 'Mail folders with unread and total counts.',
  arguments: [],
  async run($) {
    pushItems($, await listMailFolders($));
  },
});

const calendars = defineTrigger({
  name: 'List calendars',
  key: 'listCalendars',
  pollInterval: 60,
  description: 'Calendars of the account.',
  arguments: [],
  async run($) {
    pushItems($, await listCalendars($));
  },
});

export default [listMessages, getMessage, listEvents, mailFolders, calendars];
