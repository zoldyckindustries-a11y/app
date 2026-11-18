# Plataforma — área do cliente

Terceiro projeto da esteira. O funil (`zaplens.online`) vende, o upsell
(`upsell.zaplens.online`) oferece o adicional, e **aqui** é onde a pessoa
entra depois de pagar para acompanhar o relatório.

Roda na porta **3002** (`npm run dev`), para subir junto com os outros dois
sem conflito de porta.

---

## A regra dos 7 dias

Parte do relatório abre na hora. O resto abre **7 dias depois da primeira
entrada** — não da data do pagamento. A âncora é o campo `criadoEm` da conta,
gravado uma única vez e nunca reescrito; se ele fosse atualizado a cada
visita, o prazo reiniciaria sozinho e o relatório nunca abriria.

O prazo mora em um lugar só:

```ts
// src/lib/config.ts
export const PRAZO_DIAS = 7;
```

E uma função só decide o que está aberto (`src/lib/liberacao.ts`). A página, a
contagem regressiva e o filtro de conteúdo usam todas ela — com o cálculo
repetido em dois lugares, um deles acabaria mostrando cadeado numa seção cujo
conteúdo já tinha ido para o navegador.

> **O bloqueio é no servidor, não no CSS.** Uma seção fechada chega ao
> navegador com `conteudo: null` (`src/lib/relatorio.ts`). Não existe texto
> desfocado para alguém revelar pelo inspetor — o conteúdo simplesmente não
> sai do servidor antes da hora.

Quais seções são prévia e quais esperam está em `SECOES`, no mesmo arquivo:
é o campo `previa`.

---

## Como a pessoa entra

A conta nasce do **postback da PerfectPay** (`/api/perfectpay`), nunca da
visita. Antes era o contrário, e por isso qualquer pessoa que tivesse passado
pelo funil entrava — tendo pago ou não. Hoje `pago = false` fecha todas as
portas.

A chave da conta é o **telefone do comprador**, o que ele digitou no
checkout: é o único identificador que sempre chega no postback. O alvo
(`nome`, `alvo_telefone`) é assunto do dossiê, não identidade.

Quatro portas, em ordem de atrito:

| Porta | Quando serve |
|---|---|
| Redirect pós-compra (`/api/entrada`) | Instantâneo. Casa o cookie/lid do funil com a conta paga |
| Link mágico (`/e/<token>`) | O e-mail de entrega. Um clique, de qualquer aparelho, 30 dias |
| Telefone + código de 6 dígitos (`/entrar`) | Permanente. Funciona para sempre, em qualquer lugar |
| `npm run liberar` | Suporte e vendas anteriores ao webhook |

A resposta de erro é a mesma para telefone inexistente, código errado e conta
sem pagamento aprovado. Distinguir entregaria quais números têm conta aqui e
quais vendas foram aprovadas.

---

## Postback da PerfectPay

Registrar em **Ferramentas > Webhook - Vendas**, formato "PerfectPay", com os
eventos de aprovação, cancelamento, estorno e chargeback:

```
https://app.zaplens.online/api/perfectpay?k=<PERFECTPAY_CHAVE_URL>
```

