// "Conta do Vertal": conexões dos apps compartilhados com o Vertal Dev.
// A conexão guarda só `vertalBroker` + `vertalKey`. O token do provedor é
// pedido ao Vertal a cada execução (curta duração), fica só em memória e
// nunca é gravado no banco do Fluxos.
import axios from 'axios';

export const VERTAL_SHARED_APPS = [
  'gmail',
  'spotify',
  'slack',
  'github',
  'stripe',
  'discord',
];

export const VERTAL_SCREEN_NAME = 'Conta do Vertal';

const DEFAULT_BROKER_URL =
  'https://sccizjlpwezsgaxkclot.supabase.co/functions/v1/creative-router';

export const brokerUrl = () =>
  process.env.VERTAL_BROKER_URL || DEFAULT_BROKER_URL;

export const isVertalConnection = ($) => {
  const v = $?.auth?.data?.vertalBroker;
  return (v === true || v === 'true') && !!$?.auth?.data?.vertalKey;
};

export async function callBroker(vertalKey, payload, { timeout = 20000 } = {}) {
  const anon = process.env.VERTAL_BROKER_ANON_KEY || '';
  const headers = {
    'Content-Type': 'application/json',
    'X-Vertal-Fluxos-Key': vertalKey,
  };
  if (anon) {
    headers.apikey = anon;
    headers.Authorization = `Bearer ${anon}`;
  }
  const { data } = await axios.post(
    brokerUrl(),
    { tool: 'fluxos_broker', ...payload },
    { headers, timeout }
  );
  return data;
}

// Cada app lê o token de um campo diferente.
export function applyToken(appKey, authData, token, tokenType = 'Bearer') {
  switch (appKey) {
    case 'stripe':
      authData.secretKey = token;
      break;
    case 'slack':
      authData.userAccessToken = token;
      authData.botAccessToken = token;
      break;
    case 'discord':
      authData.botToken = token;
      authData.tokenType = 'Bot';
      break;
    default:
      authData.accessToken = token;
      authData.tokenType = tokenType || 'Bearer';
  }
}

async function fetchToken($) {
  const data = await callBroker($.auth.data.vertalKey, {
    op: 'token',
    app: $.app.key,
  });
  if (!data?.access_token) {
    throw new Error(
      data?.error || 'Conta do Vertal: conecte este app no Vertal Dev.'
    );
  }
  setMemoryToken($, data);
}

// Cópia em memória: $.auth.data é o mesmo objeto de connection.formattedData,
// e mexer nele faria o token ir parar no banco na próxima gravação.
function setMemoryToken($, data) {
  const copy = { ...$.auth.data };
  applyToken($.app.key, copy, data.access_token, data.token_type);
  copy.vertalTokenExpiresAt =
    Date.now() + Math.max(60, Number(data.expires_in) || 3000) * 1000;
  $.auth.data = copy;
}

async function ensureToken($, requestConfig) {
  if (
    isVertalConnection($) &&
    !requestConfig?.additionalProperties?.skipAddingAuthHeader &&
    !(Number($.auth.data.vertalTokenExpiresAt) > Date.now() + 60000)
  ) {
    await fetchToken($);
  }
  return requestConfig;
}

async function verifyByBroker($) {
  const data = await callBroker($.auth.data.vertalKey, {
    op: 'token',
    app: $.app.key,
  });
  if (!data?.access_token) return false;
  setMemoryToken($, data);
  return true;
}

// Envolve auth e beforeRequest do app compartilhado; conexões comuns seguem
// o caminho original sem mudança.
export function withVertalBroker(appData) {
  if (!VERTAL_SHARED_APPS.includes(appData?.key) || !appData.auth) {
    return appData;
  }
  const auth = appData.auth;
  const orig = {
    verifyCredentials: auth.verifyCredentials,
    isStillVerified: auth.isStillVerified,
    refreshToken: auth.refreshToken,
  };

  auth.verifyCredentials = async ($) => {
    if (!isVertalConnection($)) return orig.verifyCredentials?.($);
    // Gmail: o escopo do Vertal (gmail.readonly + gmail.send) não cobre a
    // People API usada pela verificação original; verifica pelo Vertal.
    if (!(await verifyByBroker($))) {
      throw new Error('Conta do Vertal: conecte este app no Vertal Dev.');
    }
    const { screenName, vertalKey } = $.auth.data;
    await $.auth.set({
      screenName: screenName || VERTAL_SCREEN_NAME,
      vertalBroker: true,
      vertalKey,
    });
  };

  auth.isStillVerified = async ($) => {
    if (!isVertalConnection($)) return orig.isStillVerified?.($);
    return verifyByBroker($);
  };

  // Só onde o app já renovava (Gmail, Spotify); os demais usam tokens longos,
  // buscados de novo pelo ensureToken antes de cada requisição.
  if (orig.refreshToken) {
    auth.refreshToken = async ($) =>
      isVertalConnection($) ? fetchToken($) : orig.refreshToken($);
  }

  appData.beforeRequest = [ensureToken, ...(appData.beforeRequest || [])];
  return appData;
}
