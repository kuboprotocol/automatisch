import appConfig from '@/config/app.js';

const appInfoConverter = (rawAppData) => {
  rawAppData.iconUrl = rawAppData.iconUrl.replace(
    '{BASE_URL}',
    appConfig.baseUrl
  );

  rawAppData.authDocUrl = rawAppData.authDocUrl.replace(
    '{DOCS_URL}',
    appConfig.docsUrl
  );

  if (rawAppData.auth?.fields) {
    rawAppData.auth.fields = rawAppData.auth.fields.map((field) => {
      // Vertal: o retorno do OAuth vai para o Vertal Dev (white-label),
      // ex.: VERTAL_OAUTH_REDIRECT_TEMPLATE=https://vertal.dev/fluxos/oauth/{APP_KEY}
      const vertalRedirect = process.env.VERTAL_OAUTH_REDIRECT_TEMPLATE;
      if (field.key === 'oAuthRedirectUrl' && vertalRedirect) {
        return {
          ...field,
          value: vertalRedirect.replace('{APP_KEY}', rawAppData.key),
        };
      }

      if (field.type === 'string' && typeof field.value === 'string') {
        return {
          ...field,
          value: field.value.replace('{WEB_APP_URL}', appConfig.webAppUrl),
        };
      }

      return field;
    });
  }

  return rawAppData;
};

export default appInfoConverter;
