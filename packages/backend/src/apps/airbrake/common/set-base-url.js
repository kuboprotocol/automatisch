export const AIRBRAKE_API = 'https://api.airbrake.io';

const setBaseUrl = ($, requestConfig) => {
  let base = AIRBRAKE_API;
  const raw = String($.auth.data.instanceUrl ?? '').trim();
  if (raw) {
    const url = new URL(raw);
    // Só domínios do Airbrake (a chave não vai para outro host).
    if (url.protocol === 'https:' && /(^|\.)airbrake\.io$/i.test(url.hostname)) base = url.origin;
  }
  requestConfig.baseURL = `${base}/api`;
  return requestConfig;
};

export default setBaseUrl;
