import { describe, it, expect } from 'vitest';
import app from './index.js';
import auth from './auth.js';
import actions from './actions/index.js';
import { buildPost, escapeCommentary, linkedinAddAuth, linkedinVersion } from './common.js';

const REDIRECT = 'https://vertal.dev/fluxos/oauth/linkedin';

const makeContext = (data = {}, http = {}) => {
  const authData = { clientId: 'li-client', clientSecret: 'li-secret', ...data };
  return {
    app: { auth: { fields: [{ key: 'oAuthRedirectUrl', value: REDIRECT }] } },
    auth: { data: authData, set: async (v) => Object.assign(authData, v) },
    http,
    step: { parameters: {} },
    setActionItem(item) {
      this.item = item;
    },
  };
};

describe('linkedin app', () => {
  it('is registered with OAuth and three actions', () => {
    expect(app.key).toBe('linkedin');
    expect(app.auth.fields.map((f) => f.key)).toEqual(['oAuthRedirectUrl', 'clientId', 'clientSecret']);
    expect(actions.map((a) => a.key)).toEqual(['getProfile', 'createTextPost', 'createLinkPost']);
  });

  it('builds the authorization url with OIDC + share scopes', async () => {
    const $ = makeContext();
    await auth.generateAuthUrl($);
    const url = new URL($.auth.data.url);
    expect(url.origin + url.pathname).toBe('https://www.linkedin.com/oauth/v2/authorization');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('li-client');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('scope')).toBe('openid profile email w_member_social');
    expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('exchanges the code and stores the member urn', async () => {
    const calls = [];
    const http = {
      post: async (url, body, cfg) => {
        calls.push({ url, body, cfg });
        return { data: { access_token: 'tok', expires_in: 5184000, scope: 'openid,profile' } };
      },
      get: async (url) => {
        calls.push({ url });
        return { data: { sub: 'abc123', name: 'Laercio Borges', email: 'x@y.z' } };
      },
    };
    const $ = makeContext({ code: 'the-code' }, http);
    await auth.verifyCredentials($);
    expect(calls[0].url).toBe('https://www.linkedin.com/oauth/v2/accessToken');
    const form = new URLSearchParams(calls[0].body);
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('code')).toBe('the-code');
    expect(form.get('redirect_uri')).toBe(REDIRECT);
    expect(form.get('client_secret')).toBe('li-secret');
    expect(calls[0].cfg.additionalProperties.skipAddingAuthHeader).toBe(true);
    expect(calls[1].url).toBe('https://api.linkedin.com/v2/userinfo');
    expect($.auth.data.accessToken).toBe('tok');
    expect($.auth.data.personUrn).toBe('urn:li:person:abc123');
    expect($.auth.data.screenName).toBe('Laercio Borges');
    expect($.auth.data.code).toBeNull();
  });

  it('escapes little-text reserved characters', () => {
    expect(escapeCommentary('Oi (teste) #vertal @time [x] *y* _z_ ~w~ a|b {c} <d> \\')).toBe(
      'Oi \\(teste\\) \\#vertal \\@time \\[x\\] \\*y\\* \\_z\\_ \\~w\\~ a\\|b \\{c\\} \\<d\\> \\\\'
    );
  });

  it('builds text and link posts', () => {
    const text = buildPost({ author: 'urn:li:person:1', text: 'Olá' });
    expect(text).toMatchObject({ author: 'urn:li:person:1', commentary: 'Olá', visibility: 'PUBLIC', lifecycleState: 'PUBLISHED' });
    expect(text.content).toBeUndefined();
    const link = buildPost({ author: 'urn:li:person:1', text: 'Veja', visibility: 'CONNECTIONS', article: { source: 'https://vertal.dev', title: 'Vertal' } });
    expect(link.visibility).toBe('CONNECTIONS');
    expect(link.content).toEqual({ article: { source: 'https://vertal.dev', title: 'Vertal' } });
  });

  it('uses a Posts API version two months back', () => {
    expect(linkedinVersion(new Date(Date.UTC(2026, 10, 26)))).toBe('202609');
    expect(linkedinVersion(new Date(Date.UTC(2027, 0, 5)))).toBe('202611');
  });

  it('adds bearer and version headers only where needed', () => {
    const $ = makeContext({ accessToken: 'tok' });
    const rest = linkedinAddAuth($, { url: 'https://api.linkedin.com/rest/posts', headers: {} });
    expect(rest.headers.Authorization).toBe('Bearer tok');
    expect(rest.headers['LinkedIn-Version']).toMatch(/^\d{6}$/);
    expect(rest.headers['X-Restli-Protocol-Version']).toBe('2.0.0');
    const v2 = linkedinAddAuth($, { url: 'https://api.linkedin.com/v2/userinfo', headers: {} });
    expect(v2.headers['LinkedIn-Version']).toBeUndefined();
    const skip = linkedinAddAuth($, { url: 'x', headers: {}, additionalProperties: { skipAddingAuthHeader: true } });
    expect(skip.headers.Authorization).toBeUndefined();
  });

  it('createLinkPost posts to /rest/posts and returns the post url', async () => {
    let sent;
    const http = {
      post: async (url, body) => {
        sent = { url, body };
        return { data: '', headers: { 'x-restli-id': 'urn:li:share:999' } };
      },
    };
    const $ = makeContext({ accessToken: 'tok', personUrn: 'urn:li:person:abc' }, http);
    $.step.parameters = { text: 'Novo app!', url: 'https://vertal.dev', title: 'Vertal Dev', visibility: 'PUBLIC' };
    await actions.find((a) => a.key === 'createLinkPost').run($);
    expect(sent.url).toBe('https://api.linkedin.com/rest/posts');
    expect(sent.body.author).toBe('urn:li:person:abc');
    expect(sent.body.content.article.source).toBe('https://vertal.dev');
    expect($.item.raw).toEqual({
      id: 'urn:li:share:999',
      author: 'urn:li:person:abc',
      url: 'https://www.linkedin.com/feed/update/urn:li:share:999/',
      visibility: 'PUBLIC',
    });
  });

  it('createLinkPost rejects non-http links', async () => {
    const $ = makeContext({ accessToken: 'tok', personUrn: 'urn:li:person:abc' }, {});
    $.step.parameters = { text: 'x', url: 'javascript:alert(1)' };
    await expect(actions.find((a) => a.key === 'createLinkPost').run($)).rejects.toThrow(/http/);
  });
});
