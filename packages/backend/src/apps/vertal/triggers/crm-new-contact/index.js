import defineTrigger from '../../../../helpers/define-trigger.js';
import { pushCrmEvents, workspaceArgument } from '../../common/crm.js';

export default defineTrigger({
  name: 'Novo contato no Vertal CRM',
  key: 'crmNewContact',
  pollInterval: 15,
  description: 'Dispara o fluxo quando um contato novo entra no seu Vertal CRM.',
  arguments: [workspaceArgument],

  async run($) {
    await pushCrmEvents($, ['contact.created']);
  },
});
