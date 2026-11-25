import { listInventoryItems, listLocations, listPolicies } from '../common.js';

const policy = (kind, idKey) => ({
  name: `List ${kind} policies`,
  key: `list${kind[0].toUpperCase()}${kind.slice(1)}Policies`,
  async run($) {
    const ps = await listPolicies($, kind, $.step.parameters.marketplaceId);
    return { data: ps.map((p) => ({ value: p[idKey], name: p.name })) };
  },
});

export default [
  policy('fulfillment', 'fulfillmentPolicyId'),
  policy('payment', 'paymentPolicyId'),
  policy('return', 'returnPolicyId'),
  {
    name: 'List inventory locations',
    key: 'listLocations',
    async run($) {
      const ls = await listLocations($);
      return { data: ls.map((l) => ({ value: l.merchantLocationKey, name: l.name || l.merchantLocationKey })) };
    },
  },
  {
    name: 'List inventory items',
    key: 'listInventoryItems',
    async run($) {
      const items = await listInventoryItems($);
      return { data: items.map((i) => ({ value: i.sku, name: `${i.product?.title || i.sku} (${i.sku})` })) };
    },
  },
];
