// Google Ads API (REST). Desde 09/09/2026 o acesso é por projeto do Google Cloud
// (o do cliente OAuth); o developer token virou opcional e é ignorado pela API.
export const ADS_VERSION = 'v26';
export const ADS_API = `https://googleads.googleapis.com/${ADS_VERSION}`;

/** "123-456-7890" → "1234567890". */
export function cid(value) {
  return String(value || '').replace(/[^0-9]/g, '');
}

export function adsAddHeaders($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  const token = $.auth.data?.developerToken;
  if (token) requestConfig.headers['developer-token'] = token;
  const login = requestConfig.additionalProperties?.loginCustomerId || $.auth.data?.loginCustomerId;
  if (login && cid(login)) requestConfig.headers['login-customer-id'] = cid(login);
  return requestConfig;
}

/** Erro do Google Ads em texto curto (ex.: CLOUD_PROJECT_NOT_APPROVED_FOR_PRODUCTION). */
export function adsErrorText(error) {
  const body = error?.response?.data?.error;
  if (!body) return null;
  const codes = (body.details || [])
    .flatMap((d) => d.errors || [])
    .map((e) => Object.values(e.errorCode || {})[0])
    .filter(Boolean);
  return [body.status, ...codes, body.message].filter(Boolean).join(' · ');
}

export async function listAccessibleCustomers($) {
  const { data } = await $.http.get(`${ADS_API}/customers:listAccessibleCustomers`);
  return (data.resourceNames || []).map((r) => r.split('/')[1]);
}

/** GAQL via googleAds:search (paginado, até `max` linhas). */
export async function gaqlSearch($, customerId, query, max = 200, loginCustomerId) {
  const rows = [];
  let pageToken;
  do {
    const { data } = await $.http.post(
      `${ADS_API}/customers/${cid(customerId)}/googleAds:search`,
      { query, ...(pageToken ? { pageToken } : {}) },
      { additionalProperties: { loginCustomerId } }
    );
    rows.push(...(data.results || []));
    pageToken = data.nextPageToken;
  } while (pageToken && rows.length < max);
  return rows.slice(0, max);
}

export async function customerInfo($, customerId) {
  const rows = await gaqlSearch(
    $,
    customerId,
    'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.manager, customer.test_account, customer.status FROM customer LIMIT 1',
    1
  );
  return rows[0]?.customer || { id: cid(customerId) };
}

export const DATE_RANGES = [
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_14_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
];

export function dateClause(range, startDate, endDate) {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  if (re.test(String(startDate || '')) && re.test(String(endDate || ''))) {
    return `segments.date BETWEEN '${startDate}' AND '${endDate}'`;
  }
  return `segments.date DURING ${DATE_RANGES.includes(range) ? range : 'LAST_7_DAYS'}`;
}
