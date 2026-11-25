import defineTrigger from '../../../helpers/define-trigger.js';
import { graphList } from '../../../helpers/meta-graph.js';
import { dynamicArg, optionsArg, pushItems } from '../../../helpers/vertal-app-kit.js';
import { DATE_PRESETS, actId, listAdAccounts, listCampaigns } from '../common.js';

const account = dynamicArg('adAccountId', 'Ad account', 'listAdAccounts');

const accounts = defineTrigger({
  name: 'List ad accounts',
  key: 'listAdAccounts',
  pollInterval: 60,
  description: 'Ad accounts you can access.',
  arguments: [],
  async run($) {
    pushItems($, await listAdAccounts($));
  },
});

const campaigns = defineTrigger({
  name: 'List campaigns',
  key: 'listCampaigns',
  pollInterval: 15,
  description: 'Campaigns of an ad account with status and budget.',
  arguments: [account],
  async run($) {
    pushItems($, await listCampaigns($, $.step.parameters.adAccountId));
  },
});

const insights = defineTrigger({
  name: 'Performance report',
  key: 'insights',
  pollInterval: 60,
  description: 'Spend, impressions, clicks, CTR, CPC and results by campaign/ad set/ad for a period.',
  arguments: [
    account,
    optionsArg('level', 'Level', ['account', 'campaign', 'adset', 'ad'], { value: 'campaign' }),
    optionsArg('datePreset', 'Period', DATE_PRESETS, { value: 'last_7d' }),
  ],
  async run($) {
    const { adAccountId, level, datePreset } = $.step.parameters;
    const rows = await graphList(
      $,
      `/${actId(adAccountId)}/insights`,
      {
        level: level || 'campaign',
        date_preset: datePreset || 'last_7d',
        fields:
          'account_id,campaign_id,campaign_name,adset_name,ad_name,spend,impressions,reach,clicks,ctr,cpc,cpm,actions,date_start,date_stop',
      },
      200
    );
    pushItems($, rows, (r) => `${r.campaign_id || r.account_id}-${r.adset_name || ''}-${r.ad_name || ''}-${r.date_start}-${r.date_stop}`);
  },
});

export default [accounts, campaigns, insights];
