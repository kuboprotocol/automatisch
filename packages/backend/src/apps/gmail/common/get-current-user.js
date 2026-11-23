import { isVertalConnection } from '../../../helpers/vertal-broker.js';

const getCurrentUser = async ($) => {
  // Conta do Vertal: o token só tem gmail.readonly + gmail.send, sem a People
  // API; o perfil do Gmail devolve o endereço no mesmo formato.
  if (isVertalConnection($)) {
    const { data } = await $.http.get(
      'https://gmail.googleapis.com/gmail/v1/users/me/profile'
    );
    return {
      resourceName: `gmail/${data.emailAddress}`,
      names: [{ displayName: data.emailAddress }],
      emailAddresses: [{ value: data.emailAddress }],
    };
  }

  const { data: currentUser } = await $.http.get(
    'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses'
  );
  return currentUser;
};

export default getCurrentUser;
