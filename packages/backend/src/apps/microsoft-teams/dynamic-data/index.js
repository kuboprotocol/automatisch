import { chatLabel, listChannels, listChats, listTeams } from '../common.js';

export default [
  {
    name: 'List teams',
    key: 'listTeams',
    async run($) {
      return { data: (await listTeams($)).map((t) => ({ value: t.id, name: t.displayName })) };
    },
  },
  {
    name: 'List channels',
    key: 'listChannels',
    async run($) {
      if (!$.step.parameters.teamId) return { data: [] };
      const list = await listChannels($, $.step.parameters.teamId);
      return { data: list.map((c) => ({ value: c.id, name: c.displayName })) };
    },
  },
  {
    name: 'List chats',
    key: 'listChats',
    async run($) {
      return { data: (await listChats($)).map((c) => ({ value: c.id, name: chatLabel(c) })) };
    },
  },
];
