import { graphList } from '../../helpers/meta-graph.js';

export const OBJECTIVES = [
  'OUTCOME_AWARENESS',
  'OUTCOME_TRAFFIC',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_LEADS',
  'OUTCOME_APP_PROMOTION',
  'OUTCOME_SALES',
];

export const DATE_PRESETS = ['today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month', 'maximum'];

export function actId(id) {
  const s = String(id || '').trim();
  return s.startsWith('act_') ? s : `act_${s}`;
}

export async function listAdAccounts($) {
  return graphList($, '/me/adaccounts', { fields: 'id,account_id,name,account_status,currency,timezone_name,amount_spent' }, 200);
}

export async function listCampaigns($, adAccountId) {
  return graphList(
    $,
    `/${actId(adAccountId)}/campaigns`,
    { fields: 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,created_time' },
    200
  );
}
