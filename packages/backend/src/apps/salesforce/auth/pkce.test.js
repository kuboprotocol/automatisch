import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import generateAuthUrl from './generate-auth-url.js';
import { codeChallengeFor, createCodeVerifier } from '../common/pkce.js';

const makeContext = () => {
  const data = {
    consumerKey: 'key-123',
    oauth2Url: 'https://login.salesforce.com/services/oauth2',
  };
  return {
    app: { auth: { fields: [{ key: 'oAuthRedirectUrl', value: 'https://vertal.dev/fluxos/oauth/salesforce' }] } },
    auth: { data, set: async (v) => Object.assign(data, v) },
  };
};

describe('salesforce PKCE', () => {
  it('creates a verifier within RFC 7636 limits', () => {
    const v = createCodeVerifier();
    expect(v).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
  });

  it('computes the S256 challenge', () => {
    const expected = crypto.createHash('sha256').update('abc').digest('base64url');
    expect(codeChallengeFor('abc')).toBe(expected);
  });

  it('sends code_challenge in the auth url and keeps the verifier', async () => {
    const $ = makeContext();
    await generateAuthUrl($);
    const url = new URL($.auth.data.url);
    expect(url.origin + url.pathname).toBe('https://login.salesforce.com/services/oauth2/authorize');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('redirect_uri')).toBe('https://vertal.dev/fluxos/oauth/salesforce');
    expect(url.searchParams.get('code_challenge')).toBe(codeChallengeFor($.auth.data.codeVerifier));
  });
});
