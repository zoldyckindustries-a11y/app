// Conexão com o Redis do funil. OPCIONAL.
//
// Contas, sessões e a data de entrada moram no Postgres (src/lib/db.ts).
// O Redis sobrou para uma única coisa: ler o retrato que o funil gravou em
// `upsell:lead:<lid>`. Quem escreve ali é outro projeto
// (`pelezikafunilwpp-main`), que usa Redis — esta plataforma só lê.
//
// Por isso, sem `REDIS_URL` nada aqui quebra: a entrada automática cai no
// cookie `upsell_lead`, que o funil grava em `.zaplens.online` e já traz
// telefone e nome. O que não funciona sem banco é o Postgres.

import { createClient, type RedisClientType } from "redis";

const REDIS_URL = process.env.REDIS_URL ?? "";

let cliente: RedisClientType | null = null;

export class SemRedis extends Error {
  constructor() {
    super("REDIS_URL não configurada");
    this.name = "SemRedis";
  }
}

export function redisConfigurado(): boolean {
  return Boolean(REDIS_URL);
}

export async function conectar(): Promise<RedisClientType> {
  if (!REDIS_URL) throw new SemRedis();
  if (!cliente) {
    cliente = createClient({ url: REDIS_URL });
    cliente.on("error", (err) => console.error("[Redis] erro:", err));
  }
  if (!cliente.isOpen) await cliente.connect();
  return cliente;
}
