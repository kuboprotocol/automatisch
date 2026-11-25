import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, isoDay, optionsArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { listAdvertisers, listCampaigns, tiktokGet } from '../common.js';

const advertiser = dynamicArg('advertiserId', 'Ad account', 'listAdvertisers');

const advertisers = defineTrigger({
  name: 'List ad accounts',
  key: 'listAdvertisers',
  pollInterval: 60,
  description: 'Ad accounts that authorized Vertal.',
  arguments: [],
  async run($) {
    pushItems($, await listAdvertisers($), (a) => a.advertiser_id);
  },
});

const campaigns = defineTrigger({
  name: 'List campaigns',
  key: 'listCampaigns',
  pollInterval: 15,
  description: 'Campaigns of an ad account with status and budget.',
  arguments: [advertiser],
  async run($) {
    pushItems($, await listCampaigns($, $.step.parameters.advertiserId), (c) => c.campaign_id);
  },
});

const report = defineTrigger({
  name: 'Performance report',
  key: 'report',
  pollInterval: 60,
  description: 'Daily spend, impressions, clicks, CTR, CPC and conversions by campaign.',
  arguments: [
    advertiser,
    optionsArg('dataLevel', 'Level', ['AUCTION_ADVERTISER', 'AUCTION_CAMPAIGN', 'AUCTION_ADGROUP', 'AUCTION_AD'], {
      value: 'AUCTION_CAMPAIGN',
    }),
    stringArg('startDate', 'Start date (YYYY-MM-DD, default 7 days ago)'),
    stringArg('endDate', 'End date (YYYY-MM-DD, default today)'),
  ],
  async run($) {
    const { advertiserId, dataLevel, startDate, endDate } = $.step.parameters;
    const level = dataLevel || 'AUCTION_CAMPAIGN';
    const idDim = {
      AUCTION_ADVERTISER: 'advertiser_id',
      AUCTION_CAMPAIGN: 'campaign_id',
      AUCTION_ADGROUP: 'adgroup_id',
      AUCTION_AD: 'ad_id',
    }[level];
    const data = await tiktokGet($, '/report/integrated/get/', {
      advertiser_id: advertiserId,
      report_type: 'BASIC',
      data_level: level,
      dimensions: [idDim, 'stat_time_day'],
      metrics: ['spend', 'impressions', 'clicks', 'ctr', 'cpc', 'cpm', 'conversion', 'cost_per_conversion'],
      start_date: startDate || isoDay(-7),
      end_date: endDate || isoDay(0),
      page_size: 200,
    });
    pushItems($, data.list || [], (r) => JSON.stringify(r.dimensions));
  },
});

export default [advertisers, campaigns, report];
