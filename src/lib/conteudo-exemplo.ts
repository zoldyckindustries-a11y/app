// ─────────────────────────────────────────────────────────────────────────
// CONTEÚDO DO RELATÓRIO — SUBSTITUA POR AQUI
// ─────────────────────────────────────────────────────────────────────────
//
// Este arquivo é o único lugar que define o que cada seção mostra. A
// plataforma inteira (login, sessão, prazo, cadeado, contagem regressiva) já
// funciona em cima dele — para trocar o relatório, basta trocar este objeto,
// sem encostar no resto.
//
// Os blocos existem para entregar, abertas, as mesmas quatro provas que a
// oferta mostra trancadas (src/app/components/PitchPage.tsx do funil):
//
//   conversa  → a conversa recuperada, com o balão "mensagem apagada"
//   galeria   → a mídia privada, com visualização única marcada
//   locais    → a rota e os horários fora da rotina
//   audios    → os áudios, com transcrição
//
// e mais três que fecham o dossiê: `perfis` (contas vinculadas), `analise`
// (leitura comportamental) e os velhos `metricas`, `texto`, `lista`, `aviso`.
//
// O QUE ESTÁ AQUI É CONTEÚDO DE EXEMPLO. Ele existe para o sistema poder ser
// visto e testado de ponta a ponta hoje — o material definitivo descreve uma
// pessoa real nomeada pelo comprador, e essa é uma decisão sua, não minha.
// Enquanto não for trocado, todo cliente vê este mesmo texto.

export type LadoMensagem = "alvo" | "contato";

export type Bloco =
  /** Cartões de número. `destaque` pinta o valor de verde. */
  | {
      tipo: "metricas";
      itens: { rotulo: string; valor: string; nota?: string; destaque?: boolean }[];
    }
  /** Parágrafos corridos. */
  | { tipo: "texto"; paragrafos: string[] }
  /** Itens simples com título, detalhe e marca opcional. */
  | { tipo: "lista"; itens: { titulo: string; detalhe: string; marca?: string }[] }
  /** Print de conversa. É o bloco que carrega o relatório. */
  | {
      tipo: "conversa";
      contato: string;
      quando: string;
      mensagens: {
        de: LadoMensagem;
        texto: string;
        hora: string;
        /** Apagada pelo alvo e recuperada: ganha a tarja de recuperação. */
        recuperada?: boolean;
      }[];
      nota?: string;
    }
  /** Mídia encontrada. Sem arquivo: cada item mostra tipo, hora e origem. */
  | {
      tipo: "galeria";
      itens: {
        rotulo: string;
        hora: string;
        formato: "foto" | "video" | "audio" | "unica";
        origem?: string;
      }[];
      nota?: string;
    }
  /** Linha do tempo de localização. */
  | {
      tipo: "locais";
      itens: {
        local: string;
        detalhe: string;
        quando: string;
        /** Fora da rotina: destaca em âmbar. */
        foraDaRotina?: boolean;
      }[];
    }
  /** Mensagens de voz, com duração e transcrição. */
  | {
      tipo: "audios";
      itens: {
        de: LadoMensagem;
        duracao: string;
        hora: string;
        transcricao?: string;
      }[];
      nota?: string;
    }
  /** Contas e perfis ligados ao mesmo número ou aparelho. */
  | {
      tipo: "perfis";
      itens: {
        plataforma: string;
        identificador: string;
        detalhe: string;
        ativo?: boolean;
      }[];
    }
  /** Leitura comportamental: barra de 0 a 100 com uma nota. */
  | { tipo: "analise"; itens: { rotulo: string; valor: number; nota: string }[] }
  /** Caixa de aviso. `tom` muda a cor da borda. */
  | { tipo: "aviso"; titulo: string; texto: string; tom?: "alerta" | "neutro" };

export interface ConteudoSecao {
  blocos: Bloco[];
}

/**
 * Os números do acervo, mostrados no placar do topo.
 *
 * Ficam aqui, declarados, e não contando o que está renderizado abaixo: os
 * blocos mostram um recorte (a conversa que importa, as mídias do período),
 * como qualquer relatório faz, enquanto o placar fala do conjunto. Se o
 * placar contasse os itens na tela, ele diria "9 mensagens" embaixo de um
 * resumo que fala em 212 — e é essa divergência que faz um relatório
 * parecer inventado.
 *
 * Ao trocar o conteúdo, troque estes números junto: eles precisam bater com
 * as métricas que cada seção declara.
 */
