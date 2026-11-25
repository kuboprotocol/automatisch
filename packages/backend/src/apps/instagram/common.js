import { GRAPH_BASE, listPages } from '../../helpers/meta-graph.js';

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
