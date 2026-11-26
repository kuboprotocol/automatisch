import crypto from 'crypto';

// PKCE (S256). External Client Apps do Salesforce exigem PKCE no fluxo de código
// (não dá para desligar), então o verificador fica nos dados da conexão até a troca do código.
export const createCodeVerifier = () =>
  crypto.randomBytes(48).toString('base64url');

export const codeChallengeFor = (verifier) =>
  crypto.createHash('sha256').update(verifier).digest('base64url');
