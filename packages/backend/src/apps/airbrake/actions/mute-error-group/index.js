import defineAction from '../../../../helpers/define-action.js';
import { dynamicArg, optionsArg, stringArg } from '../../../../helpers/vertal-app-kit.js';
import { airbrakeId } from '../../common/groups.js';

// A API pública do Airbrake permite silenciar/reativar um erro (não há "resolver" na API v4 documentada).
export default defineAction({
  name: 'Mute or unmute error',
  key: 'muteErrorGroup',
  description: 'Mutes an error group (stops its notifications; still recorded) or unmutes it.',
  arguments: [
    dynamicArg('projectId', 'Project', 'listProjects'),
    stringArg('groupId', 'Error group ID', { required: true }),
    optionsArg('mute', 'Action', [
      { label: 'Mute', value: 'mute' },
      { label: 'Unmute', value: 'unmute' },
    ], { value: 'mute' }),
  ],
  async run($) {
    const { projectId, groupId, mute } = $.step.parameters;
    const p = airbrakeId(projectId, 'Project');
    const g = airbrakeId(groupId, 'Error group ID');
    const verb = mute === 'unmute' ? 'unmuted' : 'muted';
    await $.http.put(`/v4/projects/${p}/groups/${g}/${verb}`);
    $.setActionItem({ raw: { projectId: p, groupId: g, muted: verb === 'muted' } });
  },
});
