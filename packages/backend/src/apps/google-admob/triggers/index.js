import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, optionsArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { generateReport, listAccounts, listAdUnits, listApps } from '../common.js';

const account = dynamicArg('account', 'AdMob account', 'listAccounts');
const range = [
  stringArg('startDate', 'Start date (YYYY-MM-DD, default 7 days ago)'),
  stringArg('endDate', 'End date (YYYY-MM-DD, default yesterday)'),
];
const groupBy = optionsArg(
  'groupBy',
  'Group by',
  [
    { label: 'Day', value: 'DATE' },
    { label: 'App', value: 'APP' },
    { label: 'Day and app', value: 'DATE,APP' },
    { label: 'Ad unit', value: 'AD_UNIT' },
    { label: 'Country', value: 'COUNTRY' },
    { label: 'Format', value: 'FORMAT' },
  ],
  { value: 'DATE' }
);

const accounts = defineTrigger({
  name: 'List AdMob accounts',
  key: 'listAccounts',
  pollInterval: 60,
  description: 'AdMob publisher accounts of the signed-in user (publisher ID, currency, time zone).',
  arguments: [],
  async run($) {
    pushItems($, await listAccounts($), (a) => a.name);
  },
});

const apps = defineTrigger({
  name: 'List apps',
  key: 'listApps',
  pollInterval: 60,
  description: 'Apps registered in the AdMob account.',
  arguments: [account],
  async run($) {
    pushItems($, await listApps($, $.step.parameters.account), (a) => a.appId);
  },
});

const adUnits = defineTrigger({
  name: 'List ad units',
  key: 'listAdUnits',
  pollInterval: 60,
  description: 'Ad units of the AdMob account (format, app, ad unit ID).',
  arguments: [account],
  async run($) {
    pushItems($, await listAdUnits($, $.step.parameters.account), (u) => u.adUnitId);
  },
});

function reportTrigger(kind, key, name, description, metrics, extraGroups = []) {
  return defineTrigger({
    name,
    key,
    pollInterval: 60,
    description,
    arguments: [account, ...range, extraGroups.length ? { ...groupBy, options: [...groupBy.options, ...extraGroups] } : groupBy],
    async run($) {
      const { account: acc, startDate, endDate, groupBy: g } = $.step.parameters;
      const dimensions = String(g || 'DATE').split(',').filter(Boolean);
      const { rows, currency, start, end } = await generateReport($, acc, kind, { startDate, endDate, dimensions, metrics });
      pushItems(
        $,
        rows.map((r) => ({ ...r, currency, startDate: start, endDate: end })),
        (r) => `${kind}-${start}-${end}-${dimensions.map((d) => r[d]).join('|')}`
      );
    },
  });
}

const networkReport = reportTrigger(
  'networkReport',
  'networkReport',
  'Network report (earnings)',
  'AdMob Network report: estimated earnings, impressions, clicks, ad requests, match rate, eCPM.',
  ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'AD_REQUESTS', 'MATCHED_REQUESTS', 'MATCH_RATE', 'IMPRESSION_RPM', 'IMPRESSION_CTR', 'SHOW_RATE']
);

const mediationReport = reportTrigger(
  'mediationReport',
  'mediationReport',
  'Mediation report',
  'AdMob Mediation report: earnings, impressions, clicks, requests and observed eCPM per ad source.',
  ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS', 'AD_REQUESTS', 'MATCHED_REQUESTS', 'MATCH_RATE', 'OBSERVED_ECPM'],
  [{ label: 'Ad source', value: 'AD_SOURCE' }]
);

export default [accounts, apps, adUnits, networkReport, mediationReport];
