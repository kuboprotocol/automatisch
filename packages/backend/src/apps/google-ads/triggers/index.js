import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, optionsArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { DATE_RANGES, adsErrorText, cid, customerInfo, dateClause, gaqlSearch, listAccessibleCustomers } from '../common.js';

const customer = dynamicArg('customerId', 'Google Ads account', 'listCustomers');

async function guard(fn) {
  try {
    return await fn();
  } catch (error) {
    const text = adsErrorText(error);
    if (text) throw new Error(`Google Ads: ${text}`);
    throw error;
  }
}

const customers = defineTrigger({
  name: 'List accessible accounts',
  key: 'listCustomers',
  pollInterval: 60,
  description: 'Google Ads accounts (customer IDs) the signed-in user can access, with name, currency and whether it is a manager account.',
  arguments: [],
  async run($) {
    await guard(async () => {
      const ids = await listAccessibleCustomers($);
      const items = [];
      for (const id of ids.slice(0, 50)) {
        const info = await customerInfo($, id).catch((e) => ({ id, error: adsErrorText(e) || e.message }));
        items.push({ customerId: id, ...info });
      }
      pushItems($, items, (c) => c.customerId);
    });
  },
});

const campaigns = defineTrigger({
  name: 'List campaigns',
  key: 'listCampaigns',
  pollInterval: 15,
  description: 'Campaigns of an account with status, channel type and daily budget (micros).',
  arguments: [customer, optionsArg('includeRemoved', 'Include removed', ['false', 'true'], { required: false, value: 'false' })],
  async run($) {
    const { customerId, includeRemoved } = $.step.parameters;
    await guard(async () => {
      const where = String(includeRemoved) === 'true' ? '' : " WHERE campaign.status != 'REMOVED'";
      const rows = await gaqlSearch(
        $,
        customerId,
        `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.start_date, campaign.end_date, campaign_budget.amount_micros FROM campaign${where} ORDER BY campaign.name`,
        200
      );
      pushItems(
        $,
        rows.map((r) => ({ ...r.campaign, budgetMicros: r.campaignBudget?.amountMicros })),
        (c) => c.id
      );
    });
  },
});

const performance = defineTrigger({
  name: 'Campaign performance report',
  key: 'campaignPerformance',
  pollInterval: 60,
  description:
    'Impressions, clicks, cost, conversions and CTR per campaign for a date range (cost in account currency; cost_micros / 1,000,000).',
  arguments: [
    customer,
    optionsArg('dateRange', 'Date range', DATE_RANGES, { value: 'LAST_7_DAYS' }),
    stringArg('startDate', 'Start date (YYYY-MM-DD, overrides range)'),
    stringArg('endDate', 'End date (YYYY-MM-DD)'),
    optionsArg('byDay', 'Split by day', ['false', 'true'], { required: false, value: 'false' }),
  ],
  async run($) {
    const { customerId, dateRange, startDate, endDate, byDay } = $.step.parameters;
    await guard(async () => {
      const day = String(byDay) === 'true';
      const rows = await gaqlSearch(
        $,
        customerId,
        `SELECT campaign.id, campaign.name, campaign.status,${day ? ' segments.date,' : ''} metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign WHERE ${dateClause(
          dateRange,
          startDate,
          endDate
        )} ORDER BY metrics.cost_micros DESC`,
        500
      );
      pushItems(
        $,
        rows.map((r) => ({
          campaignId: r.campaign.id,
          campaignName: r.campaign.name,
          status: r.campaign.status,
          date: r.segments?.date,
          ...r.metrics,
          cost: r.metrics?.costMicros ? Number(r.metrics.costMicros) / 1e6 : 0,
        })),
        (r) => `${r.campaignId}-${r.date || dateRange || 'range'}`
      );
    });
  },
});

const gaql = defineTrigger({
  name: 'Run GAQL query (read-only)',
  key: 'gaqlQuery',
  pollInterval: 60,
  description: 'Runs any Google Ads Query Language SELECT on an account (max 200 rows).',
  arguments: [customer, stringArg('query', 'GAQL query (SELECT ...)', { required: true })],
  async run($) {
    const { customerId, query } = $.step.parameters;
    if (!/^\s*select\s/i.test(String(query))) throw new Error('Only SELECT queries are allowed');
    await guard(async () => {
      const rows = await gaqlSearch($, customerId, String(query), 200);
      pushItems($, rows, (r) => JSON.stringify(r).slice(0, 64) + cid(customerId));
    });
  },
});

export default [customers, campaigns, performance, gaql];
