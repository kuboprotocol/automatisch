import verifyCredentials from './verify-credentials.js';

// Retorna true enquanto as credenciais forem aceitas. Se não forem, o erro é tratado pelo Automatisch.
const isStillVerified = async ($) => {
  await verifyCredentials($);
  return true;
};

export default isStillVerified;
