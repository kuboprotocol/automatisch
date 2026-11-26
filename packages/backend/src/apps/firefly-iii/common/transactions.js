// Monta o corpo de POST /api/v1/transactions (Firefly III API v6+).
export const TRANSACTION_TYPES = ['withdrawal', 'deposit', 'transfer'];

function clean(v) {
  const s = String(v ?? '').trim();
  return s === '' ? undefined : s;
}

export function buildTransaction(p) {
  const type = clean(p.type) || 'withdrawal';
  if (!TRANSACTION_TYPES.includes(type)) throw new Error(`Firefly III: invalid type (${p.type})`);
  const amount = String(p.amount ?? '').trim().replace(',', '.');
  if (!/^\d+(\.\d{1,12})?$/.test(amount) || Number(amount) <= 0) {
    throw new Error('Firefly III: amount must be a positive number (e.g. 12.50)');
  }
  const description = clean(p.description);
  if (!description) throw new Error('Firefly III: description is required');
  const date = clean(p.date) || new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) throw new Error('Firefly III: date must be YYYY-MM-DD');

  const split = { type, date, amount, description: description.slice(0, 1000) };
  const sourceId = clean(p.sourceId);
  const sourceName = clean(p.sourceName);
  const destinationId = clean(p.destinationId);
  const destinationName = clean(p.destinationName);
  if (sourceId) split.source_id = sourceId;
  else if (sourceName) split.source_name = sourceName;
  if (destinationId) split.destination_id = destinationId;
  else if (destinationName) split.destination_name = destinationName;
  if (!split.source_id && !split.source_name) throw new Error('Firefly III: source account is required');
  if (!split.destination_id && !split.destination_name) throw new Error('Firefly III: destination account is required');
  const category = clean(p.categoryName);
  if (category) split.category_name = category;
  const currency = clean(p.currencyCode);
  if (currency) split.currency_code = currency.toUpperCase();
  const notes = clean(p.notes);
  if (notes) split.notes = notes;
  const tags = String(p.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean);
  if (tags.length) split.tags = tags;

  return { error_if_duplicate_hash: false, apply_rules: true, fire_webhooks: true, transactions: [split] };
}
