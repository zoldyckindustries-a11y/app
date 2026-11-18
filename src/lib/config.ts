// Configuração da plataforma.
//
// Tudo que muda entre campanhas mora aqui. O prazo de liberação em especial:
// ele aparece na contagem regressiva, no texto da página e no cálculo do que
// o servidor envia — então precisa ter uma fonte única.

/**
 * Dias entre a entrada do lead e a liberação completa do relatório.
 *
 * A âncora é `criadoEm` da conta (primeira entrada), não a data do pagamento:
 * é o que o lead consegue verificar e o que a plataforma controla.
 */
export const PRAZO_DIAS = 7;

export const PRAZO_MS = PRAZO_DIAS * 24 * 60 * 60 * 1000;

/** Quanto tempo uma sessão dura antes de pedir telefone e código de novo. */
export const SESSAO_DIAS = 180;

/** Nome do cookie de sessão. */
export const COOKIE_SESSAO = "plataforma_sessao";

/**
 * Cookie que o funil grava com `Domain=.zaplens.online`, lido aqui para a
 * entrada automática. Precisa ser idêntico ao `COOKIE_PONTE` do funil
 * (src/lib/upsell.ts de lá) e do upsell (src/lib/lead.ts de lá).
 */
export const COOKIE_PONTE = "upsell_lead";

/**
 * Prefixo da chave que o funil grava no Redis dele. Contrato entre os
 * projetos — só leitura aqui.
 *
 * As contas e as sessões desta plataforma não usam Redis: estão no Postgres,
 * nas tabelas `plataforma_contas` e `plataforma_sessoes` (src/lib/esquema.ts).
 */
export const LEAD_KEY_PREFIX = "upsell:lead:";

/** Para onde mandar quem chega sem conta e sem pagamento. */
export const URL_VENDAS =
  process.env.NEXT_PUBLIC_URL_VENDAS ?? "https://zaplens.online";
