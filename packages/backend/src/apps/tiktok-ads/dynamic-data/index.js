import { listAdvertisers, listCampaigns } from '../common.js';

export default [
  {
    name: 'List advertisers',
    key: 'listAdvertisers',
    async run($) {
      const list = await listAdvertisers($);
      return { data: list.map((a) => ({ value: String(a.advertiser_id), name: `${a.advertiser_name} (${a.advertiser_id})` })) };
    },
  },
  {
    name: 'List campaigns',
    key: 'listCampaigns',
    async run($) {
      if (!$.step.parameters.advertiserId) return { data: [] };
      const list = await listCampaigns($, $.step.parameters.advertiserId);
      return { data: list.map((c) => ({ value: String(c.campaign_id), name: `${c.campaign_name} (${c.operation_status})` })) };
    },
  },
];
