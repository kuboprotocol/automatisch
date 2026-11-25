import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, pushItems } from '../../../helpers/vertal-app-kit.js';
import { chatLabel, listChannels, listChats, listTeams } from '../common.js';

const teams = defineTrigger({
  name: 'List teams',
  key: 'listTeams',
  pollInterval: 60,
  description: 'Teams the user is a member of.',
  arguments: [],
  async run($) {
    pushItems($, await listTeams($));
  },
});

const channels = defineTrigger({
  name: 'List channels',
  key: 'listChannels',
  pollInterval: 60,
  description: 'Channels of a team.',
  arguments: [dynamicArg('teamId', 'Team', 'listTeams')],
  async run($) {
    pushItems($, await listChannels($, $.step.parameters.teamId));
  },
});

const chats = defineTrigger({
  name: 'List chats',
  key: 'listChats',
  pollInterval: 15,
  description: 'Recent 1:1, group and meeting chats.',
  arguments: [],
  async run($) {
    const list = await listChats($, 20);
    pushItems($, list.map((c) => ({ id: c.id, chatType: c.chatType, label: chatLabel(c), webUrl: c.webUrl, lastUpdatedDateTime: c.lastUpdatedDateTime })));
  },
});

export default [teams, channels, chats];
