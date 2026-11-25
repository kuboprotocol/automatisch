import defineAction from '../../../helpers/define-action.js';
import { csv, dynamicArg, optionsArg, parseJsonArg, stringArg } from '../../../helpers/vertal-app-kit.js';
import { CONDITIONS, MARKETPLACES, apiBase } from '../common.js';

const marketplace = optionsArg('marketplaceId', 'Marketplace', MARKETPLACES, { value: 'EBAY_US' });
const contentLanguage = (marketplaceId) =>
  ({ EBAY_GB: 'en-GB', EBAY_DE: 'de-DE', EBAY_FR: 'fr-FR', EBAY_IT: 'it-IT', EBAY_ES: 'es-ES', EBAY_AU: 'en-AU', EBAY_CA: 'en-CA' })[
    marketplaceId
  ] || 'en-US';

const upsertItem = defineAction({
  name: 'Create or update inventory item',
  key: 'upsertInventoryItem',
  description: 'Creates (or replaces) a product in your eBay inventory by SKU: title, description, photos, quantity, condition.',
  arguments: [
    stringArg('sku', 'SKU', { required: true }),
    stringArg('title', 'Title (max 80 chars)', { required: true }),
    stringArg('description', 'Description', { required: true }),
    stringArg('imageUrls', 'Image URLs (comma separated, https)', { required: true }),
    stringArg('quantity', 'Quantity', { required: true, value: '1' }),
    optionsArg('condition', 'Condition', CONDITIONS, { value: 'NEW' }),
    stringArg('brand', 'Brand'),
    stringArg('mpn', 'MPN'),
    stringArg('aspects', 'Item specifics (JSON, e.g. {"Color":["Black"]})'),
    optionsArg('marketplaceId', 'Listing language (marketplace)', MARKETPLACES, { value: 'EBAY_US' }),
  ],
  async run($) {
    const p = $.step.parameters;
    const aspects = parseJsonArg(p.aspects, {});
    if (p.brand && !aspects.Brand) aspects.Brand = [p.brand];
    const body = {
      availability: { shipToLocationAvailability: { quantity: parseInt(p.quantity, 10) || 0 } },
      condition: p.condition || 'NEW',
      product: {
        title: String(p.title).slice(0, 80),
        description: p.description,
        imageUrls: csv(p.imageUrls),
        ...(Object.keys(aspects).length ? { aspects } : {}),
        ...(p.brand ? { brand: p.brand } : {}),
        ...(p.mpn ? { mpn: p.mpn } : {}),
      },
    };
    await $.http.put(`${apiBase($)}/sell/inventory/v1/inventory_item/${encodeURIComponent(p.sku)}`, body, {
      headers: { 'Content-Language': contentLanguage(p.marketplaceId) },
    });
    $.setActionItem({ raw: { sku: p.sku, saved: true } });
  },
});

const createLocation = defineAction({
  name: 'Create inventory location',
  key: 'createLocation',
  description: 'Creates the warehouse/ship-from location needed before publishing offers.',
  arguments: [
    stringArg('merchantLocationKey', 'Location key (e.g. main-warehouse)', { required: true }),
    stringArg('name', 'Name', { required: true }),
    stringArg('addressLine1', 'Address line'),
    stringArg('city', 'City', { required: true }),
    stringArg('stateOrProvince', 'State/province', { required: true }),
    stringArg('postalCode', 'Postal code', { required: true }),
    stringArg('country', 'Country code (e.g. BR, US)', { required: true, value: 'BR' }),
  ],
  async run($) {
    const p = $.step.parameters;
    await $.http.post(`${apiBase($)}/sell/inventory/v1/location/${encodeURIComponent(p.merchantLocationKey)}`, {
      name: p.name,
      location: {
        address: {
          ...(p.addressLine1 ? { addressLine1: p.addressLine1 } : {}),
          city: p.city,
          stateOrProvince: p.stateOrProvince,
          postalCode: p.postalCode,
          country: p.country,
        },
      },
      locationTypes: ['WAREHOUSE'],
      merchantLocationStatus: 'ENABLED',
    });
    $.setActionItem({ raw: { merchantLocationKey: p.merchantLocationKey, created: true } });
  },
});

