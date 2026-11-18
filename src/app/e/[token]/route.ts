import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/config";
import { contaPorLinkAcesso, criarSessao } from "@/lib/conta";
import { bancoConfigurado } from "@/lib/db";
import { opcoesCookieSessao } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Link mágico do e-mail de entrega: `/e/<token>`.
 *
 * Um clique e a pessoa está dentro, de qualquer aparelho — é o que resolve o
 * beco sem saída de quem compra no celular e abre o e-mail no computador,
 * onde o cookie do funil não existe.
 *
 * É um route handler, e não uma página, porque só aqui dá para gravar o
 * cookie de sessão no Next 15.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const url = new URL(req.url);
  if (!bancoConfigurado()) {
    return NextResponse.redirect(new URL("/entrar?erro=config", url));
  }

  const { token } = await params;

  try {
    const conta = await contaPorLinkAcesso(token);
    if (!conta) {
      // Link expirado, já inválido ou de uma conta sem pagamento aprovado.
      return NextResponse.redirect(new URL("/entrar?origem=link-expirado", url));
    }

    const sessao = await criarSessao(conta.telefone);
    const resposta = NextResponse.redirect(new URL("/relatorio", url));
    resposta.cookies.set(
      COOKIE_SESSAO,
      sessao,
      opcoesCookieSessao(url.protocol === "https:")
    );
    return resposta;
  } catch (erro) {
    console.error("[link-acesso] falha:", erro);
    return NextResponse.redirect(new URL("/entrar?erro=falha", url));
  }
}
