import defineAction from '../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { GRAPH, enc, messageBody } from '../common.js';

const htmlArg = optionsArg('format', 'Format', ['text', 'html'], { required: false, value: 'text' });

const sendChannelMessage = defineAction({
  name: 'Send channel message',
  key: 'sendChannelMessage',
  description: 'Posts a message in a Teams channel as the connected user.',
  arguments: [
    dynamicArg('teamId', 'Team', 'listTeams'),
    dynamicArg('channelId', 'Channel', 'listChannels', { dependsOn: ['teamId'] }),
    stringArg('message', 'Message', { required: true }),
    htmlArg,
  ],
  async run($) {
    const { teamId, channelId, message, format } = $.step.parameters;
    const { data } = await $.http.post(
      `${GRAPH}/teams/${enc(teamId)}/channels/${enc(channelId)}/messages`,
      messageBody(message, format === 'html')
    );
    $.setActionItem({ raw: { id: data.id, webUrl: data.webUrl, createdDateTime: data.createdDateTime } });
  },
});

const sendChatMessage = defineAction({
  name: 'Send chat message',
  key: 'sendChatMessage',
  description: 'Sends a message in an existing Teams chat as the connected user.',
  arguments: [dynamicArg('chatId', 'Chat', 'listChats'), stringArg('message', 'Message', { required: true }), htmlArg],
  async run($) {
    const { chatId, message, format } = $.step.parameters;
    const { data } = await $.http.post(`${GRAPH}/chats/${enc(chatId)}/messages`, messageBody(message, format === 'html'));
    $.setActionItem({ raw: { id: data.id, webUrl: data.webUrl, createdDateTime: data.createdDateTime } });
  },
});

export default [sendChannelMessage, sendChatMessage];
