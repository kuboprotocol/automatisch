import defineAction from '../../../../helpers/define-action.js';
import { dynamicArg, optionsArg } from '../../../../helpers/vertal-app-kit.js';
import { airbrakeId, summarizeGroup } from '../../common/groups.js';

export default defineAction({
  name: 'List errors',
  key: 'listErrorGroups',
  description: 'Lists the most recent error groups of a project (or of all projects), with message, location and count.',
  arguments: [
    dynamicArg('projectId', 'Project (empty = all projects)', 'listProjects', { required: false }),
    optionsArg('order', 'Order by', [
      { label: 'Last occurrence', value: 'last_notice' },
      { label: 'Number of occurrences', value: 'notice_count' },
      { label: 'Weight', value: 'weight' },
    ], { required: false, value: 'last_notice' }),
  ],
  async run($) {
    const { projectId, order } = $.step.parameters;
    const params = { limit: 25, ...(order ? { order } : {}) };
    const path = projectId ? `/v4/projects/${airbrakeId(projectId, 'Project')}/groups` : '/v4/groups';
    const { data } = await $.http.get(path, { params });
    $.setActionItem({ raw: { groups: (data?.groups || []).map(summarizeGroup), count: data?.count } });
  },
});
