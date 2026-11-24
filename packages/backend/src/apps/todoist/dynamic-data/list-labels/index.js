export default {
  name: 'List labels',
  key: 'listLabels',

  async run($) {
    const response = await $.http.get('/labels');

    response.data = (Array.isArray(response.data) ? response.data : response.data?.results || []).map((label) => {
      return {
        value: label.name,
        name: label.name,
      };
    });

    return response;
  },
};
