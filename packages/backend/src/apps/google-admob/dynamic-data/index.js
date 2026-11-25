import { listAccounts, listApps } from '../common.js';

export default [
  {
    name: 'List accounts',
    key: 'listAccounts',
    async run($) {
      const accounts = await listAccounts($);
      return { data: accounts.map((a) => ({ value: a.name, name: `${a.publisherId} (${a.currencyCode || ''}, ${a.reportingTimeZone || ''})` })) };
    },
  },
  {
    name: 'List apps',
    key: 'listApps',
    async run($) {
      if (!$.step.parameters.account) return { data: [] };
      const apps = await listApps($, $.step.parameters.account);
      return {
        data: apps.map((a) => ({
          value: a.appId,
          name: `${a.linkedAppInfo?.displayName || a.manualAppInfo?.displayName || a.appId} (${a.platform || ''})`,
        })),
      };
    },
  },
];
