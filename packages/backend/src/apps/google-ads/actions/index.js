import defineAction from '../../../helpers/define-action.js';
import { dynamicArg, optionsArg } from '../../../helpers/vertal-app-kit.js';
import { ADS_API, adsErrorText, cid } from '../common.js';

const setCampaignStatus = defineAction({
  name: 'Pause or enable campaign',
  key: 'setCampaignStatus',
  description: 'Sets a campaign to PAUSED or ENABLED. Enabling starts spending the campaign budget.',
  arguments: [
    dynamicArg('customerId', 'Google Ads account', 'listCustomers'),
    dynamicArg('campaignId', 'Campaign', 'listCampaigns', { dependsOn: ['customerId'] }),
    optionsArg('status', 'Status', ['PAUSED', 'ENABLED'], { value: 'PAUSED' }),
  ],
  async run($) {
    const { customerId, campaignId, status } = $.step.parameters;
    const c = cid(customerId);
    try {
      const { data } = await $.http.post(`${ADS_API}/customers/${c}/campaigns:mutate`, {
        operations: [
          {
            update: { resourceName: `customers/${c}/campaigns/${cid(campaignId)}`, status: status === 'ENABLED' ? 'ENABLED' : 'PAUSED' },
            updateMask: 'status',
          },
        ],
      });
      $.setActionItem({ raw: data });
    } catch (error) {
      const text = adsErrorText(error);
      if (text) throw new Error(`Google Ads: ${text}`);
      throw error;
    }
  },
});

export default [setCampaignStatus];
