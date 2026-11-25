export const REPORT_PATHS = [
  '/rest/n/mapi/report/crmAccountQueryByAgentOrCorp',
  '/rest/n/mapi/report/dspAccountEffectQuery',
  '/rest/n/mapi/report/dspCampaignEffectQuery',
  '/rest/n/mapi/report/dspUnitEffectQuery',
  '/rest/n/mapi/report/dspCreativeEffectQuery',
  '/rest/n/mapi/report/dspPhotoEffectQuery',
  '/rest/n/mapi/report/dspPopulationAnalysisEffectQuery',
  '/rest/n/mapi/report/accountMonthlyConsumptionReportQuery',
  '/rest/n/mapi/campaign/dspCampaignPageQueryPerformance',
];

/** POST na Marketing API; a resposta traz {code/status, message, data}. */
export async function mapi($, path, body) {
  const { data } = await $.http.post(`https://developers.kwai.com${path}`, body || {}, {
    headers: { 'Content-Type': 'application/json' },
  });
  const code = data?.code ?? data?.status ?? 0;
  if (code !== 0 && code !== 200 && code !== '0') {
    throw new Error(`Kwai Ads: ${data?.message || data?.msg || 'request failed'} (code ${code})`);
  }
  return data?.data ?? data;
}
