import defineTrigger from '../../../helpers/define-trigger.js';
import { optionsArg, parseJsonArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { REPORT_PATHS, mapi } from '../common.js';

function rows(data) {
  if (Array.isArray(data)) return data;
  for (const k of ['list', 'data', 'records', 'accounts', 'items']) if (Array.isArray(data?.[k])) return data[k];
  return data ? [data] : [];
}

const accounts = defineTrigger({
  name: 'List ad accounts',
  key: 'listAccounts',
  pollInterval: 60,
  description: 'Ad accounts available to the authorized Kwai Business user.',
  arguments: [],
  async run($) {
    pushItems($, rows(await mapi($, '/rest/n/mapi/report/crmAccountQueryByAgentOrCorp', {})), (a) => a.accountId || a.id);
  },
});

const report = defineTrigger({
  name: 'Report query',
  key: 'reportQuery',
  pollInterval: 60,
  description: 'Runs a Marketing API report/query (account, campaign, ad set, creative...) with a JSON body as documented by Kwai.',
  arguments: [
    optionsArg('path', 'Report', REPORT_PATHS, { value: '/rest/n/mapi/report/dspCampaignEffectQuery' }),
    stringArg('body', 'Request body (JSON)', {
      required: true,
      description: 'e.g. {"accountIds":[123],"startTime":"2026-11-01","endTime":"2026-11-07"} — fields per Kwai docs.',
    }),
  ],
  async run($) {
    const { path, body } = $.step.parameters;
    if (!REPORT_PATHS.includes(path)) throw new Error('Unsupported report');
    pushItems($, rows(await mapi($, path, parseJsonArg(body, {}))), (r) => JSON.stringify(r).slice(0, 120));
  },
});

export default [accounts, report];
