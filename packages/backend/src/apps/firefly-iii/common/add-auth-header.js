// Token do login OAuth (Laravel Passport da instância) ou Personal Access Token (Avançado).
const addAuthHeader = ($, requestConfig) => {
  if (requestConfig.additionalProperties?.skipAddingAuthHeader) return requestConfig;
  const token = $.auth.data?.accessToken || $.auth.data?.personalAccessToken;
  if (token) requestConfig.headers.Authorization = `Bearer ${token}`;
  if (!requestConfig.headers.Accept) requestConfig.headers.Accept = 'application/json';
  return requestConfig;
};

export default addAuthHeader;
