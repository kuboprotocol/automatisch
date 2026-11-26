export default {
  name: 'List mailboxes',
  key: 'listMailboxes',
  async run($) {
    const { data } = await $.http.get('/mailboxes', { params: { pageSize: 100 } });
    return {
      data: (data?._embedded?.mailboxes || []).map((m) => ({ value: String(m.id), name: m.email ? `${m.name} (${m.email})` : m.name })),
    };
  },
};
