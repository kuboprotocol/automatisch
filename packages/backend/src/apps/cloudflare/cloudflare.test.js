import { describe, it, expect } from 'vitest';
import app from './index.js';
import auth from './auth.js';
import actions from './actions/index.js';
import { CLOUDFLARE_SCOPES, buildDnsRecord, cfId, cloudflareAddAuth, unwrap } from './common.js';

const REDIRECT = 'https://vertal.dev/fluxos/oauth/cloudflare';
const ZONE = '49603c7b9c10473d1229f994ee7e30f7';

const makeContext = (data = {}, http = {}, parameters = {}) => {
  const authData = { clientId: 'cf-client', clientSecret: 'cf-secret', ...data };
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

describe('cloudflare app', () => {
  it('is registered with OAuth fields and its actions', () => {
    expect(app.key).toBe('cloudflare');
    expect(app.auth.fields.map((f) => f.key)).toEqual(['oAuthRedirectUrl', 'clientId', 'clientSecret']);
    expect(actions.map((a) => a.key)).toEqual([
      'getUser', 'listAccounts', 'listZones', 'listDnsRecords', 'createDnsRecord', 'listWorkers', 'listPagesProjects', 'purgeCache',
    ]);
  });

  it('builds the authorization url on dash.cloudflare.com with the client scopes + offline_access', async () => {
    const $ = makeContext();
    await auth.generateAuthUrl($);
    const url = new URL($.auth.data.url);
    expect(url.origin + url.pathname).toBe('https://dash.cloudflare.com/oauth2/auth');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('cf-client');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('scope')).toBe(CLOUDFLARE_SCOPES.join(' '));
    expect(url.searchParams.get('scope')).toContain('offline_access');
    expect(url.searchParams.get('state')).toMatch(/^[0-9a-f]{32}$/);
  });

  it('exchanges the code (client_secret_post) and stores the user e-mail', async () => {
    const calls = [];
    const http = {
      post: async (url, body, cfg) => {
        calls.push({ url, body, cfg });
        return { data: { access_token: 'tok', refresh_token: 'ref', expires_in: 3600, token_type: 'bearer', scope: 'zone.read' } };
      },
      get: async (url) => {
        calls.push({ url });
        return { data: { success: true, result: { id: 'u1', email: 'dev@vertal.dev' } } };
      },
    };
    const $ = makeContext({ code: 'the-code' }, http);
    await auth.verifyCredentials($);
    expect(calls[0].url).toBe('https://dash.cloudflare.com/oauth2/token');
    const form = new URLSearchParams(calls[0].body);
    expect(form.get('grant_type')).toBe('authorization_code');
    expect(form.get('code')).toBe('the-code');
    expect(form.get('redirect_uri')).toBe(REDIRECT);
    expect(form.get('client_id')).toBe('cf-client');
    expect(form.get('client_secret')).toBe('cf-secret');
    expect(calls[0].cfg.additionalProperties.skipAddingAuthHeader).toBe(true);
    expect(calls[1].url).toBe('https://api.cloudflare.com/client/v4/user');
    expect($.auth.data).toMatchObject({ accessToken: 'tok', refreshToken: 'ref', screenName: 'dev@vertal.dev', code: null });
  });

  it('refreshes and keeps the rotated refresh token', async () => {
    const http = { post: async () => ({ data: { access_token: 'tok2', refresh_token: 'ref2', expires_in: 3600 } }) };
    const $ = makeContext({ refreshToken: 'ref1' }, http);
    await auth.refreshToken($);
    expect($.auth.data.accessToken).toBe('tok2');
    expect($.auth.data.refreshToken).toBe('ref2');
    const none = makeContext({}, { post: async () => { throw new Error('should not call'); } });
    await auth.refreshToken(none);
  });

  it('adds the bearer token except on token calls', () => {
    const $ = makeContext({ accessToken: 'abc' });
    expect(cloudflareAddAuth($, { headers: {} }).headers.Authorization).toBe('Bearer abc');
    expect(cloudflareAddAuth($, { headers: {}, additionalProperties: { skipAddingAuthHeader: true } }).headers.Authorization).toBeUndefined();
  });

  it('unwraps API errors and validates ids', () => {
    expect(unwrap({ success: true, result: [1] })).toEqual([1]);
    expect(() => unwrap({ success: false, errors: [{ code: 9109, message: 'Unauthorized' }] })).toThrow('9109: Unauthorized');
    expect(cfId(ZONE, 'Zone ID')).toBe(ZONE);
    expect(() => cfId('../accounts', 'Zone ID')).toThrow('Zone ID inválido');
  });

  it('builds DNS records safely', () => {
    expect(buildDnsRecord({ type: 'a', name: 'www', content: '1.2.3.4', proxied: 'true' })).toEqual({
      type: 'A', name: 'www', content: '1.2.3.4', ttl: 1, proxied: true,
    });
    expect(buildDnsRecord({ type: 'MX', name: '@', content: 'mx.example.com', priority: '10', ttl: '300' })).toEqual({
      type: 'MX', name: '@', content: 'mx.example.com', ttl: 300, priority: 10,
    });
    expect(() => buildDnsRecord({ type: 'PTR', name: 'x', content: 'y' })).toThrow('não suportado');
  });

  it('creates a DNS record through the zone endpoint', async () => {
    const calls = [];
    const http = { post: async (url, body) => { calls.push({ url, body }); return { data: { success: true, result: { id: 'r1', ...body } } }; } };
    const $ = makeContext({ accessToken: 't' }, http, { zoneId: ZONE, type: 'CNAME', name: 'app', content: 'vertal.dev', proxied: 'false' });
    await actions.find((a) => a.key === 'createDnsRecord').run($);
    expect(calls[0].url).toBe(`https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records`);
    expect(calls[0].body).toMatchObject({ type: 'CNAME', name: 'app', content: 'vertal.dev', proxied: false });
    expect($.item.raw.id).toBe('r1');
  });

  it('purges everything when no URL is given, and only http(s) URLs otherwise', async () => {
    const calls = [];
    const http = { post: async (url, body) => { calls.push({ url, body }); return { data: { success: true, result: { id: ZONE } } }; } };
    const purge = actions.find((a) => a.key === 'purgeCache');
    await purge.run(makeContext({}, http, { zoneId: ZONE, urls: '' }));
    expect(calls[0].body).toEqual({ purge_everything: true });
    await purge.run(makeContext({}, http, { zoneId: ZONE, urls: 'https://vertal.dev/a, https://vertal.dev/b' }));
    expect(calls[1].body).toEqual({ files: ['https://vertal.dev/a', 'https://vertal.dev/b'] });
    await expect(purge.run(makeContext({}, http, { zoneId: ZONE, urls: 'javascript:x' }))).rejects.toThrow('http(s)');
  });
});
