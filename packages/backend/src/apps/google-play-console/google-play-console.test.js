import { describe, it, expect } from 'vitest';
import app from './index.js';
import auth from './auth.js';
import { PLAY_API, getTracks, packageName, playErrorText, summarizeReview } from './common.js';

const REDIRECT = 'https://vertal.dev/fluxos/oauth/google-play-console';

const ctx = (http = {}, parameters = {}, data = {}) => {
  const authData = { clientId: 'gid', clientSecret: 'gsec', ...data };
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

describe('google-play-console app', () => {
  it('uses Google OAuth (Vertal client) with the androidpublisher scope', async () => {
    expect(app.key).toBe('google-play-console');
    expect(app.auth.fields.map((f) => f.key)).toEqual(['oAuthRedirectUrl', 'clientId', 'clientSecret']);
    const $ = ctx();
    await auth.generateAuthUrl($);
    const url = new URL($.auth.data.url);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
    expect(url.searchParams.get('scope')).toBe('openid email profile https://www.googleapis.com/auth/androidpublisher');
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(app.actions.map((a) => a.key)).toEqual(['checkAccess', 'replyToReview']);
    expect(app.triggers.map((t) => t.key)).toEqual(['listReviews', 'listTracks', 'listSubscriptions', 'listOneTimeProducts']);
  });

  it('validates package names (no path injection)', () => {
    expect(packageName(' com.vertal.app ')).toBe('com.vertal.app');
    expect(() => packageName('com.x/../../y')).toThrow();
    expect(() => packageName('semponto')).toThrow();
  });

  it('reads tracks through a temporary edit and always deletes it', async () => {
    const calls = [];
    const http = {
      post: async (url) => { calls.push(['POST', url]); return { data: { id: 'e1' } }; },
      get: async (url) => {
        calls.push(['GET', url]);
        if (url.endsWith('/tracks')) return { data: { tracks: [{ track: 'production', releases: [{ status: 'completed', versionCodes: ['12'] }] }] } };
        return { data: { defaultLanguage: 'pt-BR', contactEmail: 'dev@vertal.dev' } };
      },
      delete: async (url) => { calls.push(['DELETE', url]); return { data: {} }; },
    };
    const info = await getTracks(ctx(http), 'com.vertal.app');
    expect(info.tracks[0]).toMatchObject({ track: 'production', releases: [{ status: 'completed', versionCodes: ['12'] }] });
    expect(info.defaultLanguage).toBe('pt-BR');
    expect(calls[0]).toEqual(['POST', `${PLAY_API}/applications/com.vertal.app/edits`]);
    expect(calls.at(-1)).toEqual(['DELETE', `${PLAY_API}/applications/com.vertal.app/edits/e1`]);
  });

  it('replies to a review (350 char limit) and explains missing Play Console access', async () => {
    const posts = [];
    const http = { post: async (url, body) => { posts.push({ url, body }); return { data: { result: { replyText: body.replyText } } }; } };
    const reply = app.actions.find((a) => a.key === 'replyToReview');
    await reply.run(ctx(http, { packageName: 'com.vertal.app', reviewId: 'gp:AOqp', replyText: 'Obrigado!' }));
    expect(posts[0].url).toBe(`${PLAY_API}/applications/com.vertal.app/reviews/gp%3AAOqp:reply`);
    await expect(reply.run(ctx(http, { packageName: 'com.vertal.app', reviewId: 'r', replyText: 'x'.repeat(351) }))).rejects.toThrow(/350/);
    expect(playErrorText({ response: { status: 403 } })).toMatch(/Usuários e permissões/);
  });

  it('flattens a review with the developer reply', () => {
    const r = summarizeReview({
      reviewId: 'r1', authorName: 'Ana',
      comments: [
        { userComment: { text: ' Ótimo ', starRating: 5, lastModified: { seconds: '1700000000' }, appVersionName: '1.2' } },
        { developerComment: { text: 'Valeu', lastModified: { seconds: '1700000100' } } },
      ],
    });
    expect(r).toMatchObject({ reviewId: 'r1', stars: 5, text: 'Ótimo', appVersion: '1.2', reply: { text: 'Valeu' } });
  });
});
