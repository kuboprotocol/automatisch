import { gaqlSearch, listAccessibleCustomers, customerInfo } from '../common.js';

export default [
  {
    name: 'List accessible customers',
    key: 'listCustomers',
    async run($) {
      const ids = await listAccessibleCustomers($);
      const data = [];
      for (const id of ids.slice(0, 50)) {
        const c = await customerInfo($, id).catch(() => ({ id }));
        data.push({ value: String(id), name: `${c.descriptiveName || id} (${id}${c.manager ? ', manager' : ''})` });
      }
      return { data };
    },
  },
  {
    name: 'List campaigns',
    key: 'listCampaigns',
    async run($) {
      const customerId = $.step.parameters.customerId;
      if (!customerId) return { data: [] };
      const rows = await gaqlSearch(
        $,
        customerId,
        "SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.name",
        500
      );
      return { data: rows.map((r) => ({ value: String(r.campaign.id), name: `${r.campaign.name} (${r.campaign.status})` })) };
    },
  },
];
