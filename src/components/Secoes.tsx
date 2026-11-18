import {
  Activity,
  AtSign,
  Flame,
  CheckCheck,
  Clock,
  Eye,
  FileSearch,
  Image as ImageIcon,
  Lock,
  MapPin,
  MessageCircle,
  Mic,
  Play,
  Sparkles,
  Trash2,
  TriangleAlert,
  Video,
} from "lucide-react";
import type { Bloco } from "@/lib/conteudo-exemplo";
import type { SecaoRenderizada } from "@/lib/relatorio";

/* ───────────────────────────── blocos ───────────────────────────────── */

function Metricas({ bloco }: { bloco: Extract<Bloco, { tipo: "metricas" }> }) {
  return (
    <dl className="grid grid-cols-2 gap-2">
      {bloco.itens.map((item) => (
        <div
          key={item.rotulo}
          className="rounded-xl border border-base-line bg-base-raise px-3 py-2.5"
        >
          <dt className="text-[10.5px] font-medium uppercase tracking-wider text-texto-dim">
            {item.rotulo}
          </dt>
          <dd
            className={`mt-1 text-[19px] font-bold leading-none tabular-nums ${
              item.destaque ? "text-zap" : "text-texto"
            }`}
          >
            {item.valor}
          </dd>
          {item.nota ? (
            <p className="mt-1 text-[11px] leading-snug text-texto-dim">
              {item.nota}
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}

/**
 * Print de conversa.
 *
 * É o bloco que faz o relatório parecer o que foi prometido: a oferta mostra
 * exatamente esta tela com cadeado em cima. Os balões seguem o WhatsApp —
 * recebido em #202C33 à esquerda, enviado em #005C4B à direita, tique duplo
 * azul — porque é essa a forma que a pessoa reconhece como "a conversa dele".
 */
function Conversa({ bloco }: { bloco: Extract<Bloco, { tipo: "conversa" }> }) {
  return (
    <div className="overflow-hidden rounded-xl border border-base-line">
      <div className="flex items-center gap-2.5 bg-base-panel px-3 py-2.5">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-base-line">
          <MessageCircle className="h-4 w-4 text-texto-dim" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-texto">
            {bloco.contato}
          </p>
          <p className="text-[11px] text-texto-dim">{bloco.quando}</p>
        </div>
        <span className="flex-shrink-0 rounded-md bg-zap/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zap">
          Recuperada
        </span>
      </div>

      <div className="papel-conversa space-y-1.5 px-3 py-3.5">
        {bloco.mensagens.map((m, i) => {
          const meu = m.de === "alvo";
          return (
            <div
              key={i}
              className={`flex ${meu ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  meu ? "bg-zap-deep" : "bg-base-panel"
                } ${m.recuperada ? "ring-1 ring-alerta/45" : ""}`}
              >
                {m.recuperada ? (
                  <p className="mb-1 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-alerta">
                    <Trash2 className="h-2.5 w-2.5" />
                    Apagada · restaurada
                  </p>
                ) : null}
                <p className="whitespace-pre-line break-words text-[13.5px] leading-snug text-texto">
                  {m.texto}
                </p>
                <p className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-texto-dim">
                  {m.hora}
                  {meu ? <CheckCheck className="h-3 w-3 text-tick" /> : null}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {bloco.nota ? (
        <p className="border-t border-base-line bg-base-raise px-3 py-2.5 text-[11.5px] leading-relaxed text-texto-dim">
          {bloco.nota}
        </p>
      ) : null}
    </div>
  );
}

const FORMATO = {
  foto: { rotulo: "Foto", Icone: ImageIcon },
  video: { rotulo: "Vídeo", Icone: Video },
  audio: { rotulo: "Áudio", Icone: Mic },
  unica: { rotulo: "Visualização única", Icone: Eye },
} as const;

/**
 * Mídia encontrada.
 *
 * Sem o arquivo em mãos, cada item mostra o que de fato se sabe dele: tipo,
 * origem e horário. Inventar uma miniatura borrada seria encenar um conteúdo
 * que o relatório não tem — a ficha com os metadados é mais crível e é o que
 * um painel de extração mostra de verdade.
 */
function Galeria({ bloco }: { bloco: Extract<Bloco, { tipo: "galeria" }> }) {
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {bloco.itens.map((item, i) => {
          const { rotulo, Icone } = FORMATO[item.formato];
          const unica = item.formato === "unica";
          return (
            <figure
              key={i}
              className="overflow-hidden rounded-xl border border-base-line bg-base-raise"
            >
              <div className="malha relative flex h-20 items-center justify-center bg-base-panel">
                <Icone
                  className={`h-6 w-6 ${unica ? "text-alerta" : "text-texto-dim"}`}
                />
                {unica ? (
                  <span className="absolute right-1.5 top-1.5 rounded bg-alerta/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-alerta">
                    1x
                  </span>
                ) : null}
              </div>
              <figcaption className="px-2.5 py-2">
                <p className="truncate text-[12px] font-semibold text-texto">
                  {item.rotulo}
                </p>
                <p className="mt-0.5 text-[10.5px] text-texto-dim">{rotulo}</p>
                <p className="mt-1 flex items-center gap-1 text-[10.5px] text-texto-dim">
                  <Clock className="h-2.5 w-2.5 flex-shrink-0" />
                  <span className="truncate">{item.hora}</span>
                </p>
                {item.origem ? (
                  <p className="mt-0.5 truncate text-[10.5px] text-texto-dim">
                    {item.origem}
                  </p>
                ) : null}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {bloco.nota ? (
        <p className="mt-3 text-[12px] leading-relaxed text-texto-dim">
          {bloco.nota}
        </p>
      ) : null}
    </div>
  );
}

function Locais({ bloco }: { bloco: Extract<Bloco, { tipo: "locais" }> }) {
  return (
    <ol className="relative space-y-3 pl-6">
      {/* trilho da linha do tempo */}
      <span
        className="absolute bottom-2 left-[7px] top-2 w-px bg-base-line"
        aria-hidden
      />
      {bloco.itens.map((item, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-6 top-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border-2 border-base ${
              item.foraDaRotina ? "bg-alerta" : "bg-base-line"
            }`}
            aria-hidden
          >
            {item.foraDaRotina ? (
              <span className="h-1 w-1 rounded-full bg-base" />
            ) : null}
          </span>
          <div
            className={`rounded-xl border px-3 py-2.5 ${
              item.foraDaRotina
                ? "border-alerta/30 bg-alerta/[0.07]"
                : "border-base-line bg-base-raise"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="flex min-w-0 items-center gap-1.5 text-[13.5px] font-semibold text-texto">
                <MapPin
                  className={`h-3.5 w-3.5 flex-shrink-0 ${
                    item.foraDaRotina ? "text-alerta" : "text-texto-dim"
                  }`}
                />
                <span className="truncate">{item.local}</span>
              </p>
              <span className="flex-shrink-0 text-[11px] tabular-nums text-texto-dim">
                {item.quando}
              </span>
            </div>
            <p className="mt-1 pl-5 text-[12px] leading-snug text-texto-mute">
              {item.detalhe}
            </p>
            {item.foraDaRotina ? (
              <p className="mt-1.5 pl-5 text-[10.5px] font-semibold uppercase tracking-wide text-alerta">
                Fora da rotina
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Altura das barras da onda: fórmula fixa, para servidor e cliente baterem. */
function onda(indice: number, barra: number): number {
  return 22 + ((barra * 37 + indice * 11) % 72);
}

function Audios({ bloco }: { bloco: Extract<Bloco, { tipo: "audios" }> }) {
  return (
    <div>
      <div className="space-y-2.5">
        {bloco.itens.map((item, i) => {
          const meu = item.de === "alvo";
          return (
            <div key={i} className={`flex ${meu ? "justify-end" : "justify-start"}`}>
              <div
                className={`w-[92%] rounded-xl px-3 py-2.5 ${
                  meu ? "bg-zap-deep" : "bg-base-panel"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Play className="h-3 w-3 fill-texto text-texto" />
                  </span>
                  <span className="flex h-6 flex-1 items-center gap-[2px]" aria-hidden>
                    {Array.from({ length: 24 }).map((_, b) => (
                      <span
                        key={b}
                        className="flex-1 rounded-full bg-white/35"
                        style={{ height: `${onda(i, b)}%` }}
                      />
                    ))}
                  </span>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-texto-mute">
                    {item.duracao}
                  </span>
                </div>
                {item.transcricao ? (
                  <p className="mt-2 border-t border-white/10 pt-2 text-[12.5px] italic leading-snug text-texto-mute">
                    {item.transcricao}
                  </p>
                ) : null}
                <p className="mt-1 text-right text-[10px] tabular-nums text-texto-dim">
                  {item.hora}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {bloco.nota ? (
        <p className="mt-3 text-[12px] leading-relaxed text-texto-dim">
          {bloco.nota}
        </p>
      ) : null}
    </div>
  );
}

function Perfis({ bloco }: { bloco: Extract<Bloco, { tipo: "perfis" }> }) {
  return (
    <ul className="divide-y divide-base-line overflow-hidden rounded-xl border border-base-line bg-base-raise">
      {bloco.itens.map((item, i) => (
        <li key={i} className="flex items-center gap-3 px-3 py-3">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-base-panel">
            <AtSign className="h-4 w-4 text-texto-dim" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-semibold text-texto">
              {item.plataforma}
            </p>
            <p className="truncate font-mono text-[12px] text-texto-mute">
              {item.identificador}
            </p>
            <p className="mt-0.5 truncate text-[11.5px] text-texto-dim">
              {item.detalhe}
            </p>
          </div>
          {item.ativo ? (
            <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full bg-zap/12 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-zap">
              <span className="h-1.5 w-1.5 rounded-full bg-zap" />
              Ativo
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Analise({ bloco }: { bloco: Extract<Bloco, { tipo: "analise" }> }) {
  return (
    <div className="space-y-3.5">
      {bloco.itens.map((item, i) => {
        const alto = item.valor >= 60;
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[13px] font-semibold text-texto">{item.rotulo}</p>
              <p
                className={`text-[14px] font-bold tabular-nums ${
                  alto ? "text-alerta" : "text-texto-mute"
                }`}
              >
                {item.valor}%
              </p>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-base-line"
              role="img"
              aria-label={`${item.rotulo}: ${item.valor} por cento`}
            >
              <div
                className={`h-full rounded-full ${alto ? "bg-alerta" : "bg-zap"}`}
                style={{ width: `${Math.min(100, Math.max(2, item.valor))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11.5px] leading-snug text-texto-dim">
              {item.nota}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function Aviso({ bloco }: { bloco: Extract<Bloco, { tipo: "aviso" }> }) {
  const alerta = bloco.tom !== "neutro";
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        alerta ? "border-alerta/30 bg-alerta/[0.07]" : "border-base-line bg-base-raise"
      }`}
    >
      <p className="flex items-center gap-2 text-[13.5px] font-bold text-texto">
        <TriangleAlert
          className={`h-4 w-4 flex-shrink-0 ${alerta ? "text-alerta" : "text-texto-dim"}`}
        />
        {bloco.titulo}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-texto-mute">
        {bloco.texto}
      </p>
    </div>
  );
}

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <div className="space-y-4">
      {blocos.map((bloco, i) => {
        switch (bloco.tipo) {
          case "metricas":
            return <Metricas key={i} bloco={bloco} />;
          case "conversa":
            return <Conversa key={i} bloco={bloco} />;
          case "galeria":
            return <Galeria key={i} bloco={bloco} />;
          case "locais":
            return <Locais key={i} bloco={bloco} />;
          case "audios":
            return <Audios key={i} bloco={bloco} />;
          case "perfis":
            return <Perfis key={i} bloco={bloco} />;
          case "analise":
            return <Analise key={i} bloco={bloco} />;
          case "aviso":
            return <Aviso key={i} bloco={bloco} />;
          case "texto":
            return (
              <div key={i} className="space-y-2">
                {bloco.paragrafos.map((p, j) => (
                  <p
                    key={j}
                    className="text-[13.5px] leading-relaxed text-texto-mute"
                  >
                    {p}
                  </p>
                ))}
              </div>
            );
          case "lista":
            return (
              <ul key={i} className="space-y-2">
                {bloco.itens.map((item, j) => (
                  <li
                    key={j}
                    className="rounded-xl border border-base-line bg-base-raise px-3.5 py-3"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-[13.5px] font-semibold text-texto">
                        {item.titulo}
                      </p>
                      {item.marca ? (
                        <span className="flex-shrink-0 rounded-full bg-base-panel px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-texto-dim">
                          {item.marca}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-texto-mute">
                      {item.detalhe}
                    </p>
                  </li>
                ))}
              </ul>
            );
        }
      })}
    </div>
  );
}

/* ───────────────────────────── seções ───────────────────────────────── */

const ICONES = {
  resumo: FileSearch,
  conversa: MessageCircle,
  apagada: Trash2,
  midia: ImageIcon,
  audio: Mic,
  local: MapPin,
  conta: AtSign,
  analise: Activity,
  perfil: Flame,
  extra: Sparkles,
} as const;

/**
 * O lugar do conteúdo que ainda não abriu.
 *
 * Nada aqui é o conteúdo desfocado — ele não chegou ao navegador. São barras
 * vazias com a forma do que vem. É de propósito que pareça "processando" e
 * não "erro": o hachurado âmbar da versão anterior lia como falha do sistema.
 */
function Esqueleto() {
  const larguras = ["88%", "72%", "94%", "60%"];
  return (
    <div className="space-y-2" aria-hidden>
      {larguras.map((l, i) => (
        <div
          key={i}
          className="esqueleto h-3 rounded-full"
          style={{ width: l }}
        />
      ))}
    </div>
  );
}

export default function Secoes({
  secoes,
  quandoLibera,
}: {
  secoes: SecaoRenderizada[];
  quandoLibera: string;
}) {
  return (
    <div className="mt-4 space-y-3">
      {secoes.map((secao) => {
        const Icone = ICONES[secao.icone];
        return (
          <section
            key={secao.id}
            id={secao.id}
            className="scroll-mt-20 overflow-hidden rounded-2xl border border-base-line bg-base-raise"
          >
            <header className="flex items-start gap-3 px-4 pt-4">
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                  secao.aberta ? "bg-zap/12 text-zap" : "bg-base-panel text-texto-dim"
                }`}
              >
                <Icone className="h-[18px] w-[18px]" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-[16px] font-bold tracking-tight text-texto">
                    {secao.titulo}
                  </h2>
                  {secao.aberta ? null : (
                    <Lock className="h-3.5 w-3.5 flex-shrink-0 text-texto-dim" />
                  )}
                </div>
                <p className="mt-0.5 text-[12.5px] leading-snug text-texto-dim">
                  {secao.resumo}
                </p>
              </div>
            </header>

            <div className="px-4 pb-4 pt-3.5">
              {secao.aberta && secao.conteudo ? (
                <Blocos blocos={secao.conteudo.blocos} />
              ) : (
                <div className="rounded-xl border border-base-line bg-base-card p-3.5">
                  <Esqueleto />
                  <p className="mt-3.5 flex items-center gap-2 border-t border-base-line pt-3 text-[12px] text-texto-mute">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0 text-texto-dim" />
                    Liberação programada para{" "}
                    <span className="font-semibold text-texto">{quandoLibera}</span>
                  </p>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