A chave na URL é a autenticação principal: a [documentação oficial](https://app.perfectpay.com.br/docs/api/webhooks)
diz que o `token` do payload é um identificador estático e **não autentica o
envio**. O `token` é conferido como segunda camada quando `PERFECTPAY_TOKEN`
está definido. Existe também um `X-Webhook-Signature`, mas a doc pública não
traz o algoritmo — quando ele for confirmado, entra como terceira camada.

O que o endpoint faz, em ordem:

1. Confere a chave da URL e o token.
2. Grava o payload cru em `plataforma_vendas`, com chave `(code, status)`. A
   PerfectPay reentrega o mesmo evento e avisa para **não** deduplicar só por
   `code` — a mesma venda muda de status legitimamente. Repetição sai aqui
   com `{ repetido: true }`.
3. Status 6, 7 ou 9 (cancelado, estornado, chargeback) tira o acesso
   **daquela oferta**: um estorno de upsell não fecha o relatório principal.
4. Status 2 (aprovado) cria ou soma a conta. As flags são aditivas e
   `criado_em` nunca é reescrito — senão a compra do upsell reiniciaria os
   7 dias.
5. Envia o e-mail de acesso, se houver Resend configurado. A falha do e-mail
   não derruba a resposta: devolver erro faria a PerfectPay reentregar uma
   venda já processada.

**Os códigos de produto são do painel, não do código.** Um produto não
mapeado não vira acesso por engano — fica registrado para configuração.
Depois da primeira venda real de cada oferta:

```bash
npm run liberar -- --produtos    # mostra os product.code já recebidos
```

e cole em `PERFECTPAY_PRODUTO_PRINCIPAL` / `_UPSELL1` / `_UPSELL2`.

### A esteira inteira

O redirect pós-compra de cada produto segue a esteira; a **entrega** de todos
eles aponta para a plataforma.

| Produto | Entrega | Redirect pós-compra |
|---|---|---|
| Principal | `app.zaplens.online` | upsell 1 |
| Upsell 1 | `app.zaplens.online` | upsell 2 |
| Upsell 2 | `app.zaplens.online` | `app.zaplens.online` |

A recusa dos upsells não é configuração de painel: é o
`NEXT_PUBLIC_DECLINE_URL` do projeto `pelezika-upsell`. Ele carimba
`?lid=&t=&n=` no destino, então apontá-lo para a plataforma dá a melhor
entrada possível — melhor que o redirect da PerfectPay, que vai fixo e sem
parâmetros.

---

## Liberar acesso na mão

O postback só dispara em venda nova — a PerfectPay não reenvia o passado.
Quem comprou antes do webhook existir precisa deste script:

```bash
npm run liberar -- --telefone 43999998888 --email joao@x.com --nome "João Pedro" --alvo 43999992222 --alvo-nome "Maria" --upsell1 --enviar

npm run liberar -- --ver 43999998888     # consulta a conta e o código
npm run liberar -- --telefone X --link   # gera link de entrada (p/ WhatsApp)
npm run liberar -- --vendas              # últimos postbacks recebidos
```

Ele usa as mesmas funções da aplicação, compiladas na hora com esbuild: um
segundo caminho de escrita seria um segundo conjunto de regras para divergir,
e aqui se escreve em conta de cliente.

---

## Dados

Contas e sessões em **Postgres** (Neon). O retrato do lead continua no Redis
do funil, porque quem escreve ali é outro projeto.

| Onde | O que guarda |
|---|---|
| `plataforma_contas` | telefone do comprador (PK), e-mail, dados do alvo, código, `pago`, `upsell1`, `upsell2` e **`criado_em`** |
| `plataforma_sessoes` | token (PK), telefone, `expira_em` (180 dias) |
| `plataforma_acessos` | token do link mágico do e-mail, `expira_em` (30 dias) |
| `plataforma_vendas` | postback cru da PerfectPay, chave `(code, status)` |
| `upsell:lead:<lid>` (Redis do funil) | retrato gravado pelo funil — só leitura aqui |

O esquema mora em `src/lib/esquema.ts` e é criado sozinho no primeiro acesso
(`garantirEsquema`, em `src/lib/db.ts`) — ou na mão, com `npm run db:init`.
Nada de migração para rodar: é tudo `create ... if not exists`.

O driver é o **`@neondatabase/serverless`**, não o `pg`. A plataforma roda em
Cloudflare Workers, onde não existe socket TCP para o `pg` usar; o driver do
Neon fala HTTP, funciona igual no `next dev` e no Worker, e por ser stateless
não deixa conexão pendurada entre requisições — que é o que estouraria o
limite do pooler.

Duas observações sobre o que é obrigatório e o que não é:

- **`DATABASE_URL` não é opcional.** É onde moram as contas, as sessões e a
  data que destrava o relatório. Sem ela a plataforma não sobe de pé — e isso
  é proposital, porque a alternativa seria um prazo que a pessoa reinicia
  limpando os cookies.
- **`REDIS_URL` é opcional.** Serve só para o `?lid=` buscar o retrato
  completo do lead. Sem ela a entrada automática cai no cookie `upsell_lead`,
  que o funil grava em `.zaplens.online` e já traz telefone e nome.

`criado_em` tem DEFAULT e nenhum caminho de UPDATE no código toca nele — é a
âncora do prazo. O `INSERT ... ON CONFLICT (telefone) DO NOTHING` faz o papel
do antigo `SET NX`: com duas abas entrando ao mesmo tempo, a primeira cria e
a segunda relê, em vez de sobrescrever a âncora e o código.

Postgres não tem TTL, então a sessão guarda `expira_em`: a leitura filtra por
`expira_em > now()` e o login aproveita a ida ao banco para varrer as
vencidas.

---

## Configuração

```env
DATABASE_URL=...                 # obrigatório (Neon, connection string -pooler)
PERFECTPAY_CHAVE_URL=...         # obrigatório — segredo na URL do webhook
PERFECTPAY_PRODUTO_PRINCIPAL=... # código da oferta principal
PERFECTPAY_PRODUTO_UPSELL1=...   # código do upsell 1
PERFECTPAY_PRODUTO_UPSELL2=...   # código do upsell 2
RESEND_API_KEY=...               # opcional — sem ele a conta nasce, só não envia
EMAIL_REMETENTE=...              # remetente verificado no Resend
NEXT_PUBLIC_URL_APP=...          # base dos links do e-mail
REDIS_URL=...                    # opcional, só para o retrato do lead via ?lid=
NEXT_PUBLIC_URL_VENDAS=...       # destino de quem chega sem ter comprado
```

```bash
npm run db:init    # cria as tabelas e confere a conexão
```

Em produção, os segredos vão para o Worker:

```bash
npx wrangler secret put DATABASE_URL
npx wrangler secret put PERFECTPAY_CHAVE_URL
npx wrangler secret put RESEND_API_KEY     # opcional
npx wrangler secret put REDIS_URL          # opcional
```

---

## O conteúdo do relatório

Fica isolado em **`src/lib/conteudo-exemplo.ts`**, e só ali. Trocar o
relatório é trocar aquele objeto: o login, a sessão, o prazo, o cadeado e a
contagem continuam funcionando sem nenhuma alteração.

O que está lá hoje é conteúdo de exemplo, marcado como tal, para o sistema
poder ser testado de ponta a ponta antes de existir o material definitivo.

---

## Deploy

Mesmo padrão dos outros dois projetos:

```bash
npm run build              # next build + bundle do Worker
npm run deploy:cloudflare  # só publica
npm run deploy             # os dois
```

`build` é o build do Worker, não só o `next build` — é o que o Workers Builds
chama por padrão. O `next build` puro ficou em `build:next`, e
`open-next.config.ts` aponta para ele via `config.buildCommand` para não
entrar em recursão.

O Worker se chama `plataforma`, e `wrangler.jsonc` declara
`app.zaplens.online`. O subdomínio importa: é ele que mantém a plataforma sob
`.zaplens.online` e faz o cookie do funil chegar aqui.

---

## Rodar localmente sem código de acesso

Em produção a entrada exige telefone + código (ou o cookie do funil).
Rodando em **localhost** isso trava: banco vazio, nenhuma conta, e nenhum
código existe para digitar. Então, só localmente, a plataforma usa uma
**conta de demonstração** — `/` e `/relatorio` abrem direto, sem login e sem
`DATABASE_URL`:

```bash
npm run dev          # http://localhost:3002 → relatório, sem pedir nada
```

Quem decide é `src/lib/dev.ts`, e o portão tem duas trancas para o bypass não
escapar para produção:

| Contexto | Abre sem código? |
|---|---|
| `npm run dev` | sim, a não ser que `PLATAFORMA_ACESSO_LIVRE=0` |
| build de produção | só com `PLATAFORMA_ACESSO_LIVRE=1` **e** host local |
| `app.zaplens.online` | nunca — o host nunca é local |

Ou seja: mesmo que a variável vaze para o deploy, o domínio publicado
continua pedindo telefone e código.

Ajustes opcionais no `.env.local`:

```env
PLATAFORMA_ACESSO_LIVRE=0   # desliga e devolve a tela de entrada
PLATAFORMA_DEV_DIAS=8       # relatório inteiro aberto (ver seção abaixo)
PLATAFORMA_DEV_NOME=Maria   # nome exibido no relatório
```

O relatório mostra um aviso de "acesso livre de desenvolvimento" enquanto a
conta é a de demonstração, e o botão **Sair** é trocado por um selo `Local` —
não existe sessão para encerrar.

---

## Testar a liberação sem esperar 7 dias

Rodando localmente, basta `PLATAFORMA_DEV_DIAS=8` no `.env.local`: a conta de
demonstração nasce com `criadoEm` já no passado e o relatório aparece inteiro.

Com uma conta real, o prazo é medido a partir de `criado_em` — empurre a data
para trás com um UPDATE:

```sql
update plataforma_contas
   set criado_em = now() - interval '8 days'
 where telefone = '43999999999';
```

Ou mude `PRAZO_DIAS` para `0` em `src/lib/config.ts` enquanto desenvolve.
