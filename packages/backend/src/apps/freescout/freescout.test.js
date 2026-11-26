import { describe, it, expect } from 'vitest';
import app from './index.js';
import setBaseUrl from './common/set-base-url.js';
import { resourceId } from './common/api.js';

const makeContext = (http = {}, parameters = {}) => ({
  auth: { data: { instanceUrl: 'https://help.example.com/', apiKey: 'k' } },
  http,
  step: { parameters },
  setActionItem(item) {
    this.item = item;
  },
});
const action = (key) => app.actions.find((a) => a.key === key);

describe('freescout app', () => {
  it('API key only (no OAuth) and the new actions', () => {
    expect(app.auth.generateAuthUrl).toBeUndefined();
    expect(app.auth.fields.map((f) => f.key)).toEqual(['screenName', 'instanceUrl', 'apiKey']);
    expect(JSON.stringify(app.auth.fields)).not.toMatch(/automatisch/i);
    expect(app.actions.map((a) => a.key)).toEqual(['createConversation', 'replyToConversation', 'updateConversation', 'listConversations']);
    expect(app.dynamicData.map((d) => d.key)).toEqual(['listMailboxes', 'listUsers']);
  });

  it('base url is <instance>/api', () => {
    expect(setBaseUrl(makeContext(), { headers: {} }).baseURL).toBe('https://help.example.com/api');
    const sub = { auth: { data: { instanceUrl: 'https://x.com/support' } } };
    expect(setBaseUrl(sub, { headers: {} }).baseURL).toBe('https://x.com/support/api');
  });

  it('creates a conversation as the customer and returns Resource-ID', async () => {
    let sent;
    const http = { post: async (url, body) => { sent = { url, body }; return { status: 201, headers: { 'resource-id': '35' }, data: '' }; } };
    const $ = makeContext(http, { mailboxId: '1', subject: 'Pedido', customerEmail: 'c@x.com', customerName: 'Ana', text: 'Oi', from: 'customer' });
    await action('createConversation').run($);
    expect(sent.url).toBe('/conversations');
    expect(sent.body).toMatchObject({ type: 'email', mailboxId: 1, subject: 'Pedido', customer: { email: 'c@x.com', firstName: 'Ana' } });
    expect(sent.body.threads[0]).toMatchObject({ type: 'customer', text: 'Oi' });
    expect($.item.raw.id).toBe('35');
    await expect(action('createConversation').run(makeContext(http, { mailboxId: '1', subject: 's', customerEmail: 'bad', text: 't' }))).rejects.toThrow(/e-mail/);
    await expect(action('createConversation').run(makeContext(http, { mailboxId: '1', subject: 's', customerEmail: 'c@x.com', text: 't', from: 'message' }))).rejects.toThrow(/Agent/);
  });

  it('replies / adds a note with the agent id', async () => {
    let sent;
    const http = { post: async (url, body) => { sent = { url, body }; return { headers: { 'resource-id': '9' } }; } };
    await action('replyToConversation').run(makeContext(http, { conversationId: '12', type: 'note', text: 'Interno', userId: '3', status: 'pending' }));
    expect(sent).toEqual({ url: '/conversations/12/threads', body: { type: 'note', text: 'Interno', user: 3, status: 'pending' } });
  });

  it('updates status / assignee and lists conversations', async () => {
    let put;
    const http = {
      put: async (url, body) => { put = { url, body }; return { status: 204 }; },
      get: async (_u, cfg) => ({ data: { _embedded: { conversations: [{ id: 1, subject: 'A', customer: { email: 'c@x.com' } }] }, page: { totalElements: 1 }, cfg } }),
    };
    await action('updateConversation').run(makeContext(http, { conversationId: '5', byUser: '2', status: 'closed' }));
    expect(put).toEqual({ url: '/conversations/5', body: { byUser: 2, status: 'closed' } });
    await expect(action('updateConversation').run(makeContext(http, { conversationId: '5', byUser: '2' }))).rejects.toThrow();
    const $ = makeContext(http, { status: 'active' });
    await action('listConversations').run($);
    expect($.item.raw.conversations[0]).toMatchObject({ id: 1, customer: 'c@x.com' });
    expect(resourceId({ headers: {} })).toBeNull();
  });
});
