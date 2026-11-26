import defineTrigger from '../../../helpers/define-trigger.js';
import { pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { getTracks, listOneTimeProducts, listReviews, listSubscriptions, withPlayErrors } from '../common.js';

const pkg = stringArg('packageName', 'Package name (ex.: com.empresa.app)', { required: true });

const reviews = defineTrigger({
  name: 'List reviews',
  key: 'listReviews',
  pollInterval: 60,
  description: 'Recent Google Play reviews with text (last 7 days, as the API returns), stars and the developer reply.',
  arguments: [pkg, stringArg('translationLanguage', 'Translate to (optional, ex.: pt-BR)')],
  async run($) {
    const { packageName, translationLanguage } = $.step.parameters;
    const items = await withPlayErrors(() => listReviews($, packageName, { translationLanguage }));
    pushItems($, items, (r) => `${r.reviewId}:${r.lastModified}`);
  },
});

const tracks = defineTrigger({
  name: 'List release tracks',
  key: 'listTracks',
  pollInterval: 60,
  description: 'Production, open, closed and internal tracks with each release status and version codes (read-only).',
  arguments: [pkg],
  async run($) {
    const info = await withPlayErrors(() => getTracks($, $.step.parameters.packageName));
    pushItems($, info.tracks.map((t) => ({ ...t, packageName: info.packageName })), (t) => `${t.track}:${JSON.stringify(t.releases)}`.slice(0, 200));
  },
});

const subscriptions = defineTrigger({
  name: 'List subscriptions',
  key: 'listSubscriptions',
  pollInterval: 60,
  description: 'Subscription products of the app with their base plans and state.',
  arguments: [pkg],
  async run($) {
    pushItems($, await withPlayErrors(() => listSubscriptions($, $.step.parameters.packageName)), (s) => s.productId);
  },
});

const oneTime = defineTrigger({
  name: 'List one-time products',
  key: 'listOneTimeProducts',
  pollInterval: 60,
  description: 'One-time (in-app) products of the app.',
  arguments: [pkg],
  async run($) {
    pushItems($, await withPlayErrors(() => listOneTimeProducts($, $.step.parameters.packageName)), (p) => p.productId);
  },
});

export default [reviews, tracks, subscriptions, oneTime];
