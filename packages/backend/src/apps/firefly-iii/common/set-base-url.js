import { instanceBase } from './instance.js';

// API: <instância>/api (v1/...). OAuth (/oauth/token): direto na instância.
const setBaseUrl = ($, requestConfig) => {
  const base = instanceBase($.auth.data.instanceUrl);
  requestConfig.baseURL = requestConfig.additionalProperties?.skipAddingBaseUrl ? base : `${base}/api`;
  return requestConfig;
};

export default setBaseUrl;
