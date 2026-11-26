import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';
import app from './index.js';
import { ASC_API, ascAddAuth, ascToken, listCustomerReviews, normalizeP8, validateIds } from './common.js';

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const P8 = privateKey.export({ type: 'pkcs8', format: 'pem' });
const AUTH = { issuerId: '57246542-96fe-1a63-e053-0824d011072a', keyId: '2X9R4HXF34', privateKey: P8 };

const ctx = (http = {}, parameters = {}) => ({
  auth: { data: { ...AUTH }, set: async () => {} },
  http,
  step: { parameters },
  setActionItem(item) {
    this.item = item;
  },
});

describe('app-store-connect app', () => {
  it('connects by team API key (no OAuth)', () => {
    expect(app.key).toBe('app-store-connect');
    expect(app.auth.generateAuthUrl).toBeUndefined();
    expect(app.auth.fields.map((f) => f.key)).toEqual(['screenName', 'issuerId', 'keyId', 'privateKey']);
    expect(app.triggers.map((t) => t.key)).toEqual(['listApps', 'listBuilds', 'listCustomerReviews']);
    expect(app.actions.map((a) => a.key)).toEqual(['replyToReview']);
  });

  it('signs a valid ES256 JWT for appstoreconnect-v1', () => {
    const jwt = ascToken(AUTH, 1_800_000_000);
    const [h, p, s] = jwt.split('.');
    const header = JSON.parse(Buffer.from(h, 'base64url').toString());
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
    expect(header).toEqual({ alg: 'ES256', kid: '2X9R4HXF34', typ: 'JWT' });
    expect(payload).toEqual({ iss: AUTH.issuerId, iat: 1_800_000_000, exp: 1_800_000_000 + 1140, aud: 'appstoreconnect-v1' });
    const ok = crypto.verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'));
    expect(ok).toBe(true);
  });

  it('accepts the .p8 pasted on one line (input strips line breaks)', () => {
    const oneLine = P8.replace(/\n/g, ' ');
    expect(normalizeP8(oneLine)).toBe(normalizeP8(P8));
    expect(() => ascToken({ ...AUTH, privateKey: oneLine })).not.toThrow();
    expect(() => normalizeP8('not a key!')).toThrow(/p8/);
  });

  it('validates Issuer ID and Key ID', () => {
    expect(() => validateIds({ issuerId: 'x', keyId: '2X9R4HXF34' })).toThrow(/Issuer/);
    expect(() => validateIds({ issuerId: AUTH.issuerId, keyId: 'abc' })).toThrow(/Key ID/);
  });

  it('adds the bearer only for api.appstoreconnect.apple.com', () => {
    const apple = ascAddAuth(ctx(), { url: `${ASC_API}/v1/apps`, headers: {} });
    expect(apple.headers.Authorization).toMatch(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/);
    const other = ascAddAuth(ctx(), { url: 'https://evil.example.com/v1/apps', headers: {} });
    expect(other.headers.Authorization).toBeUndefined();
  });

  it('lists reviews with the developer response', async () => {
    const http = {
      get: async (url) => {
        expect(url).toBe(`${ASC_API}/v1/apps/123/customerReviews`);
        return {
          data: {
            data: [{ id: 'r1', attributes: { rating: 4, title: 'Bom', body: 'Gostei', reviewerNickname: 'ana', territory: 'BRA' }, relationships: { response: { data: { id: 'p1' } } } }],
            included: [{ type: 'customerReviewResponses', id: 'p1', attributes: { responseBody: 'Obrigado' } }],
          },
        };
      },
    };
    const rows = await listCustomerReviews(ctx(http), '123');
    expect(rows[0]).toMatchObject({ id: 'r1', rating: 4, response: 'Obrigado' });
    await expect(listCustomerReviews(ctx(http), '../x')).rejects.toThrow(/App ID/);
  });
});
