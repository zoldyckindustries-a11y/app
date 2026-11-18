import { redirect } from "next/navigation";
import {
  CheckCircle2,
  KeyRound,
  Lock,
  LogOut,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import Contagem from "@/components/Contagem";
import Secoes from "@/components/Secoes";
import { montarRelatorio, type Totais } from "@/lib/relatorio";
import { contaAtual } from "@/lib/sessao";

export const dynamic = "force-dynamic";

function primeiroNome(nome: string): string {
  const parte = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  if (!parte) return "";
  return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
}

/**
 * (43) 99839-2579.
 *
 * O número aparece inteiro, não mascarado: ele é o assunto do dossiê — foi o
 * que a pessoa digitou na consulta e é o que ela viu na oferta. Esconder
 * justamente o dado que identifica o relatório faz a tela parecer uma
 * amostra, não o material dela.
 */
function formatarTelefone(digitos: string): string {
  const d = (digitos ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

const DATA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

const DATA_CURTA = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** Os números do acervo. Contam o que está fechado também — ver relatorio.ts. */
function Placar({ totais }: { totais: Totais }) {
  const cartoes = [
    { valor: totais.mensagens, rotulo: "Mensagens" },
    { valor: totais.recuperadas, rotulo: "Apagadas", destaque: true },
    { valor: totais.midias, rotulo: "Mídias" },
    { valor: totais.audios, rotulo: "Áudios" },
  ];
  return (
    <dl className="mt-3 grid grid-cols-4 gap-2">
      {cartoes.map((c) => (
        <div
          key={c.rotulo}
          className="rounded-xl border border-base-line bg-base-raise px-1.5 py-2.5 text-center"
        >
          <dd
            className={`text-[20px] font-bold leading-none tabular-nums ${
              c.destaque ? "text-alerta" : "text-texto"
            }`}
          >
            {c.valor}
          </dd>
          <dt className="mt-1 text-[9.5px] font-medium uppercase tracking-wide text-texto-dim">
            {c.rotulo}
          </dt>
        </div>
      ))}
    </dl>
  );
}

export default async function Relatorio({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const conta = await contaAtual();
  if (!conta) redirect("/entrar");

  const params = await searchParams;
  const ehNovo = (Array.isArray(params.novo) ? params.novo[0] : params.novo) === "1";

  // Aqui está a regra dos 7 dias. O que volta já vem filtrado: seções ainda
  // fechadas chegam com `conteudo: null`, então o conteúdo bloqueado não é
  // enviado ao navegador — não adianta abrir o inspetor.
  const { liberacao, secoes, totais } = montarRelatorio(conta.criadoEm, {
    upsell1: conta.upsell1,
    upsell2: conta.upsell2,
  });
  const abertas = secoes.filter((s) => s.aberta).length;
  const quandoLibera = DATA.format(new Date(liberacao.liberaEm));
  const nome = primeiroNome(conta.nome);
  // O dossiê é sobre o ALVO; a conta é do comprador. Mostrar o telefone da
  // conta aqui exibiria o número de quem comprou no lugar do investigado.
  const telefone = formatarTelefone(conta.alvoTelefone);
  const inicial = (nome || "?").charAt(0).toUpperCase();

  return (
    <div className="min-h-dvh pb-16">
      {/* Barra do produto. É o que diz "você está dentro de uma plataforma",
          e carrega a mesma marca que a pessoa viu na oferta. */}
      <header className="sticky top-0 z-20 border-b border-base-line bg-base/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[34rem] items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <ShieldCheck className="h-5 w-5 flex-shrink-0 text-zap" />
            <span className="truncate text-[14px] font-bold tracking-tight text-texto">
              Detective White
            </span>
            <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-zap/25 bg-zap/10 px-2 py-0.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-eco absolute inline-flex h-full w-full rounded-full bg-zap" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-zap" />
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-zap">
                Online
              </span>
            </span>
          </div>

          {/* Sem sessão de verdade não há o que encerrar: no acesso livre
              local o botão só devolveria a pessoa para esta mesma página. */}
          {conta.demo ? (
            <span className="flex-shrink-0 rounded-lg border border-base-line px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-texto-dim">
              Local
            </span>
          ) : (
            <form action="/api/sair" method="post" className="flex-shrink-0">
              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] text-texto-dim transition hover:text-texto"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </form>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-[34rem] px-4 pt-5">
        {conta.demo ? (
          <p className="mb-4 rounded-xl border border-base-line bg-base-raise px-3.5 py-2.5 text-[11.5px] leading-relaxed text-texto-dim">
            <span className="font-semibold text-texto-mute">
              Acesso livre de desenvolvimento.
            </span>{" "}
            Conta de demonstração, sem banco e sem código — veja{" "}
            <span className="font-mono">src/lib/dev.ts</span>.
          </p>
        ) : null}

        {/* Dossiê: quem está sendo monitorado e em que estado está a extração */}
        <section className="animate-subir rounded-2xl border border-base-line bg-base-raise p-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex-shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-base-panel text-[20px] font-bold text-texto-mute">
                {inicial}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-base-raise bg-zap">
                <CheckCircle2 className="h-3 w-3 text-base" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-zap">
                Alvo monitorado
              </p>
              <h1 className="mt-0.5 truncate text-[20px] font-bold leading-tight tracking-tight text-texto">
                {nome || "Relatório"}
              </h1>
              <p className="mt-0.5 font-mono text-[13px] text-texto-mute">
                {telefone}
              </p>
            </div>
          </div>

          <div className="mt-3.5 flex flex-wrap gap-1.5 border-t border-base-line pt-3.5">
            <span className="flex items-center gap-1.5 rounded-lg bg-base-panel px-2 py-1 text-[11px] text-texto-mute">
              <Smartphone className="h-3 w-3 text-texto-dim" />
              Aparelho sincronizado
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-base-panel px-2 py-1 text-[11px] text-texto-mute">
              <CheckCircle2 className="h-3 w-3 text-zap" />
              Extração concluída
            </span>
            <span className="rounded-lg bg-base-panel px-2 py-1 text-[11px] tabular-nums text-texto-mute">
              {DATA_CURTA.format(new Date(conta.criadoEm))}
            </span>
          </div>

          <Placar totais={totais} />
        </section>

        {ehNovo ? (
          <section className="animate-subir mt-3 rounded-2xl border border-zap/30 bg-zap/[0.08] p-4">
            <div className="flex items-center gap-2 text-zap">
              <KeyRound className="h-4 w-4" />
              <p className="text-[13px] font-semibold">Seu código de acesso</p>
            </div>
            <p className="mt-2 font-mono text-[30px] font-bold tracking-[0.32em] text-texto">
              {conta.codigo}
            </p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-zap-soft/80">
              Anote agora. É com ele e o seu telefone que você volta aqui de
              qualquer aparelho. Ele continua visível no rodapé desta página.
            </p>
          </section>
        ) : null}

        {liberacao.completo ? (
          <section className="animate-subir mt-3 flex items-center gap-3 rounded-2xl border border-zap/25 bg-zap/[0.08] p-4">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-zap" />
            <div>
              <p className="text-[14.5px] font-bold text-texto">
                Dossiê completo liberado
              </p>
              <p className="mt-0.5 text-[12.5px] text-texto-mute">
                As {secoes.length} seções estão abertas.
              </p>
            </div>
          </section>
        ) : (
          <section className="animate-subir mt-3 rounded-2xl border border-base-line bg-base-raise p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13.5px] font-bold text-texto">
                  Liberação do dossiê completo
                </p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-texto-mute">
                  {abertas} de {secoes.length} seções abertas. O restante abre
                  em {quandoLibera}.
                </p>
              </div>
              <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-texto-dim" />
            </div>

            <div className="mt-3.5">
              <Contagem liberaEm={liberacao.liberaEm} />
            </div>

            <div
              className="mt-3.5 h-1.5 overflow-hidden rounded-full bg-base-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(liberacao.progresso * 100)}
              aria-label="Progresso até a liberação completa"
            >
              <div
                className="h-full rounded-full bg-zap transition-[width] duration-700"
                style={{ width: `${Math.max(2, liberacao.progresso * 100)}%` }}
              />
            </div>
          </section>
        )}

        {/* Índice. Além de navegar, é ele que mostra de relance o tamanho do
            dossiê — oito seções, não um texto só. */}
        <nav
          aria-label="Seções do relatório"
          className="sem-barra -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-0.5"
        >
          {secoes.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
                s.aberta
                  ? "border-zap/25 bg-zap/10 text-zap"
                  : "border-base-line bg-base-raise text-texto-dim"
              }`}
            >
              {s.aberta ? null : <Lock className="h-3 w-3" />}
              {s.curto}
            </a>
          ))}
        </nav>

        <Secoes secoes={secoes} quandoLibera={quandoLibera} />

        <footer className="mt-10 border-t border-base-line pt-5">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-base-line bg-base-raise px-3.5 py-3">
            <div>
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-texto-dim">
                Código de acesso
              </p>
              <p className="mt-0.5 font-mono text-[16px] font-bold tracking-[0.2em] text-texto-mute">
                {conta.codigo}
              </p>
            </div>
            <KeyRound className="h-4 w-4 flex-shrink-0 text-texto-dim" />
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-texto-dim">
            Acesso aberto em {DATA.format(new Date(conta.criadoEm))}. Guarde o
            código: é com ele e o seu telefone que você entra de qualquer
            aparelho.
          </p>
        </footer>
      </main>
    </div>
  );
}
