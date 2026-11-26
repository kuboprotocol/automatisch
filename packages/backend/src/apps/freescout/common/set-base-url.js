// <instância>/api; aceita subpasta e barra no fim.
const setBaseUrl = ($, requestConfig) => {
  const raw = String($.auth.data.instanceUrl ?? '').trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('FreeScout: invalid instance URL (example: https://support.example.com)');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('FreeScout: the instance URL must start with https://');
  requestConfig.baseURL = `${url.origin}${url.pathname.replace(/\/+$/, '')}/api`;
  return requestConfig;
};

export default setBaseUrl;
