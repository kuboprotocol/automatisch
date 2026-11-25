import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, optionsArg, pushItems } from '../../../helpers/vertal-app-kit.js';
import { MARKETPLACES, apiBase, listInventoryItems, listPolicies } from '../common.js';

const orders = defineTrigger({
  name: 'New orders',
  key: 'newOrders',
  pollInterval: 15,
  description: 'Latest orders of your eBay seller account.',
  arguments: [],
  async run($) {
    const { data } = await $.http.get(`${apiBase($)}/sell/fulfillment/v1/order`, { params: { limit: 50 } });
    pushItems($, data.orders || [], (o) => o.orderId);
  },
});

const items = defineTrigger({
  name: 'List inventory items',
  key: 'listInventoryItems',
  pollInterval: 60,
  description: 'Products in your eBay inventory (by SKU).',
  arguments: [],
  async run($) {
    pushItems($, await listInventoryItems($), (i) => i.sku);
  },
});

const offers = defineTrigger({
  name: 'List offers of an item',
  key: 'listOffers',
  pollInterval: 60,
  description: 'Offers (drafts and live listings) of an inventory item.',
  arguments: [dynamicArg('sku', 'Inventory item (SKU)', 'listInventoryItems')],
  async run($) {
    const { data } = await $.http.get(`${apiBase($)}/sell/inventory/v1/offer`, { params: { sku: $.step.parameters.sku } });
    pushItems($, data.offers || [], (o) => o.offerId);
  },
});

const policies = defineTrigger({
  name: 'List business policies',
  key: 'listPolicies',
  pollInterval: 60,
  description: 'Shipping, payment and return policies (needed to create offers).',
  arguments: [optionsArg('marketplaceId', 'Marketplace', MARKETPLACES, { value: 'EBAY_US' })],
  async run($) {
    const m = $.step.parameters.marketplaceId;
    const all = [];
    for (const kind of ['fulfillment', 'payment', 'return']) {
      for (const p of await listPolicies($, kind, m)) all.push({ kind, ...p });
    }
    pushItems($, all, (p) => p.fulfillmentPolicyId || p.paymentPolicyId || p.returnPolicyId);
  },
});

export default [orders, items, offers, policies];
