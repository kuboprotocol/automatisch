import defineAction from '../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { OBJECTIVES, tiktokPost } from '../common.js';

const advertiser = dynamicArg('advertiserId', 'Ad account', 'listAdvertisers');

const createCampaign = defineAction({
  name: 'Create campaign (paused)',
  key: 'createCampaign',
  description: 'Creates a campaign turned off (DISABLE), so nothing is spent until you enable it.',
  arguments: [
    advertiser,
    stringArg('name', 'Campaign name', { required: true }),
    optionsArg('objective', 'Objective', OBJECTIVES, { value: 'TRAFFIC' }),
    stringArg('dailyBudget', 'Daily budget (account currency, optional; empty = no limit)'),
  ],
  async run($) {
    const { advertiserId, name, objective, dailyBudget } = $.step.parameters;
    const body = {
      advertiser_id: String(advertiserId),
      campaign_name: name,
      objective_type: objective || 'TRAFFIC',
      operation_status: 'DISABLE',
      budget_mode: dailyBudget ? 'BUDGET_MODE_DAY' : 'BUDGET_MODE_INFINITE',
      ...(dailyBudget ? { budget: Number(dailyBudget) } : {}),
    };
    const data = await tiktokPost($, '/campaign/create/', body);
    $.setActionItem({ raw: { ...data, operation_status: 'DISABLE' } });
  },
});

const setCampaignStatus = defineAction({
  name: 'Enable or disable campaign',
  key: 'setCampaignStatus',
  description: 'Turns a campaign on (ENABLE) or off (DISABLE). Enabling starts spending.',
  arguments: [
    advertiser,
    dynamicArg('campaignId', 'Campaign', 'listCampaigns', { dependsOn: ['advertiserId'] }),
    optionsArg('status', 'Status', ['DISABLE', 'ENABLE'], { value: 'DISABLE' }),
  ],
  async run($) {
    const { advertiserId, campaignId, status } = $.step.parameters;
    const data = await tiktokPost($, '/campaign/status/update/', {
      advertiser_id: String(advertiserId),
      campaign_ids: [String(campaignId)],
      operation_status: status === 'ENABLE' ? 'ENABLE' : 'DISABLE',
    });
    $.setActionItem({ raw: data });
  },
});

export default [createCampaign, setCampaignStatus];
