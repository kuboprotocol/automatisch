// A API não tem endpoint de usuário (/me), então validamos a chave numa busca comum.
// Se a chave for recusada, $.http lança erro e a conexão não é salva.
const verifyCredentials = async ($) => {
  await $.http.get('/v1/images/search?limit=1', {
    headers: { 'x-api-key': $.auth.data.apiKey },
  });

  // O screenName é obrigatório: é o nome da conexão na interface.
  await $.auth.set({
    screenName: $.auth.data.screenName,
  });
};

export default verifyCredentials;
