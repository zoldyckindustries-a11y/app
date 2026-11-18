import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/config";
import { criarSessao, lerConta, normalizarTelefone } from "@/lib/conta";
import { bancoConfigurado } from "@/lib/db";
import { opcoesCookieSessao } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Entrada manual: telefone + código de acesso. */
export async function POST(req: Request) {
  if (!bancoConfigurado()) {
    return NextResponse.json(
      { erro: "A plataforma está sem configuração de banco. Avise o suporte." },
      { status: 503 }
    );
  }

  let corpo: { telefone?: string; codigo?: string };
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  const telefone = normalizarTelefone(corpo.telefone ?? "");
  const codigo = (corpo.codigo ?? "").replace(/\D/g, "");

  if (!telefone) {
    return NextResponse.json(
      { erro: "Digite o telefone com DDD, do jeito que você informou na consulta." },
      { status: 400 }
    );
  }
  if (codigo.length !== 6) {
    return NextResponse.json(
      { erro: "O código de acesso tem 6 dígitos." },
      { status: 400 }
    );
  }

  try {
    const conta = await lerConta(telefone);
    // Mensagem única para telefone inexistente, código errado e conta sem
    // pagamento aprovado: dizer qual dos três falhou entregaria quais
    // números têm conta aqui, e se aquela venda foi aprovada.
    if (!conta || conta.codigo !== codigo || !conta.pago) {
      return NextResponse.json(
        { erro: "Telefone ou código não confere." },
        { status: 401 }
      );
    }

    const token = await criarSessao(conta.telefone);
    const seguro = new URL(req.url).protocol === "https:";
    const resposta = NextResponse.json({ ok: true });
    resposta.cookies.set(COOKIE_SESSAO, token, opcoesCookieSessao(seguro));
    return resposta;
  } catch (erro) {
    console.error("[entrar] falha:", erro);
    return NextResponse.json(
      { erro: "Não consegui validar agora. Tente de novo em instantes." },
      { status: 500 }
    );
  }
}
