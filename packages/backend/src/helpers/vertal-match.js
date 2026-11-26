// Conexão cujo login é deste usuário do provedor (userId guardado no verifyCredentials).
export function matchesProviderUser(formattedData, userId) {
  if (typeof userId !== 'string' || userId === '') return false;
  return String(formattedData?.userId ?? '') === userId;
}