export const ACERVO = {
  mensagens: 212,
  /** Apagadas no aparelho e restauradas do backup. */
  recuperadas: 17,
  midias: 23,
  audios: 11,
};

/** Indexado pelo `id` das seções em src/lib/relatorio.ts. */
export const CONTEUDO_EXEMPLO: Record<string, ConteudoSecao> = {
  /* ─────────────────────────── prévia ──────────────────────────────── */

  resumo: {
    blocos: [
      {
        tipo: "metricas",
        itens: [
          { rotulo: "Período analisado", valor: "30 dias", nota: "backup completo" },
          { rotulo: "Conversas localizadas", valor: "14", destaque: true },
          { rotulo: "Itens recuperados", valor: "212", nota: "mensagens, mídia e áudio" },
          { rotulo: "Status da extração", valor: "Concluída", destaque: true },
        ],
      },
      {
        tipo: "texto",
        paragrafos: [
          "A extração do backup terminou e os dados já estão indexados. As conversas e o resumo abrem imediatamente; o restante do dossiê é liberado em etapas, conforme o processamento de cada bloco é verificado.",
        ],
      },
      {
        tipo: "lista",
        itens: [
          {
            titulo: "Aparelho sincronizado",
            detalhe: "Android · último espelhamento concluído sem erros.",
            marca: "ativo",
          },
          {
            titulo: "Integridade do backup",
            detalhe: "Nenhum bloco corrompido. 212 de 212 itens legíveis.",
            marca: "100%",
          },
        ],
      },
    ],
  },

  conversas: {
    blocos: [
      {
        tipo: "conversa",
        contato: "Contato não salvo · (43) 9 ••••-4182",
        quando: "Ontem",
        mensagens: [
          { de: "contato", texto: "chegou bem?", hora: "23:14" },
          { de: "alvo", texto: "cheguei agora, tudo tranquilo aqui", hora: "23:16" },
          { de: "contato", texto: "amanhã no mesmo horário?", hora: "23:21" },
          {
            de: "alvo",
            texto: "melhor depois das 19, antes não dá",
            hora: "23:46",
            recuperada: true,
          },
          { de: "alvo", texto: "foi ótimo te ver hoje", hora: "23:52" },
        ],
        nota: "Conversa com contato fora da agenda. Uma mensagem foi apagada pelo alvo e restaurada do backup.",
      },
      {
        tipo: "lista",
        itens: [
          {
            titulo: "(43) 9 ••••-4182",
            detalhe: "38 mensagens · atividade concentrada entre 22h e 02h.",
            marca: "mais ativo",
          },
          {
            titulo: "Grupo “Equipe — Plantão”",
            detalhe: "61 mensagens · nenhuma anomalia de horário.",
            marca: "rotina",
          },
          {
            titulo: "(43) 9 ••••-7730",
            detalhe: "12 mensagens · conversa arquivada manualmente.",
            marca: "arquivada",
          },
        ],
      },
    ],
  },

  /* ───────────────── liberadas quando o prazo vence ─────────────────── */

  apagadas: {
    blocos: [
      {
        tipo: "aviso",
        titulo: "17 mensagens foram apagadas e restauradas",
        texto:
          "Apagar no aparelho não remove o registro do backup. O que está abaixo foi reconstruído a partir dele, com o horário original de envio.",
      },
      {
        tipo: "conversa",
        contato: "Contato não salvo · (43) 9 ••••-4182",
        quando: "Últimos 7 dias",
        mensagens: [
          {
            de: "alvo",
            texto: "apaga essa conversa depois, por favor",
            hora: "01:12",
            recuperada: true,
          },
          { de: "contato", texto: "já apaguei a minha", hora: "01:14" },
          {
            de: "alvo",
            texto: "se perguntarem eu tava no plantão",
            hora: "01:19",
            recuperada: true,
          },
          {
            de: "contato",
            texto: "combinado. mesma hora sexta",
            hora: "01:21",
            recuperada: true,
          },
        ],
        nota: "Três das quatro mensagens haviam sido apagadas dos dois lados.",
      },
      {
        tipo: "metricas",
        itens: [
          { rotulo: "Apagadas e recuperadas", valor: "17", destaque: true },
          { rotulo: "Apagadas nos dois lados", valor: "9" },
          { rotulo: "Janela mais frequente", valor: "00h–03h" },
          { rotulo: "Contatos envolvidos", valor: "2" },
        ],
      },
    ],
  },

  midia: {
    blocos: [
      {
        tipo: "galeria",
        itens: [
          { rotulo: "Foto enviada", hora: "Ontem, 23h40", formato: "unica", origem: "(43) 9 ••••-4182" },
          { rotulo: "Foto recebida", hora: "Ontem, 23h44", formato: "foto", origem: "(43) 9 ••••-4182" },
          { rotulo: "Vídeo enviado", hora: "Sáb, 01h07", formato: "video", origem: "(43) 9 ••••-4182" },
          { rotulo: "Foto enviada", hora: "Sáb, 01h11", formato: "unica", origem: "(43) 9 ••••-4182" },
          { rotulo: "Foto recebida", hora: "Qui, 22h58", formato: "foto", origem: "(43) 9 ••••-7730" },
          { rotulo: "Vídeo recebido", hora: "Qua, 00h19", formato: "video", origem: "(43) 9 ••••-4182" },
        ],
        nota: "Itens marcados como visualização única desapareceram do aparelho depois de abertos — a cópia do backup permanece.",
      },
      {
        tipo: "metricas",
        itens: [
          { rotulo: "Mídias fora da galeria", valor: "23", destaque: true },
          { rotulo: "Visualização única", valor: "8" },
          { rotulo: "Enviadas pelo alvo", valor: "14" },
          { rotulo: "Período", valor: "30 dias" },
        ],
      },
    ],
  },

  audios: {
    blocos: [
      {
        tipo: "audios",
        itens: [
          {
            de: "contato",
            duracao: "0:47",
            hora: "01:12",
            transcricao: "“não consigo falar agora, te mando áudio quando ela dormir”",
          },
          {
            de: "alvo",
            duracao: "1:23",
            hora: "02:38",
            transcricao: "“pode falar, tô sozinho. amanhã eu dou um jeito de sair mais cedo”",
          },
          {
            de: "contato",
            duracao: "0:19",
            hora: "03:04",
            transcricao: "“então tá, mesma hora. apaga esse aqui depois”",
          },
        ],
        nota: "Três áudios enviados entre 01h e 03h, dois deles apagados em seguida e recuperados do backup.",
      },
      {
        tipo: "metricas",
        itens: [
          { rotulo: "Áudios interceptados", valor: "11", destaque: true },
          { rotulo: "Transcritos", valor: "11" },
          { rotulo: "Enviados de madrugada", valor: "7" },
          { rotulo: "Apagados depois", valor: "5" },
        ],
      },
    ],
  },

  localizacao: {
    blocos: [
      {
        tipo: "locais",
        itens: [
          {
            local: "Cambará, PR",
            detalhe: "a 4,2 km do endereço habitual",
            quando: "Ontem, 23h47",
            foraDaRotina: true,
          },
          {
            local: "Av. Brasil, 1.2••",
            detalhe: "parada de 2h18 fora do expediente",
            quando: "Sáb, 00h51",
            foraDaRotina: true,
          },
          {
            local: "Endereço residencial",
            detalhe: "permanência noturna habitual",
            quando: "Sex, 22h10",
          },
          {
            local: "Local de trabalho",
            detalhe: "dentro do horário declarado",
            quando: "Sex, 08h02",
          },
        ],
      },
      {
        tipo: "texto",
        paragrafos: [
          "A rota foi reconstruída a partir dos registros de localização anexados às mensagens. Paradas marcadas em âmbar estão fora do padrão das últimas quatro semanas.",
        ],
      },
    ],
  },

  contas: {
    blocos: [
      {
        tipo: "perfis",
        itens: [
          {
            plataforma: "WhatsApp",
            identificador: "(43) 9 ••••-2579",
            detalhe: "conta principal · foto alterada há 6 dias",
            ativo: true,
          },
          {
            plataforma: "WhatsApp Business",
            identificador: "(43) 9 ••••-2579",
            detalhe: "segunda conta no mesmo aparelho",
            ativo: true,
          },
          {
            plataforma: "Instagram",
            identificador: "@perfil_••••",
            detalhe: "vinculado ao mesmo número · 2 contas",
            ativo: true,
          },
          {
            plataforma: "Telegram",
            identificador: "+55 43 9 ••••-2579",
            detalhe: "último acesso há 2 dias",
          },
        ],
      },
      {
        tipo: "aviso",
        titulo: "Duas contas no mesmo aparelho",
        texto:
          "A segunda conta do WhatsApp concentra as conversas em horário noturno. É o padrão de quem separa o que não quer que apareça na conta principal.",
        tom: "alerta",
      },
    ],
  },

  /* ──────────────── upsell 1 — apps de relacionamento ──────────────── */
  //
  // O upsell vende isto na esteira: "encontramos um perfil de <alvo> em um
  // aplicativo de relacionamento", prometendo os 12 perfis sem desfoque, a
  // última atividade registrada e a região de uso. É o que esta seção tem
  // que entregar — quem pagou por ela chega aqui procurando exatamente
  // esses três itens.

  relacionamento: {
    blocos: [
      {
        tipo: "metricas",
        itens: [
          { rotulo: "Perfis compatíveis", valor: "12", destaque: true },
          { rotulo: "Apps identificados", valor: "3" },
          { rotulo: "Última atividade", valor: "Ontem" },
          { rotulo: "Raio de uso", valor: "6 km" },
        ],
      },
      {
        tipo: "perfis",
        itens: [
          {
            plataforma: "App de relacionamento A",
            identificador: "Perfil ativo · 34 anos",
            detalhe: "Última atividade ontem, 23h18 · a 4 km do endereço habitual",
            ativo: true,
          },
          {
            plataforma: "App de relacionamento B",
            identificador: "Perfil ativo · foto recente",
            detalhe: "Bio alterada há 9 dias · 2 fotos novas no período",
            ativo: true,
          },
          {
            plataforma: "App de relacionamento C",
            identificador: "Perfil inativo",
            detalhe: "Sem atividade registrada nos últimos 30 dias",
          },
        ],
      },
      {
        tipo: "locais",
        itens: [
          {
            local: "Região central",
            detalhe: "onde o perfil apareceu para outras pessoas",
            quando: "Últimos 7 dias",
            foraDaRotina: true,
          },
          {
            local: "Raio aproximado de 6 km",
            detalhe: "cobre o endereço habitual e o trajeto do trabalho",
            quando: "Período analisado",
          },
        ],
      },
      {
        tipo: "texto",
        paragrafos: [
          "Conteúdo de exemplo da seção do adicional. Edite a chave `relacionamento` em src/lib/conteudo-exemplo.ts com o material real.",
        ],
      },
    ],
  },

  /* ───────────────────────── upsell 2 ──────────────────────────────── */
  //
  // Não sei o que o upsell 2 vende — ele não está no projeto do upsell, que
  // só tem uma oferta configurada. Esta seção existe com a estrutura pronta
  // para receber o material; troque o título em SECOES (src/lib/relatorio.ts)
  // e os blocos aqui.

  extra: {
    blocos: [
      {
        tipo: "aviso",
        titulo: "Seção a definir",
        texto:
          "O conteúdo do segundo adicional ainda não foi preenchido. Edite a chave `extra` em src/lib/conteudo-exemplo.ts e o título em SECOES.",
        tom: "neutro",
      },
    ],
  },

  ia: {
    blocos: [
      {
        tipo: "analise",
        itens: [
          {
            rotulo: "Atividade fora do horário",
            valor: 78,
            nota: "78% das mensagens do contato principal entre 22h e 03h.",
          },
          {
            rotulo: "Mensagens apagadas",
            valor: 64,
            nota: "17 de 38 mensagens da conversa foram removidas do aparelho.",
          },
          {
            rotulo: "Deslocamentos fora da rotina",
            valor: 41,
            nota: "2 de 5 paradas noturnas fora do padrão das últimas semanas.",
          },
          {
            rotulo: "Consistência com a rotina declarada",
            valor: 22,
            nota: "Quanto menor, maior a divergência entre o relato e o registro.",
          },
        ],
      },
      {
        tipo: "texto",
        paragrafos: [
          "A leitura cruza horário, frequência e o que foi apagado. Ela aponta padrão, não intenção: o que o relatório mostra é que a atividade com um contato específico se concentra na madrugada e some do aparelho logo depois.",
          "O conjunto dos dados está acima, item por item, com data e hora de cada registro. A conclusão é sua.",
        ],
      },
    ],
  },
};
