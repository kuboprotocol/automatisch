import { GRAPH, enc, graphList } from '../../helpers/microsoft-graph.js';

export async function listTeams($) {
  return graphList($, '/me/joinedTeams', {}, 100);
}

export async function listChannels($, teamId) {
  return graphList($, `/teams/${enc(teamId)}/channels`, {}, 100);
}

export async function listChats($, max = 50) {
  return graphList($, '/me/chats', { $top: Math.min(max, 50), $expand: 'members' }, max);
}

export function chatLabel(c) {
  if (c.topic) return c.topic;
  const names = (c.members || []).map((m) => m.displayName).filter(Boolean);
  return names.join(', ') || c.chatType || c.id;
}

export function messageBody(text, html) {
  return { body: { contentType: html ? 'html' : 'text', content: text } };
}

export { GRAPH, enc };
