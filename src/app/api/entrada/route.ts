import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/config";
import {
  contaPorAlvo,
  contaPorLid,
  criarSessao,
  normalizarTelefone,
} from "@/lib/conta";
import { bancoConfigurado } from "@/lib/db";
import { opcoesCookieSessao, pontePeloCookie } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entrada automática de quem acabou de pagar.
 *
 * MUDOU: esta rota não cria mais conta nenhuma. Antes ela criava — e por
 * isso qualquer pessoa que tivesse passado pelo funil, tendo pago ou não,
 * entrava na plataforma. Hoje quem cria conta é só o postback da PerfectPay
 * (src/app/api/perfectpay/route.ts), e aqui a gente apenas RECONHECE uma
 * conta que já foi paga.
 *
 * As duas pontes, da mais exata para a mais frágil:
 *
 *   1. ?lid= na URL ou no cookie → a conta gravada com aquele lid
 *   2. telefone do alvo no cookie → a conta paga mais recente daquele alvo
 *
 * Quem não casa com nenhuma das duas vai para a entrada manual. O caso mais
 * comum aí é o postback ainda não ter chegado: a tela de entrada explica e
 * o e-mail resolve.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const seguro = url.protocol === "https:";

  if (!bancoConfigurado()) {
    return NextResponse.redirect(new URL("/entrar?erro=config", url));
  }

  const ponte = await pontePeloCookie();
  const lid = (url.searchParams.get("lid") ?? ponte?.lid ?? "").trim();
  const alvo = normalizarTelefone(ponte?.telefone ?? "");

  try {
    const conta = (lid ? await contaPorLid(lid) : null) ??
      (alvo ? await contaPorAlvo(alvo) : null);

    if (!conta) {
      // Pode ser quem não comprou, ou quem comprou há 10 segundos e o
      // postback ainda não chegou. A tela de entrada trata os dois.
      return NextResponse.redirect(new URL("/entrar?origem=sem-dados", url));
    }

    const token = await criarSessao(conta.telefone);
    const destino = new URL("/relatorio", url);
    // `novo=1` mostra o código em destaque. Esta rota é o pouso pós-compra,
    // que é exatamente o momento de a pessoa anotá-lo; depois ele continua
    // no rodapé do relatório e no e-mail.
    destino.searchParams.set("novo", "1");

    const resposta = NextResponse.redirect(destino);
    resposta.cookies.set(COOKIE_SESSAO, token, opcoesCookieSessao(seguro));
    return resposta;
  } catch (erro) {
    console.error("[entrada] falha:", erro);
    return NextResponse.redirect(new URL("/entrar?erro=falha", url));
  }
}
