// Cria as tabelas no Postgres e mostra o que ficou.
//
//   npm run db:init
//
// A aplicação também cria o esquema sozinha no primeiro acesso
// (`garantirEsquema`, em src/lib/db.ts), então isto é conveniência: serve
// para preparar o banco antes do primeiro deploy e para conferir que a
// DATABASE_URL está certa sem precisar abrir o navegador.
//
// O esquema vem de src/lib/esquema.ts — mesmo arquivo que a aplicação usa,
// lido aqui direto em TypeScript (o Node 22.18+ remove os tipos sozinho).

import { neon } from "@neondatabase/serverless";
import { ESQUEMA } from "../src/lib/esquema.ts";

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error(
    "DATABASE_URL não configurada.\n" +
      "Rode com o .env.local:  node --env-file=.env.local scripts/db-init.mjs\n" +
      "(é o que `npm run db:init` faz)"
  );
  process.exit(1);
}

const sql = neon(url);

const [{ db, host }] = await sql`
  select current_database() as db, inet_server_addr()::text as host`;
console.log(`banco: ${db}${host ? ` (${host})` : ""}`);

for (const ddl of ESQUEMA) {
  const nome = ddl.match(/exists\s+(\S+)/)?.[1] ?? "?";
  await sql.query(ddl);
  console.log(`  ok  ${nome}`);
}

const tabelas = await sql`
  select table_name,
         (select count(*) from information_schema.columns c
           where c.table_name = t.table_name
             and c.table_schema = 'public') as colunas
    from information_schema.tables t
   where table_schema = 'public'
     and table_name like 'plataforma_%'
   order by table_name`;

console.log("\ntabelas da plataforma:");
for (const t of tabelas) console.log(`  ${t.table_name} (${t.colunas} colunas)`);

const [{ n }] = await sql`select count(*)::int as n from plataforma_contas`;
console.log(`\ncontas cadastradas: ${n}`);
