// LinkedIn (Sign In with LinkedIn using OpenID Connect + Share on LinkedIn).
// Login: OAuth 2.0 (3-legged) com escopos openid/profile/email/w_member_social.
// Publicação: Posts API (/rest/posts), versionada pelo cabeçalho LinkedIn-Version (YYYYMM).
export const LINKEDIN_OAUTH = 'https://www.linkedin.com/oauth/v2';
export const LINKEDIN_API = 'https://api.linkedin.com';
export const LINKEDIN_SCOPES = ['openid', 'profile', 'email', 'w_member_social'];

/**
 * Versão da Posts API: mês corrente menos 2 (o LinkedIn mantém cada versão ~1 ano e
 * publica a do mês no meio dele), então nunca fica velha nem adiantada.
 */
export function linkedinVersion(now = new Date()) {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1));
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function linkedinAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  if ($.auth.data?.accessToken) requestConfig.headers.Authorization = `Bearer ${$.auth.data.accessToken}`;
  const url = String(requestConfig.url || '');
  if (url.includes('/rest/')) {
    requestConfig.headers['LinkedIn-Version'] = linkedinVersion();
    requestConfig.headers['X-Restli-Protocol-Version'] = '2.0.0';
  }
  return requestConfig;
}

export async function getUserInfo($) {
  const { data } = await $.http.get(`${LINKEDIN_API}/v2/userinfo`);
  return data;
}

export function personUrn(sub) {
  return `urn:li:person:${sub}`;
}

/**
 * O texto do post ("commentary") usa o formato "little text": estes caracteres
 * reservados precisam de barra invertida, senão o post sai cortado ou dá 422.
 */
export function escapeCommentary(text) {
  return String(text ?? '').replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`);
}

export function buildPost({ author, text, visibility = 'PUBLIC', article }) {
  const body = {
    author,
    commentary: escapeCommentary(text),
    visibility: visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  };
  if (article?.source) {
    body.content = {
      article: {
        source: article.source,
        ...(article.title ? { title: article.title } : {}),
        ...(article.description ? { description: article.description } : {}),
      },
    };
  }
  return body;
}

export async function createPost($, input) {
  let author = $.auth.data.personUrn;
  if (!author) {
    const me = await getUserInfo($);
    author = personUrn(me.sub);
  }
  const response = await $.http.post(`${LINKEDIN_API}/rest/posts`, buildPost({ author, ...input }));
  const id = response.headers?.['x-restli-id'] || response.headers?.['x-linkedin-id'] || null;
  return {
    id,
    author,
    url: id ? `https://www.linkedin.com/feed/update/${id}/` : null,
    visibility: input.visibility === 'CONNECTIONS' ? 'CONNECTIONS' : 'PUBLIC',
  };
}
