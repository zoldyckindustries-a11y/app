// Contas, sessões e liberações de acesso.
//
// A conta é do COMPRADOR e nasce do postback da PerfectPay, não da visita.
// Antes, qualquer pessoa que tivesse passado pelo funil criava conta sozinha
// ao abrir a plataforma — tendo pago ou não. Hoje a criação acontece em um
// lugar só (src/app/api/perfectpay/route.ts) e `pago` é o portão.
//
// O campo que importa mais continua sendo `criadoEm`: é a âncora do prazo de
// liberação, e por isso ele nunca é reescrito depois.

import { randomUUID } from "node:crypto";
import { LEAD_KEY_PREFIX, SESSAO_DIAS } from "./config";
import { db, paraEpochMs } from "./db";
import { conectar as conectarRedis, redisConfigurado } from "./redis";

export interface Conta {
  /** Telefone do comprador, só dígitos. É a chave da conta e o login. */
  telefone: string;
  /** E-mail do comprador, vindo do checkout. Destino do acesso. */
  email: string;
  /** Nome do comprador, como está na PerfectPay. */
  comprador: string;

  /** Nome do ALVO, como o lead digitou no funil. Assunto do dossiê. */
  nome: string;
  cidade: string;
  estado: string;
  /** Telefone do ALVO — o número consultado, exibido no dossiê. */
  alvoTelefone: string;

  /** Código de acesso de 6 dígitos, mostrado na primeira entrada. */
  codigo: string;
  /** Epoch ms da PRIMEIRA entrada. Âncora do prazo — nunca é reescrito. */
  criadoEm: number;

  /** Venda principal aprovada. Sem isto, nenhuma porta abre. */
  pago: boolean;
  /** Comprou o upsell 1 (perfis em apps de relacionamento). */
  upsell1: boolean;
  /** Comprou o upsell 2. */
  upsell2: boolean;

  /**
   * true só na conta de demonstração do acesso livre local (src/lib/dev.ts).
   * Nunca é gravada no banco — serve para a página avisar que aquilo não é
   * uma conta de verdade.
   */
  demo?: boolean;
}

export function apenasDigitos(valor: string): string {
  return (valor ?? "").replace(/\D/g, "");
}

/**
 * Telefone válido para servir de chave: 10 ou 11 dígitos (fixo ou celular
 * com DDD), aceitando o 55 na frente.
 */
export function normalizarTelefone(bruto: string): string {
  let d = apenasDigitos(bruto);
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.length === 10 || d.length === 11 ? d : "";
}

/** Código de 6 dígitos, aleatório de verdade (não Math.random). */
export function gerarCodigo(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = new DataView(bytes.buffer).getUint32(0) % 1_000_000;
  return String(n).padStart(6, "0");
}

/** Uma linha de `plataforma_contas` virando `Conta`. */
function paraConta(linha: Record<string, unknown>): Conta | null {
  const criadoEm = paraEpochMs(linha.criado_em_ms);
  // criado_em corrompido destravaria o relatório antes da hora.
  if (!Number.isFinite(criadoEm)) return null;
  return {
    telefone: String(linha.telefone ?? ""),
    email: String(linha.email ?? ""),
    comprador: String(linha.comprador ?? ""),
    nome: String(linha.nome ?? ""),
    cidade: String(linha.cidade ?? ""),
    estado: String(linha.estado ?? ""),
    alvoTelefone: String(linha.alvo_telefone ?? ""),
    codigo: String(linha.codigo ?? ""),
    criadoEm,
    pago: linha.pago === true,
    upsell1: linha.upsell1 === true,
    upsell2: linha.upsell2 === true,
  };
}

/** Colunas que `paraConta` espera. Em um lugar só para não divergirem. */
const COLUNAS = `telefone, email, comprador, nome, cidade, estado,
  alvo_telefone, codigo, pago, upsell1, upsell2,
  (extract(epoch from criado_em) * 1000)::bigint as criado_em_ms`;

export async function lerConta(telefone: string): Promise<Conta | null> {
  const tel = normalizarTelefone(telefone);
  if (!tel) return null;
  const sql = await db();
  const linhas = await sql.query(
    `select ${COLUNAS} from plataforma_contas where telefone = $1`,
    [tel]
  );
  const linha = linhas[0];
  return linha ? paraConta(linha) : null;
}

/** Conta pelo `lid` do funil — usada pela entrada automática pós-compra. */
export async function contaPorLid(lid: string): Promise<Conta | null> {
  const id = (lid ?? "").trim();
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return null;
  const sql = await db();
  const linhas = await sql.query(
    `select ${COLUNAS} from plataforma_contas
      where lid = $1 and pago = true
      order by criado_em desc limit 1`,
    [id]
  );
  const linha = linhas[0];
  return linha ? paraConta(linha) : null;
}

/**
 * Conta pelo telefone do ALVO, para a entrada automática pelo cookie.
 *
 * O cookie do funil só conhece o alvo; a conta é indexada pelo comprador.
 * Esta é a ponte entre os dois. Se o mesmo número foi consultado por duas
 * pessoas, devolve a conta paga mais recente — e é por isso que o `lid` é
 * tentado antes: ele é exato.
 */
