import defineAction from '../../../helpers/define-action.js';
import { GRAPH_BASE } from '../../../helpers/meta-graph.js';
import { dynamicArg, optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { OBJECTIVES, actId } from '../common.js';

const account = dynamicArg('adAccountId', 'Ad account', 'listAdAccounts');

const createCampaign = defineAction({
  name: 'Create campaign (paused)',
  key: 'createCampaign',
  description: 'Creates a campaign in PAUSED status, so nothing is spent until you activate it.',
  arguments: [
    account,
    stringArg('name', 'Campaign name', { required: true }),
    optionsArg('objective', 'Objective', OBJECTIVES, { value: 'OUTCOME_TRAFFIC' }),
    stringArg('dailyBudget', 'Daily budget (in cents of the account currency, optional)'),
    stringArg('specialAdCategories', 'Special ad categories (comma separated, empty if none)'),
  ],
  async run($) {
    const { adAccountId, name, objective, dailyBudget, specialAdCategories } = $.step.parameters;
    const cats = String(specialAdCategories || '').split(',').map((s) => s.trim()).filter(Boolean);
    const body = {
      name,
      objective: objective || 'OUTCOME_TRAFFIC',
      status: 'PAUSED',
      special_ad_categories: JSON.stringify(cats),
    };
    if (dailyBudget) {
      body.daily_budget = String(parseInt(dailyBudget, 10));
      body.bid_strategy = 'LOWEST_COST_WITHOUT_CAP';
    } else {
      body.is_adset_budget_sharing_enabled = false;
    }
    const { data } = await $.http.post(`${GRAPH_BASE}/${actId(adAccountId)}/campaigns`, body);
    $.setActionItem({ raw: { ...data, status: 'PAUSED' } });
  },
});

const setCampaignStatus = defineAction({
  name: 'Pause or activate campaign',
  key: 'setCampaignStatus',
  description: 'Changes a campaign status to ACTIVE or PAUSED. Activating starts spending.',
  arguments: [
    account,
    dynamicArg('campaignId', 'Campaign', 'listCampaigns', { dependsOn: ['adAccountId'] }),
    optionsArg('status', 'Status', ['PAUSED', 'ACTIVE'], { value: 'PAUSED' }),
  ],
  async run($) {
    const { campaignId, status } = $.step.parameters;
    const { data } = await $.http.post(`${GRAPH_BASE}/${encodeURIComponent(campaignId)}`, {
      status: status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED',
    });
    $.setActionItem({ raw: { ...data, id: campaignId, status } });
  },
});

export default [createCampaign, setCampaignStatus];
