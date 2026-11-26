// FreeScout responde 201 com o ID no cabeçalho Resource-ID (corpo vazio).
export function resourceId(response) {
  const h = response?.headers || {};
  const v = h['resource-id'] ?? h['Resource-ID'] ?? h.get?.('resource-id');
  return v === undefined || v === null || v === '' ? null : String(v);
}

export function numericId(value, label) {
  const s = String(value ?? '').trim();
  if (!/^\d{1,12}$/.test(s)) throw new Error(`FreeScout: ${label} must be a numeric ID`);
  return Number(s);
}

export const STATUSES = ['active', 'pending', 'closed'];
