export default {
  name: 'List sections',
  key: 'listSections',

  async run($) {
    const params = {
      project_id: $.step.parameters.projectId,
    };

    const response = await $.http.get('/sections', { params });

    response.data = (Array.isArray(response.data) ? response.data : response.data?.results || []).map((section) => {
      return {
        value: section.id,
        name: section.name,
      };
    });

    return response;
  },
};
