"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function partes(restanteMs: number) {
  return {
    dias: Math.floor(restanteMs / 86_400_000),
    horas: Math.floor((restanteMs % 86_400_000) / 3_600_000),
    minutos: Math.floor((restanteMs % 3_600_000) / 60_000),
    segundos: Math.floor((restanteMs % 60_000) / 1000),
  };
}

/**
 * Contagem até a liberação.
 *
 * Ao chegar em zero chama `router.refresh()` em vez de abrir o conteúdo por
 * conta própria: o conteúdo bloqueado não está no navegador, quem decide o
 * que enviar é o servidor. Sem o refresh a pessoa veria 00:00:00 e continuaria
 * com os cadeados até recarregar na mão.
 */
export default function Contagem({ liberaEm }: { liberaEm: number }) {
  const router = useRouter();
  // null no primeiro render: o relógio do servidor e o do cliente diferem, e
  // renderizar o valor direto causaria divergência de hidratação.
  const [restante, setRestante] = useState<number | null>(null);
  const [pediuRefresh, setPediuRefresh] = useState(false);

  useEffect(() => {
    function tique() {
      const falta = Math.max(0, liberaEm - Date.now());
      setRestante(falta);
      if (falta === 0 && !pediuRefresh) {
        setPediuRefresh(true);
        router.refresh();
      }
    }
    tique();
    const id = setInterval(tique, 1000);
    return () => clearInterval(id);
  }, [liberaEm, pediuRefresh, router]);

  if (restante === null) {
    return (
      <div className="grid grid-cols-4 gap-2" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[56px] rounded-xl bg-base-panel" />
        ))}
      </div>
    );
  }

  const { dias, horas, minutos, segundos } = partes(restante);
  const caixas = [
    { valor: dias, rotulo: "dias" },
    { valor: horas, rotulo: "horas" },
    { valor: minutos, rotulo: "min" },
    { valor: segundos, rotulo: "seg" },
  ];

  return (
    <div
      className="grid grid-cols-4 gap-2"
      role="timer"
      aria-live="off"
      aria-label={`Liberação completa em ${dias} dias, ${horas} horas e ${minutos} minutos`}
    >
      {caixas.map((c) => (
        <div
          key={c.rotulo}
          className="flex flex-col items-center rounded-xl border border-base-line bg-base-card py-2.5"
        >
          <span className="font-mono text-[22px] font-bold leading-none tabular-nums text-zap">
            {String(c.valor).padStart(2, "0")}
          </span>
          <span className="mt-1.5 text-[9.5px] font-medium uppercase tracking-wider text-texto-dim">
            {c.rotulo}
          </span>
        </div>
      ))}
    </div>
  );
}
