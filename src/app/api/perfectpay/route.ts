import { NextResponse } from "next/server";
import {
  criarLinkAcesso,
  registrarPostback,
  registrarVenda,
  retratoPorLid,
  revogarVenda,
} from "@/lib/conta";
import { bancoConfigurado } from "@/lib/db";
import { enviarAcesso } from "@/lib/email";
import {
  APROVADO,
  PERDEU_ACESSO,
  identificarOferta,
  lidDoPayload,
  telefoneDoComprador,
  type PayloadPerfectPay,
} from "@/lib/perfectpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Postback da PerfectPay. É aqui que a conta nasce.
 *
 * Registrar em: Ferramentas > Webhook - Vendas, formato "PerfectPay", com a
 * URL abaixo e os eventos de aprovação, cancelamento, estorno e chargeback.
 *
 *   https://app.zaplens.online/api/perfectpay?k=<PERFECTPAY_CHAVE_URL>
 *
 * Sobre a autenticação: a própria doc diz que o `token` do payload é um
 * identificador estático e NÃO autentica o envio. Existe um
 * `X-Webhook-Signature` para isso, mas a doc pública não traz o algoritmo —
 * então a defesa principal aqui é a chave na URL, que é um segredo que só a
 * PerfectPay e nós conhecemos, e o token confere como segunda camada. Quando
 * o algoritmo da assinatura for confirmado, ele entra como terceira.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);

  // 1. Portão. Um postback que aceita qualquer POST é um criador de contas
  //    pagas para a internet, então pelo menos um dos dois segredos precisa
  //    estar configurado — e os dois são exigidos quando existem.
  //
  //    A chave na URL é a defesa preferida. O Public token serve de reserva
  //    porque é único da conta (o painel diz isso), mas a própria doc avisa
  //    que ele é um identificador estático e não autentica o envio: quem
  //    souber o token consegue forjar um postback. Por isso a chave na URL
  //    existe, e é ela que deve estar no ar.
  const chave = process.env.PERFECTPAY_CHAVE_URL ?? "";
  const esperado = process.env.PERFECTPAY_TOKEN ?? "";

  if (!chave && !esperado) {
    console.error(
      "[perfectpay] configure PERFECTPAY_CHAVE_URL (preferido) ou PERFECTPAY_TOKEN"
    );
    return NextResponse.json({ erro: "indisponível" }, { status: 503 });
  }
  if (chave && url.searchParams.get("k") !== chave) {
    console.warn("[perfectpay] chave de URL inválida");
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  if (!bancoConfigurado()) {
    // 503 sem corpo útil: a PerfectPay reentrega, e é isso que queremos.
    return NextResponse.json({ erro: "sem banco" }, { status: 503 });
  }

  let p: PayloadPerfectPay;
  try {
    p = (await req.json()) as PayloadPerfectPay;
  } catch {
    return NextResponse.json({ erro: "payload inválido" }, { status: 400 });
  }

  if (esperado && (p.token ?? "") !== esperado) {
    console.warn("[perfectpay] token do payload não confere");
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }

  const code = (p.code ?? "").trim();
  const status = Number(p.sale_status_enum);
  if (!code || !Number.isFinite(status)) {
    return NextResponse.json({ erro: "venda sem code ou status" }, { status: 400 });
  }

  const telefone = telefoneDoComprador(p);
  const email = (p.customer?.email ?? "").trim().toLowerCase();
  const oferta = identificarOferta(p);
  const produtoCode = (p.product?.code ?? p.plan?.code ?? "").trim();

  try {
    // 2. Idempotência. A doc manda tolerar entregas repetidas e avisa para
    //    não deduplicar só por `code` — a chave é (code, status).
    const novo = await registrarPostback({
      code,
      status,
      telefone,
      email,
      produtoCode,
      payload: p,
    });
    if (!novo) {
      return NextResponse.json({ ok: true, repetido: true });
    }

    if (!telefone) {
      // Sem telefone não há chave de conta. Fica registrado em
      // plataforma_vendas para liberação manual (npm run liberar).
      console.error("[perfectpay] venda sem telefone utilizável:", code);
      return NextResponse.json({ ok: true, aviso: "sem telefone" });
    }

    // 3. Estorno, cancelamento, chargeback: tira o acesso daquela oferta.
    if (PERDEU_ACESSO.has(status)) {
      if (oferta !== "desconhecida") await revogarVenda(telefone, oferta);
      return NextResponse.json({ ok: true, revogado: oferta });
    }

    if (status !== APROVADO) {
      // Pendente, em processamento, rejeitado: nada a fazer ainda.
      return NextResponse.json({ ok: true, ignorado: status });
    }

    if (oferta === "desconhecida") {
      // Não inventa acesso. O payload está salvo: dá para ler o product.code
      // em plataforma_vendas e configurar a variável de ambiente certa.
      console.error(
        `[perfectpay] produto não mapeado (code=${produtoCode}) — ` +
          "configure PERFECTPAY_PRODUTO_PRINCIPAL/UPSELL1/UPSELL2"
      );
      return NextResponse.json({ ok: true, aviso: "produto não mapeado" });
    }

    // 4. O retrato do alvo, quando o lid voltou. Best-effort: a conta não
    //    pode deixar de ser criada porque o Redis do funil não respondeu.
    const lid = lidDoPayload(p);
    const retrato = lid ? await retratoPorLid(lid) : null;

    const resultado = await registrarVenda({
      telefone,
      email,
      comprador: p.customer?.full_name ?? "",
      alvoNome: retrato?.nome,
      alvoTelefone: retrato?.telefone,
      cidade: retrato?.cidade,
      estado: retrato?.estado,
      lid: lid || undefined,
      vendaCode: code,
      principal: oferta === "principal",
      upsell1: oferta === "upsell1",
      upsell2: oferta === "upsell2",
    });

    if (!resultado) {
      console.error("[perfectpay] não consegui gravar a conta:", code);
      return NextResponse.json({ erro: "falha ao gravar" }, { status: 500 });
    }

    // 5. Entrega. Só no primeiro acesso liberado: o upsell que chega depois
    //    não precisa reenviar as credenciais, a pessoa já está dentro.
    if (resultado.nova && resultado.conta.pago && email) {
      try {
        const token = await criarLinkAcesso(resultado.conta.telefone);
        await enviarAcesso({
          email,
          nome: resultado.conta.comprador,
          codigo: resultado.conta.codigo,
          token,
          origem: url.origin,
        });
      } catch (erro) {
        // O e-mail falhar não pode devolver erro: a PerfectPay reentregaria
        // e a conta seria reprocessada. O acesso já existe; o redirect e o
        // suporte cobrem o resto.
        console.error("[perfectpay] e-mail de acesso falhou:", erro);
      }
    }

    return NextResponse.json({ ok: true, oferta, nova: resultado.nova });
  } catch (erro) {
    console.error("[perfectpay] falha:", erro);
    // 500 faz a PerfectPay reentregar, que é o comportamento desejado.
    return NextResponse.json({ erro: "falha interna" }, { status: 500 });
  }
}

/** Ping para conferir que a rota está de pé sem disparar uma venda falsa. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    rota: "perfectpay",
    configurado: Boolean(process.env.PERFECTPAY_CHAVE_URL),
  });
}
