import callApi from './call-api/index.js';
import sendToAgents from './send-to-agents/index.js';
import runAgent from './run-agent/index.js';
import crmCreateContact from './crm-create-contact/index.js';
import crmUpdateContact from './crm-update-contact/index.js';
import crmCreateDeal from './crm-create-deal/index.js';
import crmUpdateDeal from './crm-update-deal/index.js';
import crmCreateTask from './crm-create-task/index.js';

export default [callApi, sendToAgents, runAgent, crmCreateContact, crmUpdateContact, crmCreateDeal, crmUpdateDeal, crmCreateTask];
