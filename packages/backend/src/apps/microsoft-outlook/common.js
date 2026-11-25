import { GRAPH, enc, graphList } from '../../helpers/microsoft-graph.js';

export const MESSAGE_FIELDS =
  'id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,isRead,isDraft,hasAttachments,importance,bodyPreview,webLink,conversationId';

export const EVENT_FIELDS =
  'id,subject,start,end,location,organizer,attendees,isAllDay,isOnlineMeeting,onlineMeeting,webLink,bodyPreview,showAs,responseStatus';

export function tzHeaders(timeZone) {
  return { Prefer: `outlook.timezone="${timeZone || 'UTC'}"` };
}

export async function listMailFolders($) {
  return graphList($, '/me/mailFolders', { $top: 50, $select: 'id,displayName,totalItemCount,unreadItemCount' }, 100);
}

export async function listCalendars($) {
  return graphList($, '/me/calendars', { $top: 50, $select: 'id,name,isDefaultCalendar,canEdit,owner' }, 100);
}

export function folderPath(folderId) {
  return folderId ? `/me/mailFolders/${enc(folderId)}/messages` : '/me/messages';
}

export function calendarPath(calendarId, suffix) {
  return calendarId ? `/me/calendars/${enc(calendarId)}/${suffix}` : `/me/${suffix}`;
}

export { GRAPH, enc };
