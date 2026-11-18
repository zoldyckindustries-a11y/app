// A regra dos 7 dias.
//
// Um só lugar calcula o que está aberto. A página, a contagem regressiva e o
// que o servidor decide enviar usam todos esta função — se o cálculo morasse
// em dois lugares, um deles acabaria discordando do outro e mostraria um
// cadeado numa seção cujo conteúdo já foi para o navegador.

import { PRAZO_DIAS, PRAZO_MS } from "./config";

export interface Liberacao {
  /** true quando o prazo já passou e o relatório inteiro está disponível. */
  completo: boolean;
  /** Epoch ms da entrada (âncora). */
  criadoEm: number;
  /** Epoch ms em que o relatório abre por inteiro. */
  liberaEm: number;
  /** Quanto falta, em ms. Zero quando já liberou. */
  restanteMs: number;
  dias: number;
  horas: number;
  minutos: number;
  /** 0 a 1 — quanto do prazo já passou. */
  progresso: number;
  prazoDias: number;
}

export function calcularLiberacao(criadoEm: number, agora = Date.now()): Liberacao {
  const liberaEm = criadoEm + PRAZO_MS;
  const restanteMs = Math.max(0, liberaEm - agora);
  const decorrido = Math.min(PRAZO_MS, Math.max(0, agora - criadoEm));

  return {
    completo: restanteMs === 0,
    criadoEm,
    liberaEm,
    restanteMs,
    dias: Math.floor(restanteMs / 86_400_000),
    horas: Math.floor((restanteMs % 86_400_000) / 3_600_000),
    minutos: Math.floor((restanteMs % 3_600_000) / 60_000),
    progresso: PRAZO_MS === 0 ? 1 : decorrido / PRAZO_MS,
    prazoDias: PRAZO_DIAS,
  };
}
