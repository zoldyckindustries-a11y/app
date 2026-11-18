// Conferência do X-Webhook-Signature da PerfectPay.
//
// O problema: a doc oficial manda conferir o header contra o "Signing
// secret" do painel, mas NÃO publica o algoritmo. Chutar e rejeitar o que
// não bate seria o pior dos mundos — um palpite errado derruba todos os
// postbacks e nenhuma venda é entregue, silenciosamente.
//
// A saída: tentar as construções plausíveis e DIZER qual delas bateu. Em
// modo normal a divergência só é registrada (a chave na URL e o token já
// autenticam); quando a primeira entrega real mostrar a variante certa,
// PERFECTPAY_ASSINATURA_ESTRITA=1 passa a exigir assinatura válida.
//
// O segredo tem o formato `whsec_<64 hex>`, que é a convenção do Standard
// Webhooks/Svix — por isso as variantes incluem tanto o esquema deles
// (id.timestamp.corpo, chave em base64) quanto o HMAC direto do corpo.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Nome da variante que bateu. Guardado para a gente parar de adivinhar. */
export type Variante = string;

function chavesCandidatas(segredo: string): [string, Buffer][] {
  const semPrefixo = segredo.startsWith("whsec_") ? segredo.slice(6) : segredo;
  const candidatas: [string, Buffer][] = [
    ["segredo-cru", Buffer.from(segredo, "utf8")],
    ["sem-prefixo", Buffer.from(semPrefixo, "utf8")],
  ];
  if (/^[0-9a-f]+$/i.test(semPrefixo) && semPrefixo.length % 2 === 0) {
    candidatas.push(["hex-decodificado", Buffer.from(semPrefixo, "hex")]);
  }
  try {
    const b64 = Buffer.from(semPrefixo, "base64");
    if (b64.length > 0) candidatas.push(["base64-decodificado", b64]);
  } catch {
    // base64 inválido: só não entra na lista.
  }
  return candidatas;
}

/** Tira `sha256=`, `v1,` e afins, e separa assinaturas múltiplas. */
function assinaturasDoHeader(header: string): string[] {
  return header
    .split(/[\s,]+/)
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((parte) => {
      const i = parte.indexOf("=");
      // `v1=abc` e `sha256=abc` viram `abc`; base64 terminado em "=" não é
      // cortado, porque aí o "=" está no fim, não no meio.
      if (i > 0 && i < parte.length - 1) return parte.slice(i + 1);
      return parte;
    })
    .filter(Boolean);
}

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

/**
 * Confere a assinatura e devolve o nome da variante que bateu, ou null.
 *
 * `corpo` precisa ser o texto CRU da requisição: reserializar o JSON muda
 * espaços e ordem de chaves, e qualquer HMAC passa a dar diferente.
 */
export function conferirAssinatura(
  corpo: string,
  header: string,
  segredo: string,
  cabecalhos?: { id?: string; timestamp?: string }
): Variante | null {
  if (!header || !segredo) return null;

  const recebidas = assinaturasDoHeader(header);
  if (!recebidas.length) return null;

  const mensagens: [string, string][] = [["corpo", corpo]];
  if (cabecalhos?.id && cabecalhos?.timestamp) {
    // Esquema do Standard Webhooks: id.timestamp.corpo
    mensagens.push([
      "id.ts.corpo",
      `${cabecalhos.id}.${cabecalhos.timestamp}.${corpo}`,
    ]);
  }
  if (cabecalhos?.timestamp) {
    mensagens.push(["ts.corpo", `${cabecalhos.timestamp}.${corpo}`]);
  }

  for (const [nomeChave, chave] of chavesCandidatas(segredo)) {
    for (const [nomeMsg, mensagem] of mensagens) {
      for (const codificacao of ["hex", "base64"] as const) {
        const calculada = createHmac("sha256", chave)
          .update(mensagem, "utf8")
          .digest(codificacao);
        for (const recebida of recebidas) {
          if (iguais(calculada, recebida)) {
            return `${nomeChave}/${nomeMsg}/${codificacao}`;
          }
        }
      }
    }
  }
  return null;
}

/** Só exige assinatura válida depois que a variante certa for conhecida. */
export function assinaturaEstrita(): boolean {
  const v = (process.env.PERFECTPAY_ASSINATURA_ESTRITA ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}
