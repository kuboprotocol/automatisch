import defineTrigger from '../../../helpers/define-trigger.js';
import { GRAPH_BASE } from '../../../helpers/meta-graph.js';
import { dynamicArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { listIgAccounts } from '../common.js';

const account = dynamicArg('igUserId', 'Instagram account', 'listIgAccounts');

const accounts = defineTrigger({
  name: 'List my Instagram accounts',
  key: 'listAccounts',
  pollInterval: 15,
  description: 'Professional Instagram accounts linked to your Facebook Pages.',
  arguments: [],
  async run($) {
    pushItems($, await listIgAccounts($));
  },
});

const media = defineTrigger({
  name: 'New media',
  key: 'newMedia',
  pollInterval: 15,
  description: 'Latest posts of the account with likes and comments count.',
  arguments: [account],
  async run($) {
    const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent($.step.parameters.igUserId)}/media`, {
      params: {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        limit: 25,
      },
    });
    pushItems($, data.data);
  },
});

const insights = defineTrigger({
  name: 'Account insights',
  key: 'accountInsights',
  pollInterval: 60,
  description: 'Account metrics (default: reach, follower_count) for the last day.',
  arguments: [
    account,
    stringArg('metrics', 'Metrics (comma separated)', { value: 'reach,follower_count' }),
    stringArg('period', 'Period', { value: 'day' }),
  ],
  async run($) {
    const { igUserId, metrics, period } = $.step.parameters;
    const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent(igUserId)}/insights`, {
      params: { metric: metrics || 'reach,follower_count', period: period || 'day' },
    });
    pushItems($, data.data, (m) => `${m.name}-${m.values?.at(-1)?.end_time || ''}`);
  },
});

export default [accounts, media, insights];
