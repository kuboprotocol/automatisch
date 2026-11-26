import { describe, it, expect } from 'vitest';
import generateAuthUrl from './generate-auth-url.js';

describe('gitlab auth url', () => {
  it('uses the oAuthRedirectUrl field value (white-label callback)', async () => {
    const data = { clientId: 'cid', instanceUrl: 'https://gitlab.com' };
    const $ = {
      app: { baseUrl: 'https://gitlab.com', auth: { fields: [{ key: 'oAuthRedirectUrl', value: 'https://vertal.dev/fluxos/oauth/gitlab' }] } },
      auth: { data, set: async (v) => Object.assign(data, v) },
    };
    await generateAuthUrl($);
    const url = new URL(data.url);
    expect(url.origin).toBe('https://gitlab.com');
    expect(url.searchParams.get('redirect_uri')).toBe('https://vertal.dev/fluxos/oauth/gitlab');
  });
});
