export const TIKTOK_API = 'https://business-api.tiktok.com/open_api/v1.3';

export function tiktokAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) requestConfig.headers['Access-Token'] = $.auth.data.accessToken;
  return requestConfig;
}

/** A API responde 200 com {code, message, data}; code != 0 é erro. */
export function unwrap(response) {
  const body = response.data || {};
  if (body.code !== 0) {
    throw new Error(`TikTok Ads: ${body.message || 'request failed'} (code ${body.code})`);
  }
  return body.data || {};
}

export async function tiktokGet($, path, params = {}) {
  const query = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    query[k] = typeof v === 'object' ? JSON.stringify(v) : v;
  }
  return unwrap(await $.http.get(`${TIKTOK_API}${path}`, { params: query }));
}

export async function tiktokPost($, path, body) {
  return unwrap(await $.http.post(`${TIKTOK_API}${path}`, body));
}

export async function listAdvertisers($) {
  const data = await tiktokGet($, '/oauth2/advertiser/get/', {
    app_id: $.auth.data.clientId,
    secret: $.auth.data.clientSecret,
  });
  return data.list || [];
}

export async function listCampaigns($, advertiserId) {
  const data = await tiktokGet($, '/campaign/get/', { advertiser_id: advertiserId, page_size: 100 });
  return data.list || [];
}

export const OBJECTIVES = [
  'REACH',
  'TRAFFIC',
  'VIDEO_VIEWS',
  'LEAD_GENERATION',
  'ENGAGEMENT',
  'APP_PROMOTION',
  'WEB_CONVERSIONS',
  'PRODUCT_SALES',
];
