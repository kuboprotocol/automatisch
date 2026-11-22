import defineTrigger from '../../../../helpers/define-trigger.js';

export default defineTrigger({
  name: 'Search cat images',
  key: 'searchCatImages',
  pollInterval: 15,
  description: 'Triggers when there is a new cat image.',

  async run($) {
    // A API é paginada: pedimos páginas até vir menos de 10 itens (última página).
    // order=DESC: o Automatisch exige ordem cronológica inversa para o gatilho funcionar.
    let page = 0;
    let response;

    const headers = {
      'x-api-key': $.auth.data.apiKey,
    };

    do {
      const requestPath = `/v1/images/search?page=${page}&limit=10&order=DESC`;
      response = await $.http.get(requestPath, { headers });

      response.data.forEach((image) => {
        const dataItem = {
          raw: image,
          meta: {
            // Identificador único da imagem: evita enviar o mesmo dado duas vezes.
            internalId: image.id,
          },
        };

        $.pushTriggerItem(dataItem);
      });

      page += 1;
    } while (response.data.length >= 10);
  },
});
