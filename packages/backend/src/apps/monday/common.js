// monday.com: login OAuth 2.0 (app "Vertal Dev" do Vertal ou app próprio) ou token pessoal da API (Avançado).
// Docs: https://developer.monday.com/apps/docs/oauth — tokens do OAuth não expiram (sem refresh token).
export const MONDAY_AUTH = 'https://auth.monday.com/oauth2';
export const MONDAY_API = 'https://api.monday.com/v2';

// Precisam estar marcados no app (OAuth & Permissions). Pedir menos que o app é permitido; pedir mais dá erro.
export const MONDAY_SCOPES = [
  'me:read',
  'boards:read',
  'boards:write',
  'workspaces:read',
  'users:read',
  'updates:read',
  'updates:write',
];

/** Token em uso: o do login OAuth ou o token pessoal da API (Avançado). */
export function mondayToken(data) {
  return data?.accessToken || data?.apiToken || null;
}

export function mondayAddAuth($, requestConfig) {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  const token = mondayToken($.auth.data);
  // A API do monday aceita o token puro no Authorization (pessoal ou OAuth).
  if (token) requestConfig.headers.Authorization = token;
  return requestConfig;
}

/** GraphQL com variáveis (sem montar texto do usuário dentro da query). */
export async function mondayQuery($, query, variables) {
  const { data } = await $.http.post('/', variables ? { query, variables } : { query });
  if (data?.errors?.length) {
    throw new Error(`monday.com: ${data.errors.map((e) => e.message).join('; ')}`);
  }
  if (data?.error_message) throw new Error(`monday.com: ${data.error_message}`);
  return data?.data;
}

export async function getMe($) {
  const data = await mondayQuery($, 'query { me { id name email account { id name slug } } }');
  return data?.me;
}

export function screenNameOf(me) {
  if (!me) return 'monday.com';
  const who = [me.name, me.email].filter(Boolean).join(' · ');
  return me.account?.name ? `${who} (${me.account.name})` : who || 'monday.com';
}
