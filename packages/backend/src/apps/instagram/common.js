import { GRAPH_BASE, listPages, pageToken } from '../../helpers/meta-graph.js';

export async function listIgAccounts($) {
  const pages = await listPages($);
  return pages
    .filter((p) => p.instagram_business_account?.id)
    .map((p) => ({
      id: p.instagram_business_account.id,
      username: p.instagram_business_account.username,
      name: p.instagram_business_account.name,
      pageId: p.id,
      pageName: p.name,
    }));
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
  if (!acc) throw new Error('This Instagram account is not linked to any Facebook Page you manage');
  return { pageId: acc.pageId, token: await pageToken($, acc.pageId), account: acc };
}

/** Conversas (DMs) da conta, mais recentes primeiro, com a última mensagem. */
export async function listConversations($, igUserId, limit = 20) {
  const { pageId, token } = await pageForIg($, igUserId);
  const { data } = await $.http.get(`${GRAPH_BASE}/${encodeURIComponent(pageId)}/conversations`, {
    params: {
      platform: 'instagram',
      fields: 'id,updated_time,participants,messages.limit(1){id,message,from,created_time}',
      limit: Math.min(Math.max(Number(limit) || 20, 1), 50),
      access_token: token,
    },
    additionalProperties: { skipAddingAuthHeader: true },
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
      access_token: token,
    },
    additionalProperties: { skipAddingAuthHeader: true },
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
  const { pageId, token } = await pageForIg($, igUserId);
  const { data } = await $.http.post(
    `${GRAPH_BASE}/${encodeURIComponent(pageId)}/messages`,
    { recipient: { id: String(recipientId) }, message: { text }, messaging_type: 'RESPONSE', access_token: token },
    { additionalProperties: { skipAddingAuthHeader: true } }
  );
  return data;
}
