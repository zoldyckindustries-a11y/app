// Estrutura do relatório e o que cada seção exige para abrir.
//
// `previa: true` abre assim que o lead entra. `previa: false` só abre quando
// o prazo vence. Quem decide é o servidor: uma seção fechada tem o conteúdo
// REMOVIDO da resposta, não escondido por CSS — senão bastaria abrir o
// inspetor para ler tudo no primeiro dia.
//
// A lista de seções espelha, uma a uma, as provas que a oferta mostra
// trancadas no funil: conversas, mensagens apagadas, mídia privada, áudios
// interceptados e localização. Quem comprou precisa reencontrar aqui, aberto,
// o que viu lá com cadeado.

import { calcularLiberacao } from "./liberacao";
import { ACERVO, CONTEUDO_EXEMPLO, type ConteudoSecao } from "./conteudo-exemplo";

/** De qual compra a seção depende. `principal` é o relatório que todos têm. */
export type Origem = "principal" | "upsell1" | "upsell2";

export interface Secao {
  id: string;
  titulo: string;
  resumo: string;
  /** Nome curto para o índice que rola no topo. */
  curto: string;
  /**
   * Qual oferta paga esta seção.
   *
   * As seções de upsell não aparecem para quem não comprou — nem trancadas,
   * nem como anúncio. Quem comprou recebe; quem não comprou não vê que
   * existe, porque a oferta já foi feita na esteira e repeti-la dentro do
   * produto entregue é ruído.
   */
  origem: Origem;
  /** Qual ícone o componente usa. String, para esta lib não importar React. */
  icone:
    | "resumo"
    | "conversa"
    | "apagada"
    | "midia"
    | "audio"
    | "local"
    | "conta"
    | "analise"
    | "perfil"
    | "extra";
  /** Aberta desde a entrada? */
  previa: boolean;
}

export const SECOES: Secao[] = [
  {
    id: "resumo",
    titulo: "Resumo da extração",
    curto: "Resumo",
    resumo: "O que foi encontrado no período analisado.",
    icone: "resumo",
    origem: "principal",
    previa: true,
  },
  {
    id: "conversas",
    titulo: "Conversas recuperadas",
    curto: "Conversas",
    resumo: "As conversas identificadas na extração, com horário de cada mensagem.",
    icone: "conversa",
    origem: "principal",
    previa: true,
  },
  {
    id: "apagadas",
    titulo: "Mensagens apagadas",
    curto: "Apagadas",
    resumo: "Mensagens removidas do aparelho e reconstruídas a partir do backup.",
    icone: "apagada",
    origem: "principal",
    previa: false,
  },
  {
    id: "midia",
    titulo: "Mídia privada",
    curto: "Mídia",
    resumo: "Fotos e vídeos fora da galeria, incluindo visualização única.",
    icone: "midia",
    origem: "principal",
    previa: false,
  },
  {
    id: "audios",
    titulo: "Áudios interceptados",
    curto: "Áudios",
    resumo: "Mensagens de voz capturadas e transcritas.",
    icone: "audio",
    origem: "principal",
    previa: false,
  },
  {
    id: "localizacao",
    titulo: "Histórico de localização",
    curto: "Localização",
    resumo: "Rota percorrida e paradas fora da rotina, com data e hora.",
    icone: "local",
    origem: "principal",
    previa: false,
  },
  {
    id: "contas",
    titulo: "Contas vinculadas",
    curto: "Contas",
    resumo: "Perfis associados ao mesmo número ou aparelho.",
    icone: "conta",
    origem: "principal",
    previa: false,
  },
  {
    id: "ia",
    titulo: "Relatório comportamental",
    curto: "Análise",
    resumo: "A leitura dos padrões encontrados no conjunto dos dados.",
    icone: "analise",
    origem: "principal",
    previa: false,
  },

  /* ─────────────── o que os upsells da esteira entregam ─────────────── */

  {
    id: "relacionamento",
    titulo: "Perfis em apps de relacionamento",
    curto: "Apps",
    resumo:
      "Os perfis encontrados no cruzamento com bases de apps de encontros.",
    icone: "perfil",
    origem: "upsell1",
    // Prévia: é compra separada e recente, então abre na hora. Fazer quem
    // acabou de pagar pelo adicional esperar 7 dias seria vender duas vezes
    // a mesma espera.
    previa: true,
  },
  {
    id: "extra",
    titulo: "Dossiê complementar",
    curto: "Extra",
    resumo: "O material adicional incluído na sua compra.",
    icone: "extra",
    origem: "upsell2",
    previa: true,
  },
];

/** Uma seção como ela chega no navegador. */
export interface SecaoRenderizada extends Secao {
  aberta: boolean;
  /** Só vem preenchido quando `aberta` é true. */
  conteudo: ConteudoSecao | null;
}

/** Os números do painel: quanto foi encontrado, não o que foi encontrado. */
export type Totais = typeof ACERVO;

/**
 * Monta o relatório para uma conta, já filtrado.
 *
 * O filtro é a peça central da regra dos 7 dias: `conteudo` fica `null` em
 * tudo que ainda não abriu, então o conteúdo bloqueado nunca sai do servidor.
 *
 * `totais` é a exceção deliberada: ele descreve o acervo inteiro, inclusive
 * o que ainda está fechado. Quantidade não é conteúdo — saber que existem 23
 * mídias não revela nenhuma delas, e é o que mostra à pessoa que o material
 * está lá enquanto o prazo corre.
 */
export function montarRelatorio(
  criadoEm: number,
  /** O que a pessoa comprou. Sem isto, só o relatório principal. */
  compras: { upsell1?: boolean; upsell2?: boolean } = {},
  agora = Date.now()
) {
  const liberacao = calcularLiberacao(criadoEm, agora);

  const temOrigem = (origem: Origem) =>
    origem === "principal" ||
    (origem === "upsell1" && compras.upsell1 === true) ||
    (origem === "upsell2" && compras.upsell2 === true);

  const secoes: SecaoRenderizada[] = SECOES
    // Filtrado ANTES de montar: a seção que a pessoa não comprou não existe
    // na resposta, então o conteúdo dela não sai do servidor nem como
    // esqueleto trancado.
    .filter((secao) => temOrigem(secao.origem))
    .map((secao) => {
      const aberta = secao.previa || liberacao.completo;
      return {
        ...secao,
        aberta,
        conteudo: aberta ? (CONTEUDO_EXEMPLO[secao.id] ?? null) : null,
      };
    });

  return { liberacao, secoes, totais: ACERVO };
}
