// Acesso livre em desenvolvimento.
//
// Em produção a entrada depende de telefone + código de acesso (ou do cookie
// que o funil deixa). Rodando em localhost isso trava o trabalho: não há
// banco, não há conta e nenhum código existe para digitar — a página de
// entrada se torna um beco sem saída.
//
// Então, só localmente, a plataforma trabalha com uma CONTA DE DEMONSTRAÇÃO:
// quem abre `/` ou `/relatorio` cai direto no relatório, sem login.
//
// O portão tem duas trancas, porque um bypass de autenticação que escapa para
// produção é o pior tipo de bug:
//
//   • `next dev` (NODE_ENV !== "production")  → ligado, a não ser que você
//     desligue com PLATAFORMA_ACESSO_LIVRE=0 (útil para testar o formulário
//     de entrada de verdade).
//   • build de produção (`npm run start`, Worker) → precisa das DUAS coisas:
//     PLATAFORMA_ACESSO_LIVRE=1 **e** host local (localhost / 127.0.0.1 /
//     ::1). No domínio publicado o host nunca é local, então mesmo que a
//     variável vaze para o deploy o acesso continua fechado.

import type { Conta } from "./conta";

const FLAG = (process.env.PLATAFORMA_ACESSO_LIVRE ?? "").trim().toLowerCase();
const LIGADO_NA_MAO = FLAG === "1" || FLAG === "true" || FLAG === "on";
const DESLIGADO_NA_MAO = FLAG === "0" || FLAG === "false" || FLAG === "off";

const EM_DESENVOLVIMENTO = process.env.NODE_ENV !== "production";

/** Host sem porta, como o navegador manda. */
function hostLocal(host: string): boolean {
  const limpo = (host ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  const semColchetes = limpo.replace(/^\[|\]$/g, "");
  return (
    semColchetes === "localhost" ||
    semColchetes === "127.0.0.1" ||
    semColchetes === "::1" ||
    semColchetes === "0.0.0.0" ||
    semColchetes.endsWith(".localhost")
  );
}

/**
 * O acesso sem código está valendo para esta requisição?
 *
 * `host` vem do cabeçalho da requisição; sem ele, só o modo de
 * desenvolvimento libera.
 */
export function acessoLivre(host = ""): boolean {
  if (DESLIGADO_NA_MAO) return false;
  if (EM_DESENVOLVIMENTO) return true;
  return LIGADO_NA_MAO && hostLocal(host);
}

/**
 * Quantos dias atrás a conta de demonstração "entrou".
 *
 * Zero (o padrão) reproduz o que um cliente novo vê: prévia aberta, resto
 * com cadeado e contagem regressiva correndo. Para ver o relatório inteiro
 * aberto sem esperar, use PLATAFORMA_DEV_DIAS=8 no .env.local.
 */
const DIAS_ATRAS = (() => {
  const n = Number((process.env.PLATAFORMA_DEV_DIAS ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
})();

/** Fixado na carga do módulo para a contagem não reiniciar a cada reload. */
const CRIADO_EM = Date.now() - DIAS_ATRAS * 24 * 60 * 60 * 1000;

/**
 * A conta usada quando o acesso está livre. Não existe no banco.
 *
 * Vem com os dois upsells ligados: localmente o ponto é conseguir ver tudo
 * que a plataforma entrega, inclusive as seções que só quem comprou o
 * adicional recebe. Para testar a visão de quem comprou só o principal, use
 * PLATAFORMA_DEV_UPSELLS=0.
 */
const COM_UPSELLS = (process.env.PLATAFORMA_DEV_UPSELLS ?? "").trim() !== "0";

export const CONTA_DEMO: Conta = {
  telefone: "11900000000",
  email: "local@exemplo.dev",
  comprador: "Comprador Local",
  nome: (process.env.PLATAFORMA_DEV_NOME ?? "Visitante Local").trim(),
  cidade: "São Paulo",
  estado: "SP",
  alvoTelefone: "43998392579",
  codigo: "000000",
  criadoEm: CRIADO_EM,
  pago: true,
  upsell1: COM_UPSELLS,
  upsell2: COM_UPSELLS,
  demo: true,
};
