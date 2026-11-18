// O contrato do postback da PerfectPay.
//
// Campos conforme a documentação oficial (app.perfectpay.com.br/docs/api/
// webhooks), formato "PerfectPay". O que é verificado aqui foi conferido na
// doc; o que não está documentado está marcado como tal, porque chutar nome
// de campo quebra em produção e silenciosamente.

/** Status da venda. `approved` é 2 — 8, 10 e 16 chegam normalizados nele. */
export const APROVADO = 2;

/** Status que tiram o acesso. 6 cancelado, 7 estornado, 9 chargeback. */
export const PERDEU_ACESSO = new Set([6, 7, 9]);

export interface PayloadPerfectPay {
  /** Token público de 32 caracteres. NÃO autentica — ver abaixo. */
  token?: string;
  /** Identificador único da venda. É a chave da idempotência. */
  code?: string;
  sale_status_enum?: number;
  sale_status_enum_key?: string;
  date_approved?: string;
  product?: { code?: string; name?: string; external_reference?: string };
  plan?: { code?: string; name?: string; offer_name?: string };
  customer?: {
    full_name?: string;
    email?: string;
    phone_extension?: string;
    phone_area_code?: string;
    phone_number?: string;
    phone_formated?: string;
    phone_formated_ddi?: string;
    identification_number?: string;
  };
  /** Sempre com as 8 chaves, `null` no que não foi capturado. */
  metadata?: {
    src?: string | null;
    sck?: string | null;
    utm_source?: string | null;
    utm_medium?: string | null;
    utm_campaign?: string | null;
    utm_content?: string | null;
    utm_term?: string | null;
    ttclid?: string | null;
  };
}

/**
 * Telefone do comprador, junto do DDD.
 *
 * Não existe campo `phone`: a doc lista `phone_area_code` + `phone_number`, e
 * `phone_formated_ddi` em E.164. O formatado é a melhor fonte quando vem,
 * porque já traz o DDI e evita um DDD perdido.
 */
export function telefoneDoComprador(p: PayloadPerfectPay): string {
  const c = p.customer ?? {};
  const candidatos = [
    c.phone_formated_ddi,
    `${c.phone_area_code ?? ""}${c.phone_number ?? ""}`,
    c.phone_formated,
  ];
  for (const bruto of candidatos) {
    let d = (bruto ?? "").replace(/\D/g, "");
    if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
    if (d.length === 10 || d.length === 11) return d;
  }
  return "";
}

/**
 * O `lid` do funil, se ele voltou.
 *
 * A doc só garante o eco de `src`, `sck` e das UTMs — `lid` não tem lugar
 * documentado no payload. Por isso o funil precisa carimbar o lid também em
 * `?src=`, e aqui procuramos nas três chaves plausíveis, em ordem. Sem lid,
 * a conta nasce assim mesmo: o alvo entra depois, pelo cookie ou pela mão.
 */
export function lidDoPayload(p: PayloadPerfectPay): string {
  const m = p.metadata ?? {};
  for (const valor of [m.src, m.sck, m.utm_content]) {
    const limpo = (valor ?? "").trim();
    if (/^[A-Za-z0-9_-]{4,64}$/.test(limpo)) return limpo;
  }
  return "";
}

export type Oferta = "principal" | "upsell1" | "upsell2" | "desconhecida";

/**
 * Qual oferta foi comprada.
 *
 * O mapa vem do ambiente porque os códigos são do painel, não do código —
 * e porque na primeira venda real eles aparecem em `plataforma_vendas`, de
 * onde se lê o valor certo sem adivinhar. Um código desconhecido NÃO vira
 * principal por engano: ele é registrado e fica visível para configuração.
 */
export function identificarOferta(p: PayloadPerfectPay): Oferta {
  const codigos = [p.product?.code, p.plan?.code, p.product?.external_reference]
    .map((c) => (c ?? "").trim().toUpperCase())
    .filter(Boolean);

  const mapa: [Oferta, string][] = [
    ["principal", process.env.PERFECTPAY_PRODUTO_PRINCIPAL ?? ""],
    ["upsell1", process.env.PERFECTPAY_PRODUTO_UPSELL1 ?? ""],
    ["upsell2", process.env.PERFECTPAY_PRODUTO_UPSELL2 ?? ""],
  ];

  for (const [oferta, configurado] of mapa) {
    const aceitos = configurado
      .split(/[,\s]+/)
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (aceitos.some((a) => codigos.includes(a))) return oferta;
  }
  return "desconhecida";
}
