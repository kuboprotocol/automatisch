export const HOSTS = {
  NA: 'https://advertising-api.amazon.com',
  EU: 'https://advertising-api-eu.amazon.com',
  FE: 'https://advertising-api-fe.amazon.com',
};

export function apiHost($) {
  return HOSTS[$.auth.data?.region] || HOSTS.NA;
}

export function amazonAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) {
    requestConfig.headers.Authorization = `Bearer ${$.auth.data.accessToken}`;
    requestConfig.headers['Amazon-Advertising-API-ClientId'] = $.auth.data.clientId;
  }
  const profileId = requestConfig.additionalProperties?.profileId;
  if (profileId) requestConfig.headers['Amazon-Advertising-API-Scope'] = String(profileId);
  return requestConfig;
}

const SP_CAMPAIGN = 'application/vnd.spCampaign.v3+json';

export async function listProfiles($) {
  const { data } = await $.http.get(`${apiHost($)}/v2/profiles`);
  return data || [];
}

export async function listSpCampaigns($, profileId) {
  const { data } = await $.http.post(
    `${apiHost($)}/sp/campaigns/list`,
    { maxResults: 100 },
    {
      headers: { 'Content-Type': SP_CAMPAIGN, Accept: SP_CAMPAIGN },
      additionalProperties: { profileId },
    }
  );
  return data.campaigns || [];
}

export async function spCampaignsWrite($, method, profileId, campaigns) {
  const { data } = await $.http.request({
    method,
    url: `${apiHost($)}/sp/campaigns`,
    data: { campaigns },
    headers: { 'Content-Type': SP_CAMPAIGN, Accept: SP_CAMPAIGN, Prefer: 'return=representation' },
    additionalProperties: { profileId },
  });
  return data;
}
