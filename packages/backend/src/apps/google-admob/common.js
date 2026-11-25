// AdMob API v1: contas de publisher, apps, blocos de anúncio e relatórios.
import { dayOffset, gDate, isDay } from '../../helpers/google-oauth.js';

export const ADMOB_API = 'https://admob.googleapis.com/v1';

/** "pub-123" ou "accounts/pub-123" → "accounts/pub-123". */
export function accountName(value) {
  const v = String(value || '').trim();
  return v.startsWith('accounts/') ? v : `accounts/${v}`;
}

export async function listAccounts($) {
  const { data } = await $.http.get(`${ADMOB_API}/accounts`, { params: { pageSize: 50 } });
  return data.account || [];
}

async function listPaged($, path, key) {
  const out = [];
  let pageToken;
  do {
    const { data } = await $.http.get(`${ADMOB_API}/${path}`, { params: { pageSize: 500, ...(pageToken ? { pageToken } : {}) } });
    out.push(...(data[key] || []));
    pageToken = data.nextPageToken;
  } while (pageToken && out.length < 2000);
  return out;
}

export function listApps($, account) {
  return listPaged($, `${accountName(account)}/apps`, 'apps');
}

export function listAdUnits($, account) {
  return listPaged($, `${accountName(account)}/adUnits`, 'adUnits');
}

/** Linha do relatório (stream JSON) → objeto plano. */
export function flattenRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row.dimensionValues || {})) {
    out[k] = v.value;
    if (v.displayLabel) out[`${k}_label`] = v.displayLabel;
  }
  for (const [k, v] of Object.entries(row.metricValues || {})) {
    if (v.microsValue !== undefined) out[k] = Number(v.microsValue) / 1e6;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = Number(v.doubleValue);
  }
  return out;
}

export async function generateReport($, account, kind, { startDate, endDate, dimensions, metrics }) {
  const start = isDay(startDate) ? startDate : dayOffset(-7);
  const end = isDay(endDate) ? endDate : dayOffset(-1);
  const { data } = await $.http.post(`${ADMOB_API}/${accountName(account)}/${kind}:generate`, {
    reportSpec: {
      dateRange: { startDate: gDate(start), endDate: gDate(end) },
      dimensions,
      metrics,
    },
  });
  const parts = Array.isArray(data) ? data : [data];
  const header = parts.find((p) => p.header)?.header || {};
  const rows = parts.filter((p) => p.row).map((p) => flattenRow(p.row));
  return { rows, currency: header.localizationSettings?.currencyCode, start, end };
}
