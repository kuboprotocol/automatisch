import { describe, it, expect } from 'vitest';
import app from './index.js';
import auth from './auth/index.js';
import setBaseUrl from './common/set-base-url.js';
import addAuthHeader from './common/add-auth-header.js';
import { instanceBase } from './common/instance.js';
import { buildTransaction } from './common/transactions.js';

const REDIRECT = 'https://vertal.dev/fluxos/oauth/firefly-iii';

const makeContext = (data = {}, http = {}, parameters = {}) => {
  const authData = { instanceUrl: 'https://money.example.com/', clientId: '7', clientSecret: 'sec', ...data };
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

describe('firefly-iii app', () => {
  it('per-user OAuth (own client on the instance) + Personal Access Token under Avançado', () => {
    expect(app.auth.fields.map((f) => f.key)).toEqual(['oAuthRedirectUrl', 'instanceUrl', 'clientId', 'clientSecret', 'personalAccessToken']);
    expect(app.auth.fields.find((f) => f.key === 'clientSecret').oauthOnly).toBe(true);
    expect(app.auth.fields.find((f) => f.key === 'personalAccessToken').advanced).toBe(true);
    expect(app.actions.map((a) => a.key)).toEqual(['createTransaction', 'listAccounts']);
    expect(app.triggers.length).toBe(3);
  });

  it('normalizes the instance URL (subfolder, trailing slash) and rejects others', () => {
    expect(instanceBase('https://x.com/firefly/')).toBe('https://x.com/firefly');
    expect(instanceBase(' https://x.com ')).toBe('https://x.com');
    expect(() => instanceBase('ftp://x.com')).toThrow();
    expect(() => instanceBase('nope')).toThrow();
    const $ = makeContext({ instanceUrl: 'https://x.com/firefly/' });
    expect(setBaseUrl($, { headers: {} }).baseURL).toBe('https://x.com/firefly/api');
    expect(setBaseUrl($, { headers: {}, additionalProperties: { skipAddingBaseUrl: true } }).baseURL).toBe('https://x.com/firefly');
  });

  it('builds the authorization url on the user instance', async () => {
    const $ = makeContext();
    await auth.generateAuthUrl($);
    const url = new URL($.auth.data.url);
    expect(url.origin + url.pathname).toBe('https://money.example.com/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('7');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('response_type')).toBe('code');
  });

  it('exchanges the code (form) and keeps the refresh token', async () => {
    const calls = [];
    const http = {
      post: async (url, body, cfg) => { calls.push({ url, body, cfg }); return { data: { access_token: 'at', refresh_token: 'rt', expires_in: 3600, token_type: 'Bearer' } }; },
      get: async () => ({ data: { data: { id: '1', attributes: { email: 'me@x.com' } } } }),
    };
    const $ = makeContext({ code: 'c0de' }, http);
    await auth.verifyCredentials($);
    expect(calls[0].url).toBe('/oauth/token');
    expect(calls[0].cfg.additionalProperties).toMatchObject({ skipAddingBaseUrl: true, skipAddingAuthHeader: true });
    const form = new URLSearchParams(calls[0].body);
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('redirect_uri')).toBe(REDIRECT);
    expect($.auth.data).toMatchObject({ accessToken: 'at', refreshToken: 'rt', screenName: 'me@x.com', code: null });
  });

  it('accepts a Personal Access Token and never refreshes it', async () => {
    const http = { get: async () => ({ data: { data: { id: '1', attributes: { email: 'pat@x.com' } } } }), post: async () => { throw new Error('no'); } };
    const $ = makeContext({ clientId: undefined, clientSecret: undefined, personalAccessToken: 'pat' }, http);
    await auth.verifyCredentials($);
    expect($.auth.data.screenName).toBe('pat@x.com');
    await auth.refreshToken($);
    expect(addAuthHeader($, { headers: {} }).headers.Authorization).toBe('Bearer pat');
  });

  it('builds a transaction body', () => {
    const body = buildTransaction({ type: 'withdrawal', description: 'Mercado', amount: '49,90', date: '2026-11-26', sourceId: '3', destinationName: 'Padaria', tags: 'casa, mês' });
    expect(body.transactions[0]).toMatchObject({ type: 'withdrawal', amount: '49.90', source_id: '3', destination_name: 'Padaria', tags: ['casa', 'mês'] });
    expect(() => buildTransaction({ description: 'x', amount: '-1', sourceName: 'a', destinationName: 'b' })).toThrow(/positive/);
    expect(() => buildTransaction({ description: 'x', amount: '1', destinationName: 'b' })).toThrow(/source/);
    expect(() => buildTransaction({ type: 'bogus', description: 'x', amount: '1' })).toThrow(/type/);
  });

  it('createTransaction posts to /v1/transactions', async () => {
    let sent;
    const http = { post: async (url, body) => { sent = { url, body }; return { data: { data: { id: '55', attributes: { transactions: [{ transaction_journal_id: '60', amount: '10.00' }] } } } }; } };
    const action = app.actions.find((a) => a.key === 'createTransaction');
    const $ = makeContext({}, http, { type: 'deposit', description: 'Salário', amount: '10', sourceName: 'Empresa', destinationId: '2' });
    await action.run($);
    expect(sent.url).toBe('/v1/transactions');
    expect(sent.body.transactions[0]).toMatchObject({ type: 'deposit', source_name: 'Empresa', destination_id: '2' });
    expect($.item.raw.id).toBe('55');
  });
});
