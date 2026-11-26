export default {
  name: 'List users',
  key: 'listUsers',
  async run($) {
    const { data } = await $.http.get('/users', { params: { pageSize: 100 } });
    return {
      data: (data?._embedded?.users || []).map((u) => ({
        value: String(u.id),
        name: [u.firstName, u.lastName].filter(Boolean).join(' ') + (u.email ? ` (${u.email})` : ''),
      })),
    };
  },
};
