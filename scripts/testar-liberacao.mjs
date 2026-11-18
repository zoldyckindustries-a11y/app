// Teste da regra dos 7 dias — a parte do sistema que não pode errar.
//
// Roda contra o código real compilado, não contra uma reimplementação:
// `node scripts/testar-liberacao.mjs`

import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const saida = join(mkdtempSync(join(tmpdir(), "lib-")), "relatorio.mjs");
await build({
  entryPoints: ["src/lib/relatorio.ts"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile: saida,
});
// pathToFileURL em vez de montar "file://" na mão: no Windows o caminho vem
// com barra invertida e letra de unidade, que não formam uma URL válida.
const { montarRelatorio } = await import(pathToFileURL(saida).href);

const DIA = 86_400_000;
const entrada = Date.UTC(2026, 0, 1);

let falhas = 0;
function conferir(descricao, condicao) {
  console.log(`${condicao ? "  ok  " : "FALHOU"}  ${descricao}`);
  if (!condicao) falhas++;
}

// ── No momento da entrada ────────────────────────────────────────────────
{
  const { liberacao, secoes } = montarRelatorio(entrada, {}, entrada);
  const previa = secoes.filter((s) => s.previa);
  const travadas = secoes.filter((s) => !s.previa);

  conferir("entrada: relatório não está completo", liberacao.completo === false);
  conferir("entrada: faltam 7 dias", liberacao.dias === 7 - 1 || liberacao.dias === 7);
  conferir("entrada: prévia aberta", previa.every((s) => s.aberta));
  conferir("entrada: prévia tem conteúdo", previa.every((s) => s.conteudo !== null));
  conferir("entrada: demais seções fechadas", travadas.every((s) => !s.aberta));
  conferir(
    "entrada: conteúdo bloqueado NÃO sai do servidor",
    travadas.every((s) => s.conteudo === null)
  );
}

// ── Um minuto antes do prazo ─────────────────────────────────────────────
{
  const { liberacao, secoes } = montarRelatorio(entrada, {}, entrada + 7 * DIA - 60_000);
  conferir("1 min antes: ainda bloqueado", liberacao.completo === false);
  conferir(
    "1 min antes: conteúdo travado continua null",
    secoes.filter((s) => !s.previa).every((s) => s.conteudo === null)
  );
}

// ── Exatamente no prazo ──────────────────────────────────────────────────
{
  const { liberacao, secoes } = montarRelatorio(entrada, {}, entrada + 7 * DIA);
  conferir("no prazo: liberado", liberacao.completo === true);
  conferir("no prazo: todas as seções abertas", secoes.every((s) => s.aberta));
  conferir("no prazo: todas com conteúdo", secoes.every((s) => s.conteudo !== null));
  conferir("no prazo: restante zerado", liberacao.restanteMs === 0);
}

// ── Depois do prazo ──────────────────────────────────────────────────────
{
  const { liberacao } = montarRelatorio(entrada, {}, entrada + 30 * DIA);
  conferir("30 dias: segue liberado", liberacao.completo === true);
  conferir("30 dias: progresso não passa de 1", liberacao.progresso === 1);
}

// ── Relógio atrasado / data no futuro ────────────────────────────────────
{
  const { liberacao } = montarRelatorio(entrada, {}, entrada - 10 * DIA);
  conferir("entrada no futuro: não libera", liberacao.completo === false);
  conferir("entrada no futuro: progresso não fica negativo", liberacao.progresso >= 0);
}

// ── Upsells: quem não comprou não recebe ─────────────────────────────────
//
// Esta é a outra regra que não pode errar. Uma seção de upsell que vaze para
// quem não pagou é conteúdo entregue de graça; uma que não apareça para quem
// pagou é produto vendido e não entregue.
{
  const sem = montarRelatorio(entrada, {}, entrada + 30 * DIA).secoes;
  const so1 = montarRelatorio(entrada, { upsell1: true }, entrada + 30 * DIA).secoes;
  const ambos = montarRelatorio(
    entrada,
    { upsell1: true, upsell2: true },
    entrada + 30 * DIA
  ).secoes;

  const tem = (lista, origem) => lista.some((s) => s.origem === origem);

  conferir("sem upsell: só o relatório principal", !tem(sem, "upsell1") && !tem(sem, "upsell2"));
  conferir("sem upsell: principal continua inteiro", sem.every((s) => s.conteudo !== null));
  conferir("upsell 1: a seção aparece", tem(so1, "upsell1"));
  conferir("upsell 1: não traz junto o upsell 2", !tem(so1, "upsell2"));
  conferir("upsell 1: a seção vem com conteúdo", so1.every((s) => s.conteudo !== null));
  conferir("dois upsells: as duas seções aparecem", tem(ambos, "upsell1") && tem(ambos, "upsell2"));
  conferir(
    "upsell comprado abre na hora, sem esperar 7 dias",
    montarRelatorio(entrada, { upsell1: true }, entrada).secoes
      .filter((s) => s.origem === "upsell1")
      .every((s) => s.aberta && s.conteudo !== null)
  );
}

console.log("");
if (falhas) {
  console.error(`${falhas} verificação(ões) falharam`);
  process.exit(1);
}
console.log("Todas as verificações passaram.");
