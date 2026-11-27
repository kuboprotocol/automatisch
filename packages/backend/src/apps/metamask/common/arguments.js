// Campos comuns dos passos (rótulos em pt-BR, como o resto do fork; descrições com en/es curtos).
import { NETWORKS } from './config.js';

export const networkArgument = {
  label: 'Rede',
  key: 'network',
  type: 'dropdown',
  required: true,
  value: 'sepolia',
  variables: false,
  description:
    'Sepolia (testnet) é o padrão. Ethereum mainnet só para leitura. · Network (Sepolia default; mainnet read-only) · Red (Sepolia por defecto; mainnet solo lectura)',
  options: Object.values(NETWORKS).map((n) => ({
    label: n.name,
    value: n.key,
  })),
};

export const walletArgument = {
  label: 'Carteira',
  key: 'wallet',
  type: 'dropdown',
  required: false,
  variables: false,
  description:
    'Uma carteira já conectada no Vertal Dev. Em branco = a primeira conectada. · Wallet already connected in Vertal Dev · Billetera ya conectada en Vertal Dev',
  source: {
    type: 'query',
    name: 'getDynamicData',
    arguments: [{ name: 'key', value: 'listWallets' }],
  },
};

export const tokenArgument = {
  label: 'Token ERC-20 (opcional)',
  key: 'tokenAddress',
  type: 'string',
  required: false,
  variables: true,
  description:
    'Endereço 0x… do contrato do token. Em branco = ETH. · ERC-20 contract address (blank = ETH) · Dirección del contrato ERC-20 (vacío = ETH)',
};
