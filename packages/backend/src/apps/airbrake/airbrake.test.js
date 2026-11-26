import { describe, it, expect } from 'vitest';
import app from './index.js';
import setBaseUrl from './common/set-base-url.js';
import { airbrakeId, summarizeGroup } from './common/groups.js';

const ctx = (http = {}, parameters = {}, instanceUrl = '') => ({
  auth: { data: { instanceUrl, authToken: 'k' } },
  http,
  step: { parameters },
  setActionItem(item) {
    this.item = item;
  },
});

describe('airbrake app', () => {
  it('user API key (no OAuth) + list and mute actions', () => {
    expect(app.auth.generateAuthUrl).toBeUndefined();
    expect(app.auth.fields.map((f) => f.key)).toEqual(['screenName', 'instanceUrl', 'authToken']);
    expect(JSON.stringify(app.auth.fields)).not.toMatch(/automatisch/i);
    expect(app.actions.map((a) => a.key)).toEqual(['listErrorGroups', 'muteErrorGroup']);
  });

  it('only sends the key to airbrake.io hosts', () => {
    expect(setBaseUrl(ctx(), { headers: {} }).baseURL).toBe('https://api.airbrake.io/api');
    expect(setBaseUrl(ctx({}, {}, 'https://acme.airbrake.io'), { headers: {} }).baseURL).toBe('https://acme.airbrake.io/api');
    expect(setBaseUrl(ctx({}, {}, 'https://evil.com'), { headers: {} }).baseURL).toBe('https://api.airbrake.io/api');
  });

  it('lists groups of all projects or one project', async () => {
    const urls = [];
    const http = { get: async (url) => { urls.push(url); return { data: { groups: [{ id: 12345678901234567890, projectId: 1, errors: [{ type: 'TypeError', message: 'x', backtrace: [{ file: 'a.js', line: 3 }] }] }], count: 1 } }; } };
    const action = app.actions.find((a) => a.key === 'listErrorGroups');
    const $ = ctx(http, {});
    await action.run($);
    await action.run(ctx(http, { projectId: '7' }));
    expect(urls).toEqual(['/v4/groups', '/v4/projects/7/groups']);
    expect($.item.raw.groups[0]).toMatchObject({ type: 'TypeError', where: 'a.js:3' });
  });

  it('mutes and unmutes a group with string ids', async () => {
    const urls = [];
    const http = { put: async (url) => { urls.push(url); return { data: {} }; } };
    const action = app.actions.find((a) => a.key === 'muteErrorGroup');
    await action.run(ctx(http, { projectId: '7', groupId: '2963785918937452645', mute: 'mute' }));
    await action.run(ctx(http, { projectId: '7', groupId: '2963785918937452645', mute: 'unmute' }));
    expect(urls).toEqual(['/v4/projects/7/groups/2963785918937452645/muted', '/v4/projects/7/groups/2963785918937452645/unmuted']);
    expect(() => airbrakeId('1; drop', 'x')).toThrow();
    expect(summarizeGroup({}).id).toBe('');
  });
});
