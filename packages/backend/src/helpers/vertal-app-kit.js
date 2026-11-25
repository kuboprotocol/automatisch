// Peças comuns dos apps de anúncios/redes/marketplaces do Vertal (Meta, TikTok Ads,
// Amazon Ads, eBay, Kwai Ads). O cliente OAuth (id/secret) vem do Vertal Dev; o
// retorno do login cai em https://vertal.dev/fluxos/oauth/<app>.
import crypto from 'node:crypto';

export function redirectField(appKey) {
  return {
    key: 'oAuthRedirectUrl',
    label: 'OAuth Redirect URL',
    type: 'string',
    required: true,
    readOnly: true,
    value: `{WEB_APP_URL}/app/${appKey}/connections/add`,
    placeholder: null,
    description: 'Use this URL as the redirect URL of your developer app.',
    clickToCopy: true,
  };
}

export function textField(key, label, { required = true, description = null, value = null } = {}) {
  return {
    key,
    label,
    type: 'string',
    required,
    readOnly: false,
    value,
    placeholder: null,
    description,
    clickToCopy: false,
  };
}

export function dropdownField(key, label, options, value) {
  return {
    key,
    label,
    type: 'dropdown',
    required: true,
    readOnly: false,
    value,
    options,
    description: null,
    clickToCopy: false,
  };
}

export function redirectUri($) {
  return $.app.auth.fields.find((f) => f.key === 'oAuthRedirectUrl').value;
}

export function newState() {
  return crypto.randomBytes(16).toString('hex');
}

/** Argumento dropdown alimentado por dynamic-data (com dependências opcionais). */
export function dynamicArg(key, label, dataKey, { required = true, dependsOn = [], description } = {}) {
  return {
    label,
    key,
    type: 'dropdown',
    required,
    variables: true,
    ...(description ? { description } : {}),
    ...(dependsOn.length ? { dependsOn: dependsOn.map((d) => `parameters.${d}`) } : {}),
    source: {
      type: 'query',
      name: 'getDynamicData',
      arguments: [
        { name: 'key', value: dataKey },
        ...dependsOn.map((d) => ({ name: `parameters.${d}`, value: `{parameters.${d}}` })),
      ],
    },
  };
}

export function stringArg(key, label, { required = false, description, value } = {}) {
  return {
    label,
    key,
    type: 'string',
    required,
    variables: true,
    ...(description ? { description } : {}),
    ...(value !== undefined ? { value } : {}),
  };
}

export function optionsArg(key, label, options, { required = true, value, description } = {}) {
  return {
    label,
    key,
    type: 'dropdown',
    required,
    variables: true,
    ...(value !== undefined ? { value } : {}),
    ...(description ? { description } : {}),
    options: options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o)),
  };
}

/** Busca (gatilho de consulta): empurra itens com id para dedup. */
export function pushItems($, items, idOf = (i) => i.id) {
  for (const item of items || []) {
    const id = idOf(item);
    $.pushTriggerItem({ raw: item, meta: { internalId: String(id ?? JSON.stringify(item).slice(0, 64)) } });
  }
}

export function csv(value) {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isoDay(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

export function parseJsonArg(value, fallback = {}) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    throw new Error('Invalid JSON in parameters');
  }
}
