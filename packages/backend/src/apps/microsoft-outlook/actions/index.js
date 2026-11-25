import defineAction from '../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { recipients } from '../../../helpers/microsoft-graph.js';
import { GRAPH, calendarPath, enc } from '../common.js';

const bodyTypeArg = optionsArg('bodyType', 'Body format', ['Text', 'HTML'], { required: false, value: 'Text' });

function messagePayload(p) {
  const msg = {
    subject: p.subject || '',
    body: { contentType: p.bodyType === 'HTML' ? 'HTML' : 'Text', content: p.body || '' },
    toRecipients: recipients(p.to),
  };
  if (p.cc) msg.ccRecipients = recipients(p.cc);
  if (p.bcc) msg.bccRecipients = recipients(p.bcc);
  return msg;
}

const mailArgs = [
  stringArg('to', 'To (comma-separated)', { required: true }),
  stringArg('subject', 'Subject', { required: true }),
  stringArg('body', 'Body', { required: true }),
  bodyTypeArg,
  stringArg('cc', 'Cc (optional)'),
  stringArg('bcc', 'Bcc (optional)'),
];

const sendEmail = defineAction({
  name: 'Send email',
  key: 'sendEmail',
  description: 'Sends an email from the connected Outlook account (saved to Sent Items).',
  arguments: mailArgs,
  async run($) {
    const p = $.step.parameters;
    if (!recipients(p.to).length) throw new Error('At least one recipient is required');
    await $.http.post(`${GRAPH}/me/sendMail`, { message: messagePayload(p), saveToSentItems: true });
    $.setActionItem({ raw: { sent: true, to: p.to, subject: p.subject } });
  },
});

const createDraft = defineAction({
  name: 'Create draft',
  key: 'createDraft',
  description: 'Saves an email in Drafts without sending it.',
  arguments: mailArgs.map((a) => (a.key === 'to' ? { ...a, required: false } : a)),
  async run($) {
    const { data } = await $.http.post(`${GRAPH}/me/messages`, messagePayload($.step.parameters));
    $.setActionItem({ raw: { id: data.id, subject: data.subject, isDraft: data.isDraft, webLink: data.webLink } });
  },
});

const replyToEmail = defineAction({
  name: 'Reply to email',
  key: 'replyToEmail',
  description: 'Replies to an email (sends immediately). Use "Create draft" to only prepare it.',
  arguments: [
    stringArg('messageId', 'Message ID', { required: true }),
    stringArg('comment', 'Reply text', { required: true }),
    optionsArg('replyAll', 'Reply all', ['false', 'true'], { required: false, value: 'false' }),
  ],
  async run($) {
    const { messageId, comment, replyAll } = $.step.parameters;
    const verb = String(replyAll) === 'true' ? 'replyAll' : 'reply';
    await $.http.post(`${GRAPH}/me/messages/${enc(messageId)}/${verb}`, { comment });
    $.setActionItem({ raw: { replied: true, messageId, replyAll: verb === 'replyAll' } });
  },
});

const createEvent = defineAction({
  name: 'Create calendar event',
  key: 'createEvent',
  description: 'Creates an event; attendees (if any) receive an invitation.',
  arguments: [
    dynamicArg('calendarId', 'Calendar (empty = default)', 'listCalendars', { required: false }),
    stringArg('subject', 'Title', { required: true }),
    stringArg('start', 'Start (YYYY-MM-DDTHH:mm:ss, local to time zone)', { required: true }),
    stringArg('end', 'End (YYYY-MM-DDTHH:mm:ss)', { required: true }),
    stringArg('timeZone', 'Time zone', { value: 'America/Sao_Paulo' }),
    stringArg('location', 'Location (optional)'),
    stringArg('attendees', 'Attendees emails (comma-separated, optional)'),
    stringArg('body', 'Description (optional)'),
    optionsArg('isOnlineMeeting', 'Teams meeting link (work/school accounts)', ['false', 'true'], {
      required: false,
      value: 'false',
    }),
  ],
  async run($) {
    const p = $.step.parameters;
    const tz = p.timeZone || 'America/Sao_Paulo';
    const event = {
      subject: p.subject,
      start: { dateTime: p.start, timeZone: tz },
      end: { dateTime: p.end, timeZone: tz },
    };
    if (p.location) event.location = { displayName: p.location };
    if (p.body) event.body = { contentType: 'Text', content: p.body };
    if (p.attendees) {
      event.attendees = recipients(p.attendees).map((r) => ({ ...r, type: 'required' }));
    }
    if (String(p.isOnlineMeeting) === 'true') {
      event.isOnlineMeeting = true;
      event.onlineMeetingProvider = 'teamsForBusiness';
    }
    const { data } = await $.http.post(`${GRAPH}${calendarPath(p.calendarId, 'events')}`, event);
    $.setActionItem({
      raw: { id: data.id, subject: data.subject, start: data.start, end: data.end, webLink: data.webLink },
    });
  },
});

export default [sendEmail, createDraft, replyToEmail, createEvent];
