// Única saída de rede do app (fácil de simular nos testes). Nunca segue redirecionamento.
import axios from 'axios';

export const transport = {
  post: (url, body, config = {}) =>
    axios.post(url, body, { maxRedirects: 0, ...config }),
  get: (url, config = {}) => axios.get(url, { maxRedirects: 0, ...config }),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
};