export async function contaPorAlvo(telefone: string): Promise<Conta | null> {
  const tel = normalizarTelefone(telefone);
  if (!tel) return null;
  const sql = await db();
  const linhas = await sql.query(
    `select ${COLUNAS} from plataforma_contas
      where alvo_telefone = $1 and pago = true
      order by criado_em desc limit 1`,
    [tel]
  );
  const linha = linhas[0];
  return linha ? paraConta(linha) : null;
}

/* ─────────────────────── criação pelo postback ──────────────────────── */

export interface DadosVenda {
  /** Telefone do comprador — a chave. */
  telefone: string;
  email?: string;
  comprador?: string;
  /** Dados do alvo, quando o `lid` do funil chegou junto. */
  alvoNome?: string;
  alvoTelefone?: string;
  cidade?: string;
  estado?: string;
  lid?: string;
  vendaCode?: string;
  /** Qual oferta foi aprovada. */
  principal?: boolean;
  upsell1?: boolean;
  upsell2?: boolean;
}

/**
 * Cria ou atualiza a conta a partir de uma venda aprovada.
 *
 * As três flags são aditivas: o upsell chega em um postback separado, depois
 * do principal, e não pode apagar o que já estava lá. `criado_em`, o código
 * e os dados do alvo também nunca são sobrescritos por um postback
 * posterior — senão a compra do upsell reiniciaria o prazo de 7 dias.
 */
export async function registrarVenda(
  dados: DadosVenda
): Promise<{ conta: Conta; nova: boolean } | null> {
  const tel = normalizarTelefone(dados.telefone);
  if (!tel) return null;

  const sql = await db();
  const existente = await lerConta(tel);

  if (!existente) {
    const criadas = await sql.query(
      `insert into plataforma_contas
         (telefone, email, comprador, nome, cidade, estado, alvo_telefone,
          codigo, pago, upsell1, upsell2, venda_code, lid)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (telefone) do nothing
       returning ${COLUNAS}`,
      [
        tel,
        (dados.email ?? "").trim().toLowerCase(),
        (dados.comprador ?? "").trim(),
        (dados.alvoNome ?? "").trim(),
        (dados.cidade ?? "").trim(),
        (dados.estado ?? "").trim(),
        normalizarTelefone(dados.alvoTelefone ?? ""),
        gerarCodigo(),
        dados.principal === true,
        dados.upsell1 === true,
        dados.upsell2 === true,
        dados.vendaCode ?? null,
        dados.lid ?? null,
      ]
    );
    if (criadas[0]) {
      const conta = paraConta(criadas[0]);
      if (conta) return { conta, nova: true };
    }
  }

  // Já existia (ou duas entregas chegaram juntas). Soma o que veio: flags
  // com OR, campos de texto só se estiverem vazios.
  const atualizadas = await sql.query(
    `update plataforma_contas set
       email         = case when email         = '' then $2 else email         end,
       comprador     = case when comprador     = '' then $3 else comprador     end,
       nome          = case when nome          = '' then $4 else nome          end,
       cidade        = case when cidade        = '' then $5 else cidade        end,
       estado        = case when estado        = '' then $6 else estado        end,
       alvo_telefone = case when alvo_telefone = '' then $7 else alvo_telefone end,
       lid           = coalesce(lid, $8),
       venda_code    = coalesce(venda_code, $9),
       pago    = pago    or $10,
       upsell1 = upsell1 or $11,
       upsell2 = upsell2 or $12
     where telefone = $1
     returning ${COLUNAS}`,
    [
      tel,
      (dados.email ?? "").trim().toLowerCase(),
      (dados.comprador ?? "").trim(),
      (dados.alvoNome ?? "").trim(),
      (dados.cidade ?? "").trim(),
      (dados.estado ?? "").trim(),
      normalizarTelefone(dados.alvoTelefone ?? ""),
      dados.lid ?? null,
      dados.vendaCode ?? null,
      dados.principal === true,
      dados.upsell1 === true,
      dados.upsell2 === true,
    ]
  );

  const linha = atualizadas[0];
  if (!linha) return null;
  const conta = paraConta(linha);
  return conta ? { conta, nova: false } : null;
}

/**
 * Tira o acesso de uma venda estornada, devolvida ou com chargeback.
 *
 * Só derruba o que aquela venda pagou: um estorno do upsell não pode fechar
 * o relatório principal.
 */
export async function revogarVenda(
  telefone: string,
  alvo: "principal" | "upsell1" | "upsell2"
): Promise<void> {
  const tel = normalizarTelefone(telefone);
  if (!tel) return;
  const coluna =
    alvo === "principal" ? "pago" : alvo === "upsell1" ? "upsell1" : "upsell2";
  const sql = await db();
  await sql.query(
    `update plataforma_contas set ${coluna} = false where telefone = $1`,
    [tel]
  );
  // Fechar o acesso sem encerrar as sessões abertas seria teatro.
  if (alvo === "principal") {
    await sql.query(`delete from plataforma_sessoes where telefone = $1`, [tel]);
  }
}

/* ───────────────────────── registro de venda ────────────────────────── */

