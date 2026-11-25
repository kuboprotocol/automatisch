import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, optionsArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { DATE_RANGES, accountName, generateReport, listAccounts, listPaged } from '../common.js';

const account = dynamicArg('account', 'AdSense account', 'listAccounts');

const accounts = defineTrigger({
  name: 'List AdSense accounts',
  key: 'listAccounts',
  pollInterval: 60,
  description: 'AdSense accounts of the signed-in user (ID, name, state, time zone).',
  arguments: [],
  async run($) {
    pushItems($, await listAccounts($), (a) => a.name);
  },
});

const sites = defineTrigger({
  name: 'List sites',
  key: 'listSites',
  pollInterval: 60,
  description: 'Sites in the AdSense account with approval state and Auto ads.',
  arguments: [account],
  async run($) {
    pushItems($, await listPaged($, `${accountName($.step.parameters.account)}/sites`, 'sites'), (s) => s.name);
  },
});

const adUnits = defineTrigger({
  name: 'List ad units',
  key: 'listAdUnits',
  pollInterval: 60,
  description: 'Ad units of every ad client in the account.',
  arguments: [account],
  async run($) {
    const acc = accountName($.step.parameters.account);
    const clients = await listPaged($, `${acc}/adclients`, 'adClients');
    const units = [];
    for (const c of clients) units.push(...(await listPaged($, `${c.name}/adunits`, 'adUnits', {}, 500)));
    pushItems($, units, (u) => u.name);
  },
});

const payments = defineTrigger({
  name: 'List payments',
  key: 'listPayments',
  pollInterval: 60,
  description: 'Unpaid balance and past payments of the AdSense account.',
  arguments: [account],
  async run($) {
    const { data } = await $.http.get(`https://adsense.googleapis.com/v2/${accountName($.step.parameters.account)}/payments`);
    pushItems($, data.payments || [], (p) => p.name);
  },
});

const earnings = defineTrigger({
  name: 'Earnings report',
  key: 'earningsReport',
  pollInterval: 60,
  description: 'Estimated earnings, page views, impressions, clicks, RPM and CTR for a date range.',
  arguments: [
    account,
    optionsArg('dateRange', 'Date range', DATE_RANGES, { value: 'LAST_7_DAYS' }),
    stringArg('startDate', 'Start date (YYYY-MM-DD, overrides range)'),
    stringArg('endDate', 'End date (YYYY-MM-DD)'),
    optionsArg(
      'groupBy',
      'Group by',
      [
        { label: 'Day', value: 'DATE' },
        { label: 'Site', value: 'DOMAIN_NAME' },
        { label: 'Country', value: 'COUNTRY_NAME' },
        { label: 'Ad unit', value: 'AD_UNIT_NAME' },
        { label: 'Platform', value: 'PLATFORM_TYPE_NAME' },
      ],
      { value: 'DATE' }
    ),
  ],
  async run($) {
    const { account: acc, dateRange, startDate, endDate, groupBy } = $.step.parameters;
    const dim = groupBy || 'DATE';
    const r = await generateReport($, acc, { dateRange, startDate, endDate, dimensions: [dim] });
    pushItems(
      $,
      r.rows.map((row) => ({ ...row, currency: r.currency })),
      (row) => `${dim}-${row[dim]}-${dateRange || ''}${startDate || ''}${endDate || ''}`
    );
  },
});

export default [accounts, sites, adUnits, payments, earnings];
