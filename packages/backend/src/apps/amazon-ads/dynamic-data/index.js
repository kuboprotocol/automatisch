import { listProfiles, listSpCampaigns } from '../common.js';

export default [
  {
    name: 'List profiles',
    key: 'listProfiles',
    async run($) {
      const ps = await listProfiles($);
      return {
        data: ps.map((p) => ({
          value: String(p.profileId),
          name: `${p.accountInfo?.name || p.profileId} (${p.countryCode}, ${p.accountInfo?.type || ''})`,
        })),
      };
    },
  },
  {
    name: 'List campaigns',
    key: 'listCampaigns',
    async run($) {
      if (!$.step.parameters.profileId) return { data: [] };
      const cs = await listSpCampaigns($, $.step.parameters.profileId);
      return { data: cs.map((c) => ({ value: String(c.campaignId), name: `${c.name} (${c.state})` })) };
    },
  },
];
