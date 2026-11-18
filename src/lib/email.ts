// Entrega do acesso por e-mail.
//
// Via API HTTP do Resend, com `fetch` em vez do SDK: a plataforma roda em
// Cloudflare Workers, e uma dependência a menos é uma superfície a menos no
// bundle. Funciona igual no `next dev`.
//
// É OPCIONAL em runtime, de propósito: sem RESEND_API_KEY o postback segue
// criando a conta e só registra que não enviou. O acesso nunca pode depender
// do provedor de e-mail estar configurado.

const ENDPOINT = "https://api.resend.com/emails";

export function emailConfigurado(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_REMETENTE);
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function primeiroNome(nome: string): string {
  const parte = (nome ?? "").trim().split(/\s+/)[0] ?? "";
  if (!parte) return "";
  return parte.charAt(0).toUpperCase() + parte.slice(1).toLowerCase();
}

/**
 * O e-mail de entrega.
 *
 * Carrega as duas formas de entrar, porque elas falham por motivos
 * diferentes: o link mágico é um clique mas morre em 30 dias, e o código de
 * 6 dígitos é chato de digitar mas funciona para sempre, de qualquer
 * aparelho. Quem perde o e-mail ainda tem o código no rodapé do relatório.
 */
export async function enviarAcesso(dados: {
  email: string;
  nome: string;
  codigo: string;
  token: string;
  /** Origem da requisição, para montar o link no mesmo host. */
  origem: string;
}): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY ?? "";
  const remetente = process.env.EMAIL_REMETENTE ?? "";
  if (!chave || !remetente) {
    console.warn("[email] RESEND_API_KEY/EMAIL_REMETENTE ausentes — não enviei");
    return false;
  }

  // URL_APP (variável de runtime) antes de NEXT_PUBLIC_URL_APP: o Next
  // substitui tudo que começa com NEXT_PUBLIC_ no momento do build, então
  // uma variável desse prefixo cadastrada só no painel da Cloudflare chega
  // aqui como undefined. A origem da requisição é a última rede, e para o
  // postback ela já é o próprio domínio da plataforma.
  const base = (
    process.env.URL_APP ??
    process.env.NEXT_PUBLIC_URL_APP ??
    dados.origem
  ).replace(/\/$/, "");
  const link = `${base}/e/${dados.token}`;
  const nome = primeiroNome(dados.nome);

  const html = `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:24px;background:#0B141A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto">
    <tr><td>
      <p style="margin:0 0 20px;color:#25D366;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Detective White</p>

      <h1 style="margin:0 0 12px;color:#E9EDEF;font-size:22px;line-height:1.3;font-weight:700">
        ${nome ? `${escapar(nome)}, seu` : "Seu"} relatório está liberado
      </h1>
      <p style="margin:0 0 24px;color:#AEBAC1;font-size:15px;line-height:1.6">
        A extração foi concluída e o seu acesso está pronto. Toque no botão
        para abrir — não precisa digitar nada.
      </p>

      <a href="${escapar(link)}"
         style="display:block;padding:16px;background:#25D366;color:#0B141A;font-size:16px;font-weight:700;text-align:center;text-decoration:none;border-radius:12px">
        Abrir meu relatório
      </a>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#111B21;border:1px solid #2A3942;border-radius:12px">
        <tr><td style="padding:16px">
          <p style="margin:0 0 6px;color:#8696A0;font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase">Seu código de acesso</p>
          <p style="margin:0;color:#E9EDEF;font-size:28px;font-weight:700;letter-spacing:7px;font-family:ui-monospace,Menlo,monospace">${escapar(dados.codigo)}</p>
          <p style="margin:10px 0 0;color:#8696A0;font-size:13px;line-height:1.5">
            Guarde este código. Com ele e o telefone da sua compra você entra
            de qualquer aparelho, mesmo depois que este link expirar.
          </p>
        </td></tr>
      </table>

      <p style="margin:0 0 8px;color:#8696A0;font-size:13px;line-height:1.6">
        Parte do relatório abre agora e o restante é liberado em 7 dias — a
        contagem aparece dentro da plataforma.
      </p>
      <p style="margin:0;color:#8696A0;font-size:12px;line-height:1.6">
        Se o botão não funcionar, copie este endereço:<br>
        <span style="color:#AEBAC1;word-break:break-all">${escapar(link)}</span>
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  const texto = [
    `${nome ? `${nome}, seu` : "Seu"} relatório está liberado.`,
    "",
    `Abrir: ${link}`,
    "",
    `Código de acesso: ${dados.codigo}`,
    "Com ele e o telefone da sua compra você entra de qualquer aparelho.",
  ].join("\n");

  const resposta = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${chave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: remetente,
      to: [dados.email],
      subject: "Seu relatório está liberado — acesso e código",
      html,
      text: texto,
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text().catch(() => "");
    throw new Error(`Resend ${resposta.status}: ${corpo.slice(0, 300)}`);
  }
  return true;
}
