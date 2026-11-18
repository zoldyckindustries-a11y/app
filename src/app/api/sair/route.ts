import { NextResponse } from "next/server";
import { COOKIE_SESSAO } from "@/lib/config";
import { encerrarSessao } from "@/lib/conta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const token = req.headers
    .get("cookie")
    ?.split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${COOKIE_SESSAO}=`))
    ?.slice(COOKIE_SESSAO.length + 1);

  if (token) {
    try {
      await encerrarSessao(decodeURIComponent(token));
    } catch (erro) {
      // A sessão some do navegador de qualquer jeito logo abaixo.
      console.error("[sair] falha ao apagar a sessão:", erro);
    }
  }

  const resposta = NextResponse.redirect(new URL("/entrar", url), 303);
  resposta.cookies.set(COOKIE_SESSAO, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 0,
  });
  return resposta;
}
