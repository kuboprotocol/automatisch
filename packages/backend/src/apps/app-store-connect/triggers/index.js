import defineTrigger from '../../../helpers/define-trigger.js';
import { pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { listApps, listBuilds, listCustomerReviews, withAscErrors } from '../common.js';

const appId = stringArg('appId', 'App ID (Apple ID, numbers; use List apps)', { required: true });

const apps = defineTrigger({
  name: 'List apps',
  key: 'listApps',
  pollInterval: 60,
  description: 'Apps of the App Store Connect team (Apple ID, name, bundle ID, SKU).',
  arguments: [],
  async run($) {
    pushItems($, await withAscErrors(() => listApps($)), (a) => a.id);
  },
});

const builds = defineTrigger({
  name: 'List builds',
  key: 'listBuilds',
  pollInterval: 60,
  description: 'Latest uploaded builds (version, upload date, processing state) — e.g. after an Xcode archive upload.',
  arguments: [appId],
  async run($) {
    pushItems($, await withAscErrors(() => listBuilds($, $.step.parameters.appId)), (b) => b.id);
  },
});

const reviews = defineTrigger({
  name: 'List customer reviews',
  key: 'listCustomerReviews',
  pollInterval: 60,
  description: 'Latest App Store reviews (rating, title, text, territory) and the developer response, if any.',
  arguments: [appId],
  async run($) {
    pushItems($, await withAscErrors(() => listCustomerReviews($, $.step.parameters.appId)), (r) => r.id);
  },
});

export default [apps, builds, reviews];
