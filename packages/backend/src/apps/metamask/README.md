# MetaMask (Vertal Wallet) — app do Vertal Fluxos (SÓ LEITURA)

Pedido do Laércio (aprovado em 27/11/2026): trazer a carteira MetaMask que ele já conectou no Vertal Dev
(`/connectors/metamask/setup`, Sign-In with Ethereum) para os fluxos, como gatilho e ação.

**Só leitura.** Nada aqui pede, aceita ou guarda chave privada ou frase-semente, e nada assina ou envia transação.
O cliente JSON-RPC recusa qualquer método fora de uma lista de leituras (`eth_blockNumber`, `eth_getBalance`,
`eth_getTransactionCount`, `eth_getBlockByNumber`, `eth_getLogs`, `eth_call`, `eth_chainId`).

## O que tem

| Tipo | Nome | O que faz |
| --- | --- | --- |
| Gatilho (15 min) | **Nova transação recebida** (`newIncomingTransaction`) | ETH (valor > 0) ou um token ERC-20 que chegou na carteira |
| Gatilho (15 min) | **Saldo mudou** (`balanceChanged`) | Saldo de ETH ou de um ERC-20 diferente do último visto (saldo anterior, atual e diferença) |
| Ação | **Consultar saldo** (`getBalance`) | Saldo de ETH ou ERC-20 (com símbolo e casas decimais) |
| Ação | **Listar transações recentes** (`listRecentTransactions`) | Todas / recebidas / enviadas, 1–50 |

Campos de cada passo: **Rede** (Sepolia — padrão — ou Ethereum mainnet, só leitura), **Carteira** (lista das carteiras
conectadas no Vertal Dev; em branco = a primeira) e **Token ERC-20** opcional (em branco = ETH).
Só carteiras que o usuário conectou no Vertal Dev podem ser lidas.

## Conexão
Os campos são os mesmos do app "Vertal": a chave do Vertal Fluxos (`VERTAL_FLUXOS_KEY`, `vfk1…`). O app chama
`POST vertal-code-ai?app=wallet` com o header `X-Vertal-Fluxos-Key` (o mesmo caminho do Vertal CRM) e recebe só
`address`, `chainId` e `connectedAt`. Sem carteira conectada: erro com o link `https://vertal.dev/connectors/metamask/setup`.

## De onde vêm as transações
1. **Etherscan direto** — se `VERTAL_METAMASK_ETHERSCAN_KEY` estiver no Railway (API v2, `txlist` / `tokentx`).
2. **Etherscan pelo Vertal Dev** — se a chave estiver no `VERTAL_GPU_CONFIG` (op `txlist`; a chave não sai do servidor).
   Se o servidor disser que não tem chave, o app não pergunta de novo por 10 min.
3. **RPC público** (padrão, sem chave):
   - ERC-20: `eth_getLogs` do evento `Transfer` com o endereço no tópico do destinatário (ou remetente), em pedaços de 1.000 blocos.
   - ETH: antes de ler blocos, compara saldo e nonce no início e no fim da janela (nonce igual + saldo igual = nada chegou)
     e só então lê os blocos em lotes de 10 (`eth_getBlockByNumber` com as transações).
   - Janela limitada: últimos `VERTAL_METAMASK_SCAN_BLOCKS` blocos (120 ≈ 24 min, maior que o intervalo de 15 min do gatilho);
     o gatilho continua do bloco do último item processado (está no `internalId`), sem estado extra no banco.
   - Só blocos com `VERTAL_METAMASK_CONFIRMATIONS` confirmações (padrão 2).
   - Limite de chamadas: `VERTAL_METAMASK_RPC_RPS` por RPC (padrão 5/s), novas tentativas em 429/5xx respeitando `Retry-After`.

Limites conhecidos: transferências **internas** de ETH (feitas por contrato) não aparecem na varredura por blocos nem no
`txlist`; se o Fluxos ficar parado mais que a janela, sem Etherscan as transações mais antigas que a janela ficam de fora.

## Variáveis (Railway, serviços main e worker) — todas desligadas/ausentes por padrão
| Variável | Padrão | Efeito |
| --- | --- | --- |
| `VERTAL_METAMASK_FLUXOS_ENABLED` | desligado | Liga o app. Desligado: todo passo e toda conexão falham com "não está liberado", sem nenhuma chamada de rede |
| `VERTAL_METAMASK_RPC_11155111` / `VERTAL_METAMASK_RPC_1` | publicnode | RPC https próprio |
| `VERTAL_METAMASK_ETHERSCAN_KEY` | ausente | Etherscan direto |
| `VERTAL_METAMASK_SCAN_BLOCKS` | 120 (máx. 2000) | Janela da varredura por RPC |
| `VERTAL_METAMASK_CONFIRMATIONS` | 2 (máx. 64) | Confirmações |
| `VERTAL_METAMASK_RPC_RPS` | 5 (máx. 25) | Chamadas por segundo por RPC |
| `VERTAL_METAMASK_FLUXOS_LANG` | pt | Idioma das mensagens: pt, en, es |
| `VERTAL_WALLET_URL` | `…/functions/v1/vertal-code-ai?app=wallet` | Rota do Vertal Dev |
| `VERTAL_BROKER_ANON_KEY` | (já existe) | Anon key do Supabase, a mesma do app Vertal |

Do lado do Vertal Dev (dentro do `VERTAL_GPU_CONFIG`, sem segredo novo): `VERTAL_METAMASK_FLUXOS_ENABLED=true`, além de
`VERTAL_METAMASK_ENABLED` e do id do usuário em `VERTAL_METAMASK_USER_IDS` (hoje só o Laércio). Quem não está liberado
recebe 404 e o app mostra "ainda não liberado para esta conta".

## Testes
`metamask.test.js` (rede, Vertal Dev e Etherscan simulados): definição, nenhuma pergunta por chave privada, métodos de
escrita recusados, interruptor desligado sem chamadas, conexão sem carteira, carteira não conectada recusada, 429 com
`Retry-After`, lote recusado, saldo ETH/ERC-20, varredura limitada, Etherscan direto, logs `Transfer`, cache do
"sem Etherscan" do servidor, gatilho de saldo, textos pt/en/es.
