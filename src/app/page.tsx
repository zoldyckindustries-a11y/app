import { redirect } from "next/navigation";
import { contaAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

/**
 * Porta de entrada. É para cá que a plataforma de pagamento redireciona.
 *
 * A página em si não decide nada além de para onde mandar: quem tem sessão
 * vai para o relatório, quem não tem passa pelo /api/entrada, que é onde o
 * cookie pode ser gravado (Server Component não grava cookie).
 */
export default async function Entrada({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const conta = await contaAtual();
  if (conta) redirect("/relatorio");

  const params = await searchParams;
  const lidBruto = params.lid;
  const lid = Array.isArray(lidBruto) ? lidBruto[0] : lidBruto;

  redirect(lid ? `/api/entrada?lid=${encodeURIComponent(lid)}` : "/api/entrada");
}
