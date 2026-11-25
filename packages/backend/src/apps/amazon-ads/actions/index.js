import defineAction from '../../../helpers/define-action.js';
import { dynamicArg, isoDay, optionsArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { apiHost, spCampaignsWrite } from '../common.js';

const profile = dynamicArg('profileId', 'Advertising profile', 'listProfiles');

const createCampaign = defineAction({
  name: 'Create Sponsored Products campaign (paused)',
  key: 'createSpCampaign',
  description: 'Creates a Sponsored Products campaign in PAUSED state with a daily budget.',
  arguments: [
    profile,
    stringArg('name', 'Campaign name', { required: true }),
    optionsArg('targetingType', 'Targeting', ['AUTO', 'MANUAL'], { value: 'AUTO' }),
    stringArg('dailyBudget', 'Daily budget (profile currency)', { required: true }),
    stringArg('startDate', 'Start date (YYYY-MM-DD, default today)'),
  ],
  async run($) {
    const { profileId, name, targetingType, dailyBudget, startDate } = $.step.parameters;
    const data = await spCampaignsWrite($, 'POST', profileId, [
      {
        name,
        targetingType: targetingType || 'AUTO',
        state: 'PAUSED',
        budget: { budgetType: 'DAILY', budget: Number(dailyBudget) },
        startDate: startDate || isoDay(0),
        dynamicBidding: { strategy: 'LEGACY_FOR_SALES' },
      },
    ]);
    $.setActionItem({ raw: data });
  },
});

const setCampaignState = defineAction({
  name: 'Pause or enable campaign',
  key: 'setSpCampaignState',
  description: 'Sets a Sponsored Products campaign to ENABLED or PAUSED. Enabling starts spending.',
  arguments: [
    profile,
    dynamicArg('campaignId', 'Campaign', 'listCampaigns', { dependsOn: ['profileId'] }),
    optionsArg('state', 'State', ['PAUSED', 'ENABLED'], { value: 'PAUSED' }),
  ],
  async run($) {
    const { profileId, campaignId, state } = $.step.parameters;
    const data = await spCampaignsWrite($, 'PUT', profileId, [
      { campaignId: String(campaignId), state: state === 'ENABLED' ? 'ENABLED' : 'PAUSED' },
    ]);
    $.setActionItem({ raw: data });
  },
});

const requestReport = defineAction({
  name: 'Request campaign report',
  key: 'requestReport',
  description:
    'Asks Amazon to build a Sponsored Products campaign report (spend, clicks, impressions, sales). Use "Report status" to get the download link.',
  arguments: [
    profile,
    stringArg('startDate', 'Start date (YYYY-MM-DD, default 7 days ago)'),
    stringArg('endDate', 'End date (YYYY-MM-DD, default yesterday)'),
  ],
  async run($) {
    const { profileId, startDate, endDate } = $.step.parameters;
    const { data } = await $.http.post(
      `${apiHost($)}/reporting/reports`,
      {
        name: `Vertal SP campaigns ${startDate || isoDay(-7)}..${endDate || isoDay(-1)}`,
        startDate: startDate || isoDay(-7),
        endDate: endDate || isoDay(-1),
        configuration: {
          adProduct: 'SPONSORED_PRODUCTS',
          groupBy: ['campaign'],
          columns: ['campaignName', 'campaignId', 'campaignStatus', 'impressions', 'clicks', 'cost', 'purchases7d', 'sales7d', 'date'],
          reportTypeId: 'spCampaigns',
          timeUnit: 'DAILY',
          format: 'GZIP_JSON',
        },
      },
      {
        headers: { 'Content-Type': 'application/vnd.createasyncreportrequest.v3+json' },
        additionalProperties: { profileId },
      }
    );
    $.setActionItem({ raw: data });
  },
});

export default [createCampaign, setCampaignState, requestReport];
