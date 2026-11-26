export default {
  name: 'List asset accounts',
  key: 'listAssetAccounts',

  async run($) {
    const { data } = await $.http.get('/v1/accounts', { params: { type: 'asset', limit: 100, page: 1 } });
    return {
      data: (data?.data || []).map((a) => ({ value: String(a.id), name: a.attributes?.name || String(a.id) })),
    };
  },
};
