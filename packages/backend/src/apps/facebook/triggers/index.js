import defineTrigger from '../../../helpers/define-trigger.js';
import { GRAPH_BASE, listPages, pageToken, stripPageTokens } from '../../../helpers/meta-graph.js';
import { dynamicArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';

const myPages = defineTrigger({
  name: 'List my Pages',
  key: 'listMyPages',
  pollInterval: 15,
  description: 'Facebook Pages you manage (and their linked Instagram accounts).',
  arguments: [],
  async run($) {
    pushItems($, stripPageTokens(await listPages($)));
  },
});

const pagePosts = defineTrigger({
  name: 'New Page posts',
  key: 'newPagePosts',
  pollInterval: 15,
  description: 'Latest posts of a Page.',
  arguments: [dynamicArg('pageId', 'Page', 'listPages')],
  async run($) {
    const token = await pageToken($, $.step.parameters.pageId);
    const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent($.step.parameters.pageId)}/posts`, {
      params: { fields: 'id,message,created_time,permalink_url', limit: 25, access_token: token },
      additionalProperties: { skipAddingAuthHeader: true },
    });
    pushItems($, data.data);
  },
});

const pageInsights = defineTrigger({
  name: 'Page insights',
  key: 'pageInsights',
  pollInterval: 60,
  description: 'Page metrics (default: page_post_engagements, page_follows) for a period.',
  arguments: [
    dynamicArg('pageId', 'Page', 'listPages'),
    stringArg('metrics', 'Metrics (comma separated)', { value: 'page_post_engagements,page_follows' }),
    stringArg('period', 'Period (day, week, days_28)', { value: 'day' }),
  ],
  async run($) {
    const { pageId, metrics, period } = $.step.parameters;
    const token = await pageToken($, pageId);
    const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/insights`, {
      params: { metric: metrics || 'page_post_engagements,page_follows', period: period || 'day', access_token: token },
      additionalProperties: { skipAddingAuthHeader: true },
    });
    pushItems($, data.data, (m) => `${m.name}-${m.period}-${m.values?.at(-1)?.end_time || ''}`);
  },
});

export default [myPages, pagePosts, pageInsights];
