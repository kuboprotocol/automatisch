const getActiveTasks = async ($) => {
  const params = {
    project_id: $.step.parameters.projectId?.trim(),
    section_id: $.step.parameters.sectionId?.trim(),
    label: $.step.parameters.label?.trim(),
    filter: $.step.parameters.filter?.trim(),
  };

  // API v1: com filtro usa /tasks/filter?query=…; a lista vem em { results }.
  const filter = params.filter;
  delete params.filter;
  const response = filter
    ? await $.http.get('/tasks/filter', { params: { query: filter } })
    : await $.http.get('/tasks', { params });
  const tasks = Array.isArray(response.data)
    ? response.data
    : response.data?.results || [];

  // todoist api doesn't offer sorting, so we inverse sort on id here
  tasks.sort((a, b) => String(b.id).localeCompare(String(a.id)));

  for (const task of tasks) {
    $.pushTriggerItem({
      raw: task,
      meta: {
        internalId: task.id,
      },
    });
  }
};

export default getActiveTasks;
