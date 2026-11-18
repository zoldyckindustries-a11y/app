// Leitura da sessão no servidor.
//
// Só leitura: gravar cookie não é permitido durante o render de um Server
// Component no Next 15. Quem grava são os route handlers em src/app/api.

import { cookies, headers } from "next/headers";
import { COOKIE_PONTE, COOKIE_SESSAO, SESSAO_DIAS } from "./config";
import { contaDaSessao, type Conta } from "./conta";
import { bancoConfigurado } from "./db";
import { CONTA_DEMO, acessoLivre } from "./dev";

/** O acesso livre local está valendo nesta requisição? */
async function livre(): Promise<boolean> {
  try {
    return acessoLivre((await headers()).get("host") ?? "");
  } catch {
    // Fora de uma requisição não há host; o modo de desenvolvimento decide.
    return acessoLivre();
  }
}

/**
 * Conta da sessão atual, ou null se não houver sessão válida.
 *
 * Rodando localmente com o acesso livre ligado (src/lib/dev.ts), uma sessão
 * ausente devolve a conta de demonstração em vez de null — é isso que faz o
 * relatório abrir em localhost sem telefone nem código. Uma sessão de
 * verdade, se existir, continua tendo preferência.
 */
export async function contaAtual(): Promise<Conta | null> {
  const token = bancoConfigurado()
    ? (await cookies()).get(COOKIE_SESSAO)?.value ?? ""
    : "";

  if (token) {
    try {
      const conta = await contaDaSessao(token);
      if (conta) return conta;
    } catch (erro) {
      console.error("[sessao] falha ao ler:", erro);
    }
  }

  return (await livre()) ? CONTA_DEMO : null;
}

/**
 * Dados deixados pelo funil no cookie de domínio raiz.
 *
 * O funil grava `upsell_lead` com `Domain=.zaplens.online`, então ele chega
 * aqui junto da requisição — dá para identificar a pessoa sem ela digitar
 * nada, mesmo vindo de outro subdomínio.
 */
export async function pontePeloCookie(): Promise<{
  lid: string;
  nome: string;
  telefone: string;
  cidade: string;
  estado: string;
} | null> {
  const bruto = (await cookies()).get(COOKIE_PONTE)?.value ?? "";
  if (!bruto) return null;
  try {
    // O funil grava encodeURIComponent(querystring); o navegador já devolve
    // o valor decodificado uma vez, então aqui basta interpretar a query.
    const p = new URLSearchParams(bruto);
    return {
      lid: (p.get("lid") ?? "").trim(),
      nome: (p.get("n") ?? "").trim(),
      telefone: (p.get("t") ?? "").trim(),
      cidade: (p.get("c") ?? "").trim(),
      estado: (p.get("uf") ?? "").trim(),
    };
  } catch {
    return null;
  }
}

/** Opções do cookie de sessão. Centralizado para os handlers não divergirem. */
export function opcoesCookieSessao(seguro: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: seguro,
    path: "/",
    maxAge: SESSAO_DIAS * 24 * 60 * 60,
  };
}