/**
 * Guarda o postback cru e diz se ele é novo.
 *
 * A PerfectPay reentrega o mesmo evento, então a chave é (code, status):
 * repetição devolve `false` e o processamento para ali; uma transição de
 * status da mesma venda é um registro novo e segue.
 */
export async function registrarPostback(dados: {
  code: string;
  status: number;
  telefone?: string;
  email?: string;
  produtoCode?: string;
  payload: unknown;
}): Promise<boolean> {
  const sql = await db();
  const linhas = await sql.query(
    `insert into plataforma_vendas
       (code, status, telefone, email, produto_code, payload)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (code, status) do nothing
     returning code`,
    [
      dados.code,
      dados.status,
      dados.telefone ?? null,
      dados.email ?? null,
      dados.produtoCode ?? null,
      JSON.stringify(dados.payload ?? {}),
    ]
  );
  return linhas.length > 0;
}

/* ───────────────────────────── sessões ──────────────────────────────── */

export async function criarSessao(telefone: string): Promise<string> {
  const tel = normalizarTelefone(telefone);
  if (!tel) throw new Error("telefone inválido");
  const token = randomUUID().replace(/-/g, "");
  const sql = await db();
  await sql.query(
    `insert into plataforma_sessoes (token, telefone, expira_em)
     values ($1, $2, now() + ($3 || ' days')::interval)`,
    [token, tel, String(SESSAO_DIAS)]
  );
  // Postgres não tem TTL. O login é raro e já está pagando uma ida ao banco,
  // então é o lugar certo para varrer o que venceu.
  sql
    .query(`delete from plataforma_sessoes where expira_em < now()`)
    .catch((erro) => console.error("[sessao] limpeza falhou:", erro));
  return token;
}

export async function contaDaSessao(token: string): Promise<Conta | null> {
  const limpo = (token ?? "").trim();
  if (!/^[a-f0-9]{32}$/.test(limpo)) return null;
  const sql = await db();
  const linhas = await sql.query(
    `select ${COLUNAS}
       from plataforma_sessoes s
       join plataforma_contas c using (telefone)
      where s.token = $1 and s.expira_em > now() and c.pago = true`,
    [limpo]
  );
  const linha = linhas[0];
  return linha ? paraConta(linha) : null;
}

export async function encerrarSessao(token: string): Promise<void> {
  const limpo = (token ?? "").trim();
  if (!/^[a-f0-9]{32}$/.test(limpo)) return;
  const sql = await db();
  await sql.query(`delete from plataforma_sessoes where token = $1`, [limpo]);
}

/* ──────────────────────── link mágico do e-mail ─────────────────────── */

/** Cria o token do link de acesso enviado por e-mail. Vale 30 dias. */
export async function criarLinkAcesso(telefone: string): Promise<string> {
  const tel = normalizarTelefone(telefone);
  if (!tel) throw new Error("telefone inválido");
  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const sql = await db();
  await sql.query(
    `insert into plataforma_acessos (token, telefone, expira_em)
     values ($1, $2, now() + interval '30 days')`,
    [token, tel]
  );
  return token;
}

/**
 * Troca o token do link por uma conta.
 *
 * Marca `usado_em` no primeiro uso, mas continua aceitando até expirar: o
 * mesmo e-mail é reaberto em outro aparelho o tempo todo, e invalidar no
 * primeiro clique transformaria o link de entrega em link de saída.
 */
export async function contaPorLinkAcesso(token: string): Promise<Conta | null> {
  const limpo = (token ?? "").trim();
  if (!/^[a-f0-9]{64}$/.test(limpo)) return null;
  const sql = await db();
  const linhas = await sql.query(
    `update plataforma_acessos
        set usado_em = coalesce(usado_em, now())
      where token = $1 and expira_em > now()
      returning telefone`,
    [limpo]
  );
  const tel = linhas[0]?.telefone;
  if (!tel) return null;
  const conta = await lerConta(String(tel));
  return conta?.pago ? conta : null;
}

/* ─────────────────── retrato deixado pelo funil ─────────────────────── */

export interface RetratoLead {
  nome: string;
  telefone: string;
  cidade: string;
  estado: string;
}

/**
 * Lê o retrato que o funil gravou sob `upsell:lead:<lid>`.
 *
 * Continua no Redis porque quem escreve é o funil, outro projeto. É só
 * leitura, é opcional e tem TTL de 6 horas lá — o que cobre a janela entre o
 * checkout e o postback, que é quando isto é consultado.
 */
export async function retratoPorLid(lid: string): Promise<RetratoLead | null> {
  const id = (lid ?? "").trim();
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) return null;
  if (!redisConfigurado()) return null;
  try {
    const redis = await conectarRedis();
    const bruto = await redis.get(`${LEAD_KEY_PREFIX}${id}`);
    if (!bruto) return null;
    const d = JSON.parse(bruto);
    return {
      nome: String(d?.nome ?? ""),
      telefone: String(d?.telefone ?? ""),
      cidade: String(d?.cidade ?? ""),
      estado: String(d?.estado ?? ""),
    };
  } catch {
    return null;
  }
}
