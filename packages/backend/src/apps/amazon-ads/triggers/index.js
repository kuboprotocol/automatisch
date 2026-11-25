import defineTrigger from '../../../helpers/define-trigger.js';
import { dynamicArg, pushItems, stringArg } from '../../../helpers/vertal-app-kit.js';
import { apiHost, listProfiles, listSpCampaigns } from '../common.js';

const profile = dynamicArg('profileId', 'Advertising profile', 'listProfiles');

const profiles = defineTrigger({
  name: 'List advertising profiles',
  key: 'listProfiles',
  pollInterval: 60,
  description: 'Advertising profiles (one per marketplace/account) you can manage.',
  arguments: [],
  async run($) {
    pushItems($, await listProfiles($), (p) => p.profileId);
  },
});

const campaigns = defineTrigger({
  name: 'List Sponsored Products campaigns',
  key: 'listCampaigns',
  pollInterval: 15,
  description: 'Sponsored Products campaigns with state and budget.',
  arguments: [profile],
  async run($) {
    pushItems($, await listSpCampaigns($, $.step.parameters.profileId), (c) => c.campaignId);
  },
});

const reportStatus = defineTrigger({
  name: 'Report status',
  key: 'reportStatus',
  pollInterval: 15,
  description: 'Status of a requested report; when COMPLETED it includes the download URL.',
  arguments: [profile, stringArg('reportId', 'Report ID', { required: true })],
  async run($) {
    const { profileId, reportId } = $.step.parameters;
    const { data } = await $.http.get(`${apiHost($)}/reporting/reports/${encodeURIComponent(reportId)}`, {
      additionalProperties: { profileId },
    });
    pushItems($, [data], (r) => `${r.reportId}-${r.status}`);
  },
});

export default [profiles, campaigns, reportStatus];
