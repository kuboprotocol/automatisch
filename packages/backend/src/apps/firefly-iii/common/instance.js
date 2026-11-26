// URL da instância do Firefly III do próprio usuário (auto-hospedado), sem barra no fim.
// Aceita subpasta (https://exemplo.com/firefly). Só http(s).
export function instanceBase(value) {
  const raw = String(value ?? '').trim();
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Firefly III: invalid instance URL (example: https://firefly.example.com)');
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Firefly III: the instance URL must start with https://');
  }
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
