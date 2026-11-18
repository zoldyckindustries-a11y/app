// O esquema do Postgres, em um arquivo só.
//
// Separado de db.ts de propósito: sem nenhum import, ele é lido tanto pela
// aplicação (`garantirEsquema`) quanto pelo `npm run db:init`, que roda em
// Node puro. Fonte única — um CREATE TABLE que divergisse entre os dois
// deixaria o banco diferente dependendo de quem chegou primeiro.
//
// Tudo é `if not exists`: rodar duas vezes não dói, e as colunas entram por
// ALTER para um banco que já tem contas não precisar ser recriado.

/**
 * A conta é do COMPRADOR, não do alvo.
 *
 * A chave é o telefone digitado no checkout da PerfectPay, porque é o único
 * identificador que sempre chega no postback — o `lid` do funil, que carrega
 * o alvo, pode não voltar. O alvo é assunto do dossiê (`nome`, `cidade`,
 * `estado`, `alvo_telefone`), não identidade.
 *
 * `criado_em` é a âncora do prazo de liberação: gravado uma única vez, nunca
 * reescrito. Por isso tem DEFAULT e nenhum caminho de UPDATE toca nele.
 *
 * `pago`, `upsell1` e `upsell2` são os portões. Quem não tem `pago` não
 * entra; quem não tem o upsell não recebe as seções daquele upsell. Antes do
 * postback não existia nenhum dos três — a plataforma abria para qualquer um
 * que tivesse passado pelo funil, e os upsells não entregavam nada.
 */
export const ESQUEMA: string[] = [
  `create table if not exists plataforma_contas (
     telefone  text        primary key,
     nome      text        not null default '',
     cidade    text        not null default '',
     estado    text        not null default '',
     codigo    text        not null,
     criado_em timestamptz not null default now()
   )`,
  `alter table plataforma_contas add column if not exists email         text    not null default ''`,
  `alter table plataforma_contas add column if not exists comprador     text    not null default ''`,
  `alter table plataforma_contas add column if not exists alvo_telefone text    not null default ''`,
  `alter table plataforma_contas add column if not exists pago          boolean not null default false`,
  `alter table plataforma_contas add column if not exists upsell1       boolean not null default false`,
  `alter table plataforma_contas add column if not exists upsell2       boolean not null default false`,
  `alter table plataforma_contas add column if not exists venda_code    text`,
  `alter table plataforma_contas add column if not exists lid           text`,
  `create index if not exists plataforma_contas_email_idx on plataforma_contas (email)`,
  `create index if not exists plataforma_contas_alvo_idx  on plataforma_contas (alvo_telefone)`,

  /* Sessões. Postgres não tem TTL, então guardam `expira_em`: a leitura
     filtra por `expira_em > now()` e o login varre as vencidas. */
  `create table if not exists plataforma_sessoes (
     token     text        primary key,
     telefone  text        not null references plataforma_contas(telefone) on delete cascade,
     criada_em timestamptz not null default now(),
     expira_em timestamptz not null
   )`,
  `create index if not exists plataforma_sessoes_telefone_idx
     on plataforma_sessoes (telefone)`,
  `create index if not exists plataforma_sessoes_expira_em_idx
     on plataforma_sessoes (expira_em)`,

  /* Link mágico do e-mail de entrega: um clique entra, sem digitar nada.
     Vale 30 dias e marca `usado_em` no primeiro uso — o código de 6 dígitos
     continua sendo o caminho permanente, para qualquer aparelho. */
  `create table if not exists plataforma_acessos (
     token     text        primary key,
     telefone  text        not null references plataforma_contas(telefone) on delete cascade,
     criado_em timestamptz not null default now(),
     expira_em timestamptz not null,
     usado_em  timestamptz
   )`,
  `create index if not exists plataforma_acessos_telefone_idx
     on plataforma_acessos (telefone)`,

  /* Registro cru dos postbacks.
     A PerfectPay manda tolerar entregas repetidas e avisa para NÃO
     deduplicar só por `code`, porque a mesma venda muda de status
     legitimamente. Daí a chave ser (code, status): a repetição é ignorada, a
     transição passa. Guardar o payload inteiro é o que permite reprocessar
     uma venda sem pedir nada para a PerfectPay — e é como se descobre o
     `product.code` de cada oferta na primeira venda real. */
  `create table if not exists plataforma_vendas (
     code         text        not null,
     status       integer     not null,
     telefone     text,
     email        text,
     produto_code text,
     recebido_em  timestamptz not null default now(),
     payload      jsonb       not null,
     primary key (code, status)
   )`,
  `create index if not exists plataforma_vendas_recebido_idx
     on plataforma_vendas (recebido_em desc)`,
  `create index if not exists plataforma_vendas_produto_idx
     on plataforma_vendas (produto_code)`,
];
