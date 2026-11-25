// AdSense Management API v2 (só leitura): contas, sites, unidades de anúncio,
// pagamentos e relatório de ganhos.
import { isDay } from '../../helpers/google-oauth.js';

export const ADSENSE_API = 'https://adsense.googleapis.com/v2';

export function accountName(value) {
  const v = String(value || '').trim();
  return v.startsWith('accounts/') ? v : `accounts/${v}`;
}

export async function listPaged($, path, key, params = {}, max = 1000) {
  const out = [];
  let pageToken;
  do {
    const { data } = await $.http.get(`${ADSENSE_API}/${path}`, {
      params: { pageSize: 200, ...params, ...(pageToken ? { pageToken } : {}) },
    });
    out.push(...(data[key] || []));
    pageToken = data.nextPageToken;
  } while (pageToken && out.length < max);
  return out.slice(0, max);
}

export function listAccounts($) {
  return listPaged($, 'accounts', 'accounts');
}

export const DATE_RANGES = ['TODAY', 'YESTERDAY', 'MONTH_TO_DATE', 'YEAR_TO_DATE', 'LAST_7_DAYS', 'LAST_30_DAYS'];

export const METRICS = [
  'ESTIMATED_EARNINGS',
  'PAGE_VIEWS',
  'PAGE_VIEWS_RPM',
  'IMPRESSIONS',
  'IMPRESSIONS_RPM',
  'CLICKS',
  'PAGE_VIEWS_CTR',
  'COST_PER_CLICK',
];

/** reports:generate com params repetidos (metrics=…&metrics=…). */
export async function generateReport($, account, { dateRange, startDate, endDate, dimensions, currencyCode }) {
  const q = new URLSearchParams();
  if (isDay(startDate) && isDay(endDate)) {
    const [sy, sm, sd] = startDate.split('-');
    const [ey, em, ed] = endDate.split('-');
    q.set('dateRange', 'CUSTOM');
    q.set('startDate.year', String(+sy));
    q.set('startDate.month', String(+sm));
    q.set('startDate.day', String(+sd));
    q.set('endDate.year', String(+ey));
    q.set('endDate.month', String(+em));
    q.set('endDate.day', String(+ed));
  } else {
    q.set('dateRange', DATE_RANGES.includes(dateRange) ? dateRange : 'LAST_7_DAYS');
  }
  for (const d of dimensions) q.append('dimensions', d);
  for (const m of METRICS) q.append('metrics', m);
  if (currencyCode) q.set('currencyCode', currencyCode);
  const { data } = await $.http.get(`${ADSENSE_API}/${accountName(account)}/reports:generate?${q.toString()}`);
  const headers = (data.headers || []).map((h) => h.name);
  const rows = (data.rows || []).map((r) => {
    const o = {};
    (r.cells || []).forEach((c, i) => {
      const h = data.headers[i];
      o[headers[i]] = h?.type === 'DIMENSION' ? c.value : Number(c.value);
    });
    return o;
  });
  const currency = (data.headers || []).find((h) => h.currencyCode)?.currencyCode;
  return { rows, totals: data.totals, currency, startDate: data.startDate, endDate: data.endDate };
}
