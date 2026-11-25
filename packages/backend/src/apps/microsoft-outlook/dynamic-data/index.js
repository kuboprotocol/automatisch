import { listCalendars, listMailFolders } from '../common.js';

export default [
  {
    name: 'List mail folders',
    key: 'listMailFolders',
    async run($) {
      const list = await listMailFolders($);
      return { data: list.map((f) => ({ value: f.id, name: `${f.displayName} (${f.unreadItemCount || 0} unread)` })) };
    },
  },
  {
    name: 'List calendars',
    key: 'listCalendars',
    async run($) {
      const list = await listCalendars($);
      return { data: list.map((c) => ({ value: c.id, name: `${c.name}${c.isDefaultCalendar ? ' (default)' : ''}` })) };
    },
  },
];
