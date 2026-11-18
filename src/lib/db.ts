// Conexão com o Postgres (Neon).
//
// Aqui moram as contas e as sessões desta plataforma — e, o que mais importa,
// a data de entrada que destrava o relatório. Sem banco a plataforma não tem
// como saber quem é a pessoa nem há quantos dias ela entrou, então a falha é
// explícita, não silenciosa.
//
// O driver é o `@neondatabase/serverless`, não o `pg`: a plataforma roda em
// Cloudflare Workers (`npm run deploy`), onde não existe socket TCP para o
// `pg` usar. O driver do Neon fala HTTP, funciona igual no `next dev` e no
// Worker, e por ser stateless não deixa conexão pendurada entre requisições
// — que é o que estouraria o limite do pooler.

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { ESQUEMA } from "./esquema";

const DATABASE_URL = process.env.DATABASE_URL ?? "";

export class SemBanco extends Error {
  constructor() {
    super("DATABASE_URL não configurada");
    this.name = "SemBanco";
  }
}

export function bancoConfigurado(): boolean {
  return Boolean(DATABASE_URL);
}

let cliente: NeonQueryFunction<false, false> | null = null;

/** O `sql` tagged template. Cada chamada é uma requisição HTTP ao Neon. */
export function conectar(): NeonQueryFunction<false, false> {
  if (!DATABASE_URL) throw new SemBanco();
  if (!cliente) cliente = neon(DATABASE_URL);
  return cliente;
}

/* ───────────────────────────── esquema ──────────────────────────────── */

let esquemaPronto: Promise<void> | null = null;

/**
 * Cria as tabelas se faltarem, uma vez por processo.
 *
 * O resultado fica em cache como Promise para duas requisições simultâneas
 * não dispararem o DDL em paralelo. Em caso de erro o cache é limpo, senão
 * uma falha de rede no primeiro acesso condenaria o processo inteiro.
 *
 * `npm run db:init` faz o mesmo pela linha de comando, para quem prefere
 * preparar o banco antes de subir a aplicação.
 */
export async function garantirEsquema(): Promise<void> {
  if (!esquemaPronto) {
    const sql = conectar();
    esquemaPronto = (async () => {
      for (const ddl of ESQUEMA) await sql.query(ddl);
    })().catch((erro) => {
      esquemaPronto = null;
      throw erro;
    });
  }
  return esquemaPronto;
}

/** `sql` já com as tabelas garantidas. É o que o resto do código usa. */
export async function db(): Promise<NeonQueryFunction<false, false>> {
  const sql = conectar();
  await garantirEsquema();
  return sql;
}

/** Epoch ms a partir de um `timestamptz` lido como texto/Date/número. */
export function paraEpochMs(valor: unknown): number {
  if (typeof valor === "number") return valor;
  if (valor instanceof Date) return valor.getTime();
  const n = Number(valor);
  if (Number.isFinite(n)) return n;
  const t = Date.parse(String(valor));
  return Number.isFinite(t) ? t : NaN;
}


