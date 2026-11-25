import { listAdAccounts, listCampaigns } from '../common.js';

export default [
  {
    name: 'List ad accounts',
    key: 'listAdAccounts',
    async run($) {
      const accounts = await listAdAccounts($);
      return { data: accounts.map((a) => ({ value: a.id, name: `${a.name} (${a.account_id}, ${a.currency})` })) };
    },
  },
  {
    name: 'List campaigns',
    key: 'listCampaigns',
    async run($) {
      if (!$.step.parameters.adAccountId) return { data: [] };
      const cs = await listCampaigns($, $.step.parameters.adAccountId);
      return { data: cs.map((c) => ({ value: c.id, name: `${c.name} (${c.effective_status || c.status})` })) };
    },
  },
];
