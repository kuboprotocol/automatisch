export const MARKETPLACES = [
  'EBAY_US',
  'EBAY_GB',
  'EBAY_DE',
  'EBAY_CA',
  'EBAY_AU',
  'EBAY_FR',
  'EBAY_IT',
  'EBAY_ES',
  'EBAY_MOTORS_US',
];

export const CONDITIONS = [
  'NEW',
  'NEW_OTHER',
  'NEW_WITH_DEFECTS',
  'CERTIFIED_REFURBISHED',
  'SELLER_REFURBISHED',
  'USED_EXCELLENT',
  'USED_VERY_GOOD',
  'USED_GOOD',
  'USED_ACCEPTABLE',
  'FOR_PARTS_OR_NOT_WORKING',
];

export function isSandbox($) {
  return $.auth.data?.environment === 'sandbox';
}

export function apiBase($) {
  return isSandbox($) ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
}

export function identityBase($) {
  return isSandbox($) ? 'https://apiz.sandbox.ebay.com' : 'https://apiz.ebay.com';
}

export function ebayAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) requestConfig.headers.Authorization = `Bearer ${$.auth.data.accessToken}`;
  return requestConfig;
}

export async function listPolicies($, kind, marketplaceId) {
  const { data } = await $.http.get(`${apiBase($)}/sell/account/v1/${kind}_policy`, {
    params: { marketplace_id: marketplaceId || 'EBAY_US' },
  });
  return data[`${kind}Policies`] || [];
}

export async function listLocations($) {
  const { data } = await $.http.get(`${apiBase($)}/sell/inventory/v1/location`, { params: { limit: 100 } });
  return data.locations || [];
}

export async function listInventoryItems($) {
  const { data } = await $.http.get(`${apiBase($)}/sell/inventory/v1/inventory_item`, { params: { limit: 100 } });
  return data.inventoryItems || [];
}
