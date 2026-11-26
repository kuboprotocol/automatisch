export function airbrakeId(value, label) {
  const s = String(value ?? '').trim();
  // IDs de grupo do Airbrake passam do inteiro seguro do JavaScript: manter como texto.
  if (!/^\d{1,25}$/.test(s)) throw new Error(`Airbrake: ${label} must be a numeric ID`);
  return s;
}

export function summarizeGroup(g) {
  const e = g?.errors?.[0] || {};
  const top = e.backtrace?.[0];
  return {
    id: String(g?.id ?? ''),
    projectId: g?.projectId,
    resolved: g?.resolved,
    muted: g?.muted,
    type: e.type,
    message: e.message,
    where: top ? `${top.file}:${top.line}${top.function ? ` (${top.function})` : ''}` : undefined,
    environment: g?.context?.environment,
    noticeCount: g?.noticeCount,
    lastNoticeAt: g?.lastNoticeAt,
    createdAt: g?.createdAt,
  };
}