const createOffer = defineAction({
  name: 'Create offer (draft listing)',
  key: 'createOffer',
  description: 'Creates an unpublished fixed-price offer for an inventory item. Use "Publish offer" to put it live.',
  arguments: [
    dynamicArg('sku', 'Inventory item (SKU)', 'listInventoryItems'),
    marketplace,
    stringArg('categoryId', 'eBay category ID', { required: true }),
    stringArg('price', 'Price', { required: true }),
    stringArg('currency', 'Currency', { required: true, value: 'USD' }),
    stringArg('availableQuantity', 'Quantity to sell', { value: '1' }),
    stringArg('listingDescription', 'Listing description (optional, defaults to item description)'),
    dynamicArg('fulfillmentPolicyId', 'Shipping policy', 'listFulfillmentPolicies', { dependsOn: ['marketplaceId'] }),
    dynamicArg('paymentPolicyId', 'Payment policy', 'listPaymentPolicies', { dependsOn: ['marketplaceId'] }),
    dynamicArg('returnPolicyId', 'Return policy', 'listReturnPolicies', { dependsOn: ['marketplaceId'] }),
    dynamicArg('merchantLocationKey', 'Inventory location', 'listLocations'),
  ],
  async run($) {
    const p = $.step.parameters;
    const { data } = await $.http.post(
      `${apiBase($)}/sell/inventory/v1/offer`,
      {
        sku: p.sku,
        marketplaceId: p.marketplaceId || 'EBAY_US',
        format: 'FIXED_PRICE',
        availableQuantity: parseInt(p.availableQuantity, 10) || 1,
        categoryId: String(p.categoryId),
        ...(p.listingDescription ? { listingDescription: p.listingDescription } : {}),
        listingPolicies: {
          fulfillmentPolicyId: p.fulfillmentPolicyId,
          paymentPolicyId: p.paymentPolicyId,
          returnPolicyId: p.returnPolicyId,
        },
        merchantLocationKey: p.merchantLocationKey,
        pricingSummary: { price: { value: String(p.price), currency: p.currency || 'USD' } },
      },
      { headers: { 'Content-Language': contentLanguage(p.marketplaceId) } }
    );
    $.setActionItem({ raw: data });
  },
});

const publishOffer = defineAction({
  name: 'Publish offer',
  key: 'publishOffer',
  description: 'Publishes an offer as a live eBay listing (eBay may charge insertion/final value fees to the seller).',
  arguments: [stringArg('offerId', 'Offer ID', { required: true })],
  async run($) {
    const { data } = await $.http.post(
      `${apiBase($)}/sell/inventory/v1/offer/${encodeURIComponent($.step.parameters.offerId)}/publish`,
      {}
    );
    $.setActionItem({ raw: data });
  },
});

const shipOrder = defineAction({
  name: 'Add tracking to order',
  key: 'addTracking',
  description: 'Marks order line items as shipped with carrier and tracking number.',
  arguments: [
    stringArg('orderId', 'Order ID', { required: true }),
    stringArg('lineItemIds', 'Line item IDs (comma separated)', { required: true }),
    stringArg('shippingCarrierCode', 'Carrier code (e.g. USPS, UPS, FEDEX, Correios)', { required: true }),
    stringArg('trackingNumber', 'Tracking number', { required: true }),
  ],
  async run($) {
    const p = $.step.parameters;
    const { headers } = await $.http.post(
      `${apiBase($)}/sell/fulfillment/v1/order/${encodeURIComponent(p.orderId)}/shipping_fulfillment`,
      {
        lineItems: csv(p.lineItemIds).map((lineItemId) => ({ lineItemId, quantity: 1 })),
        shippedDate: new Date().toISOString(),
        shippingCarrierCode: p.shippingCarrierCode,
        trackingNumber: p.trackingNumber,
      }
    );
    $.setActionItem({ raw: { orderId: p.orderId, location: headers?.location || null } });
  },
});

export default [upsertItem, createLocation, createOffer, publishOffer, shipOrder];
