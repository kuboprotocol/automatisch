import { GRAPH_BASE, graphList, listPages, pageToken } from '../../helpers/meta-graph.js';

/**
 * Contas profissionais do Instagram que a conexão alcança. Dois tipos de token:
 * - Instagram API com login unificado (Facebook Login for Business, configuração com Instagram):
 *   token de usuário de sistema da empresa; contas em /me/assigned_instagram_accounts, sem Página.
 * - Login do Facebook clássico (token de usuário): contas ligadas às Páginas (/me/accounts).
 */
export async function listIgAccounts($) {
  const out = new Map();
  try {
    const assigned = await graphList($, '/me/assigned_instagram_accounts', { fields: 'id,username,name' });
    for (const a of assigned) {
      if (a?.id) out.set(String(a.id), { id: String(a.id), username: a.username, name: a.name, pageId: null, pageName: null });
    }
  } catch {
    // token de usuário do Facebook: a borda não existe para ele
  }
  try {
    const pages = await listPages($);
    for (const p of pages) {
      const ig = p.instagram_business_account;
      if (!ig?.id) continue;
      out.set(String(ig.id), { id: String(ig.id), username: ig.username, name: ig.name, pageId: p.id, pageName: p.name });
    }
  } catch (err) {
    if (!out.size) throw err;
  }
  return [...out.values()];
}

/** Nome da conexão: "@usuario" das contas liberadas (o /me do token de sistema não é a conta). */
export async function igScreenName($) {
  const accounts = await listIgAccounts($);
  if (!accounts.length) return null;
  const names = accounts.map((a) => (a.username ? `@${a.username}` : a.name || a.id));
  return names.length > 2 ? `${names.slice(0, 2).join(', ')} +${names.length - 2}` : names.join(', ');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Cria o contêiner, espera ficar pronto (vídeo) e publica. */
export async function publishMedia($, igId, body, { waitMs = 40000 } = {}) {
  const { data: container } = await $.http.post(`${GRAPH_BASE}/${encodeURIComponent(igId)}/media`, body);
  const started = Date.now();
  while (Date.now() - started < waitMs) {
    const { data: st } = await $.http.get(`${GRAPH_BASE}/${container.id}`, { params: { fields: 'status_code' } });
    if (!st.status_code || st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') {
      throw new Error(`Instagram could not process the media (${st.status_code})`);
    }
    await sleep(4000);
  }
  const { data } = await $.http.post(`${GRAPH_BASE}/${encodeURIComponent(igId)}/media_publish`, {
    creation_id: container.id,
  });
  return { ...data, creationId: container.id };
}

/** Página do Facebook ligada à conta do Instagram (as DMs passam pela Página). */
export async function pageForIg($, igUserId) {
  const acc = (await listIgAccounts($)).find((a) => a.id === String(igUserId));
  if (!acc) throw new Error('This Instagram account was not shared with this connection');
  // Login unificado (sem Página): as chamadas vão na própria conta do Instagram, com o token da conexão.
  if (!acc.pageId) return { pageId: null, token: null, account: acc, base: String(acc.id) };
  return { pageId: acc.pageId, token: await pageToken($, acc.pageId), account: acc, base: acc.pageId };
}

/** Parâmetros de token: token da Página (login do Facebook) ou o da conexão (login unificado). */
function tokenOpts(token) {
  return token ? { access_token: token } : {};
}
function tokenCfg(token) {
  return token ? { additionalProperties: { skipAddingAuthHeader: true } } : {};
}

/** Conversas (DMs) da conta, mais recentes primeiro, com a última mensagem. */
export async function listConversations($, igUserId, limit = 20) {
  const { base, token } = await pageForIg($, igUserId);
  const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent(base)}/conversations`, {
    params: {
      platform: 'instagram',
      fields: 'id,updated_time,participants,messages.limit(1){id,message,from,created_time}',
      limit: Math.min(Math.max(Number(limit) || 20, 1), 50),
      ...tokenOpts(token),
    },
    ...tokenCfg(token),
  });
  return (data.data || []).map((c) => {
    const other = (c.participants?.data || []).find((p) => p.id !== String(igUserId)) || {};
    const last = c.messages?.data?.[0] || {};
    return {
      id: c.id,
      updatedTime: c.updated_time,
      contactId: other.id || null,
      contactUsername: other.username || other.name || null,
      lastMessage: last.message ?? null,
      lastFrom: last.from?.username || last.from?.id || null,
      lastAt: last.created_time || null,
    };
  });
}

/** Mensagens de uma conversa (mais recentes primeiro). */
export async function conversationMessages($, igUserId, conversationId, limit = 20) {
  const { token } = await pageForIg($, igUserId);
  const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent(conversationId)}`, {
    params: {
      fields: `messages.limit(${Math.min(Math.max(Number(limit) || 20, 1), 50)}){id,message,from,to,created_time}`,
      ...tokenOpts(token),
    },
    ...tokenCfg(token),
  });
  return (data.messages?.data || []).map((m) => ({
    id: m.id,
    text: m.message ?? null,
    fromId: m.from?.id || null,
    fromUsername: m.from?.username || null,
    incoming: m.from?.id ? m.from.id !== String(igUserId) : null,
    createdTime: m.created_time,
  }));
}

/** Envia texto numa DM. A Meta só aceita texto livre até 24 h depois da última mensagem do contato. */
export async function sendDirectMessage($, igUserId, recipientId, text) {
  const { base, token } = await pageForIg($, igUserId);
  const { data } = await $.http.post(
    `${GRAPH_BASE}/${encodeURIComponent(base)}/messages`,
    { recipient: { id: String(recipientId) }, message: { text }, messaging_type: 'RESPONSE', ...tokenOpts(token) },
    tokenCfg(token)
  );
  return data;
}
