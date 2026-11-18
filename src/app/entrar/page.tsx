import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import FormularioEntrada from "@/components/FormularioEntrada";
import { URL_VENDAS } from "@/lib/config";
import { contaAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

const AVISOS: Record<string, string> = {
  // Dois casos caem aqui, e a mensagem precisa servir aos dois: quem comprou
  // há poucos segundos (a confirmação da PerfectPay ainda não chegou) e quem
  // abriu em outro aparelho. Por isso ela aponta o e-mail, que resolve os
  // dois sem passar pelo suporte.
  "sem-dados":
    "Não consegui identificar você automaticamente. Se você acabou de comprar, o acesso chega no e-mail do pagamento em alguns minutos — ou entre abaixo com o telefone da compra.",
  "link-expirado":
    "Esse link de acesso expirou. Entre com o telefone da compra e o seu código de 6 dígitos.",
};

const ERROS: Record<string, string> = {
  config: "A plataforma está sem configuração de banco. Avise o suporte.",
  falha: "Algo falhou ao abrir seu acesso. Tente entrar manualmente.",
};

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await contaAtual()) redirect("/relatorio");

  const params = await searchParams;
  const texto = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const aviso = AVISOS[texto(params.origem) ?? ""] ?? "";
  const erro = ERROS[texto(params.erro) ?? ""] ?? "";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[26rem] flex-col justify-center px-4 py-10">
      <div className="animate-subir">
        <div className="mb-6 flex items-center gap-2 text-acento">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[13px] font-semibold uppercase tracking-wider">
            Detective White
          </span>
        </div>

        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          Entrar no seu relatório
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-texto-mute">
          Use o telefone que você informou no pagamento e o código de 6 dígitos
          que enviamos no seu e-mail.
        </p>

        {erro ? (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] leading-snug text-red-300">
            {erro}
          </p>
        ) : null}
        {aviso && !erro ? (
          <p className="mt-5 rounded-xl border border-acento/25 bg-acento/10 px-4 py-3 text-[13px] leading-snug text-acento-soft">
            {aviso}
          </p>
        ) : null}

        <FormularioEntrada />

        <p className="mt-8 text-[12px] leading-relaxed text-texto-dim">
          Perdeu o código? Ele está no e-mail de liberação do relatório. Se não
          achar, fale com o suporte pelo mesmo canal da compra.
        </p>

        <Link
          href={URL_VENDAS}
          className="mt-3 inline-block text-[12px] text-texto-dim underline underline-offset-4 hover:text-texto-mute"
        >
          Ainda não fez a consulta
        </Link>
      </div>
    </main>
  );
}
