import { describe, it, expect } from 'vitest';
import app from './index.js';
import auth from './auth.js';
import actions from './actions/index.js';
import { MONDAY_SCOPES, mondayAddAuth, mondayToken, screenNameOf } from './common.js';

const REDIRECT = 'https://vertal.dev/fluxos/oauth/monday';

const makeContext = (data = {}, http = {}, parameters = {}) => {
  const authData = { clientId: 'mon-client', clientSecret: 'mon-secret', ...data };
  return {
    app: { auth: { fields: [{ key: 'oAuthRedirectUrl', value: REDIRECT }] } },
    auth: { data: authData, set: async (v) => Object.assign(authData, v) },
    http,
    step: { parameters },
    setActionItem(item) {
      this.item = item;
    },
  };
};

const ME = { data: { data: { me: { id: 42, name: 'Ana', email: 'ana@vertal.dev', account: { name: 'Vertal Company' } } } } };

describe('monday app', () => {
  it('has OAuth client fields + API token under Avançado', () => {
    expect(app.key).toBe('monday');
    const fields = app.auth.fields;
    expect(fields.map((f) => f.key)).toEqual(['oAuthRedirectUrl', 'clientId', 'clientSecret', 'apiToken']);
    expect(fields.find((f) => f.key === 'clientId').oauthOnly).toBe(true);
    const token = fields.find((f) => f.key === 'apiToken');
    expect(token.advanced).toBe(true);
    expect(token.required).toBe(false);
    expect(typeof app.auth.generateAuthUrl).toBe('function');
    expect(actions.map((a) => a.key)).toContain('createUpdate');
  });

  it('builds the authorization url on auth.monday.com', async () => {
    const $ = makeContext();
    await auth.generateAuthUrl($);
    const url = new URL($.auth.data.url);
    expect(url.origin + url.pathname).toBe('https://auth.monday.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('mon-client');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    // Escopos vêm do app no Developer Center (não vão na URL).
    expect(url.searchParams.has('scope')).toBe(false);
    expect(MONDAY_SCOPES).toContain('boards:write');
    expect(url.searchParams.get('force_install_if_needed')).toBe('true');
    expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('exchanges the code and stores the token + screen name', async () => {
    const calls = [];
    const http = {
      post: async (url, body, cfg) => {
        calls.push({ url, body, cfg });
        if (url === 'https://auth.monday.com/oauth2/token') return { data: { access_token: 'tok', token_type: 'bearer', scope: 'me:read' } };
        return ME;
      },
    };
    const $ = makeContext({ code: 'the-code' }, http);
    await auth.verifyCredentials($);
    const form = new URLSearchParams(calls[0].body);
    expect(form.get('client_id')).toBe('mon-client');
    expect(form.get('client_secret')).toBe('mon-secret');
    expect(form.get('code')).toBe('the-code');
    expect(form.get('redirect_uri')).toBe(REDIRECT);
    expect(calls[0].cfg.additionalProperties.skipAddingAuthHeader).toBe(true);
    expect($.auth.data).toMatchObject({ accessToken: 'tok', code: null, userId: '42', screenName: 'Ana · ana@vertal.dev (Vertal Company)' });
  });

  it('accepts a personal API token without OAuth (Avançado)', async () => {
    const http = { post: async () => ME };
    const $ = makeContext({ clientId: undefined, clientSecret: undefined, apiToken: 'pat' }, http);
    await auth.verifyCredentials($);
    expect($.auth.data.screenName).toContain('Ana');
    await expect(auth.verifyCredentials(makeContext({}, http))).rejects.toThrow(/authorization code/);
  });

  it('sends the OAuth token, else the API token', () => {
    expect(mondayToken({ accessToken: 'a', apiToken: 'b' })).toBe('a');
    expect(mondayToken({ apiToken: 'b' })).toBe('b');
    const cfg = mondayAddAuth({ auth: { data: { apiToken: 'b' } } }, { headers: {} });
    expect(cfg.headers.Authorization).toBe('b');
    const skip = mondayAddAuth({ auth: { data: { apiToken: 'b' } } }, { headers: {}, additionalProperties: { skipAddingAuthHeader: true } });
    expect(skip.headers.Authorization).toBeUndefined();
    expect(screenNameOf(null)).toBe('monday.com');
  });

  it('creates an update with GraphQL variables (no string interpolation)', async () => {
    let sent;
    const http = { post: async (_u, body) => { sent = body; return { data: { data: { create_update: { id: '9' } } } }; } };
    const action = actions.find((a) => a.key === 'createUpdate');
    const $ = makeContext({}, http, { itemId: '123', body: 'Olá "mundo"' });
    await action.run($);
    expect(sent.variables).toEqual({ itemId: '123', body: 'Olá "mundo"' });
    expect(sent.query).not.toContain('mundo');
    expect($.item.raw.id).toBe('9');
    await expect(action.run(makeContext({}, http, { itemId: '12a', body: 'x' }))).rejects.toThrow(/numeric/);
  });
});
