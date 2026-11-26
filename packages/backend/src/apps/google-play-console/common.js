// Google Play Developer API (androidpublisher v3): avaliações, faixas de lançamento e assinaturas.
// A API não lista os apps da conta: o usuário informa o nome do pacote (ex.: com.empresa.app).
// O acesso depende do Play Console: a conta Google que entrou precisa ter permissão no app
// (Play Console → Usuários e permissões), senão a API responde 403/401.

export const PLAY_API = 'https://androidpublisher.googleapis.com/androidpublisher/v3';
export const PLAY_SCOPES = ['https://www.googleapis.com/auth/androidpublisher'];

/** Nome de pacote Android válido (com.empresa.app). Evita path injection na URL. */
export function packageName(value) {
  const v = String(value || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(v)) {
    throw new Error('Package name inválido (ex.: com.empresa.app)');
  }
  return v;
}

export function safeId(value, label = 'ID') {
  const v = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{1,200}$/.test(v)) throw new Error(`${label} inválido`);
  return v;
}

/** Mensagem clara para os erros comuns (sem acesso no Play Console, app inexistente). */
export function playErrorText(error) {
  const status = error?.response?.status;
  const msg = error?.response?.data?.error?.message;
  if (status === 401 || status === 403) {
    return `sem permissão neste app (HTTP ${status}). No Play Console, convide a conta Google conectada em Usuários e permissões e dê acesso ao app.${msg ? ` Detalhe: ${msg}` : ''}`;
  }
  if (status === 404) return `app não encontrado no Play Console (confira o package name).${msg ? ` Detalhe: ${msg}` : ''}`;
  return msg || null;
}

export async function withPlayErrors(fn) {
  try {
    return await fn();
  } catch (error) {
    const text = playErrorText(error);
    if (text) throw new Error(`Google Play: ${text}`);
    throw error;
  }
}

/** Avaliação da API → objeto plano. */
export function summarizeReview(r) {
  const user = (r.comments || []).find((c) => c.userComment)?.userComment || {};
  const dev = (r.comments || []).find((c) => c.developerComment)?.developerComment;
  return {
    reviewId: r.reviewId,
    author: r.authorName || null,
    stars: user.starRating ?? null,
    text: (user.text || '').trim(),
    language: user.reviewerLanguage || null,
    appVersion: user.appVersionName || null,
    device: user.deviceMetadata?.productName || user.device || null,
    lastModified: user.lastModified?.seconds ? new Date(Number(user.lastModified.seconds) * 1000).toISOString() : null,
    reply: dev ? { text: dev.text, lastModified: dev.lastModified?.seconds ? new Date(Number(dev.lastModified.seconds) * 1000).toISOString() : null } : null,
  };
}

export async function listReviews($, pkg, { translationLanguage } = {}) {
  const out = [];
  let token;
  do {
    const params = { maxResults: 100, ...(translationLanguage ? { translationLanguage } : {}), ...(token ? { token } : {}) };
    const { data } = await $.http.get(`${PLAY_API}/applications/${packageName(pkg)}/reviews`, { params });
    out.push(...(data.reviews || []).map(summarizeReview));
    token = data.tokenPagination?.nextPageToken;
  } while (token && out.length < 300);
  return out;
}

/**
 * Faixas (produção, aberta, fechada, interna) e detalhes do app. Usa uma edição temporária
 * que é apagada no fim: nada é publicado ou alterado.
 */
export async function getTracks($, pkg) {
  const base = `${PLAY_API}/applications/${packageName(pkg)}/edits`;
  const { data: edit } = await $.http.post(base, {});
  try {
    const [{ data: tracks }, { data: details }] = await Promise.all([
      $.http.get(`${base}/${edit.id}/tracks`),
      $.http.get(`${base}/${edit.id}/details`),
    ]);
    return {
      packageName: pkg,
      defaultLanguage: details?.defaultLanguage || null,
      contactEmail: details?.contactEmail || null,
      tracks: (tracks?.tracks || []).map((t) => ({
        track: t.track,
        releases: (t.releases || []).map((r) => ({
          name: r.name || null,
          status: r.status,
          versionCodes: r.versionCodes || [],
          userFraction: r.userFraction ?? null,
        })),
      })),
    };
  } finally {
    await $.http.delete(`${base}/${edit.id}`).catch(() => {});
  }
}

export async function listSubscriptions($, pkg) {
  const out = [];
  let pageToken;
  do {
    const { data } = await $.http.get(`${PLAY_API}/applications/${packageName(pkg)}/subscriptions`, {
      params: { pageSize: 100, ...(pageToken ? { pageToken } : {}) },
    });
    for (const s of data.subscriptions || []) {
      out.push({
        productId: s.productId,
        title: s.listings?.[0]?.title || null,
        basePlans: (s.basePlans || []).map((b) => ({ basePlanId: b.basePlanId, state: b.state })),
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken && out.length < 500);
  return out;
}

export async function listOneTimeProducts($, pkg) {
  const out = [];
  let pageToken;
  do {
    const { data } = await $.http.get(`${PLAY_API}/applications/${packageName(pkg)}/oneTimeProducts`, {
      params: { pageSize: 100, ...(pageToken ? { pageToken } : {}) },
    });
    for (const p of data.oneTimeProducts || []) {
      out.push({ productId: p.productId, title: p.listings?.[0]?.title || null });
    }
    pageToken = data.nextPageToken;
  } while (pageToken && out.length < 500);
  return out;
}
