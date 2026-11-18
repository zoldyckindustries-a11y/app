// Libera acesso na mão.
//
// O postback só dispara em venda nova — a PerfectPay não reenvia o que já
// aconteceu. Então quem comprou ANTES do webhook existir não tem conta, e é
// este script que cria. Também serve para suporte: reenviar o acesso, somar
// um upsell que não foi mapeado, consultar o código de alguém.
//
// Usa as mesmas funções da aplicação (src/lib/conta.ts), compiladas na hora
// com esbuild — mesmo padrão do testar-liberacao.mjs. Nada de SQL paralelo:
// um segundo caminho de escrita é um segundo conjunto de regras para
// divergir, e aqui se escreve em conta de cliente.
//
//   npm run liberar -- --telefone 43999998888 --email joao@x.com \
//                      --nome "João Pedro" --alvo 43999992222 \
//                      --alvo-nome "Maria" --upsell1 --enviar
//
//   npm run liberar -- --ver 43999998888        # consulta uma conta
//   npm run liberar -- --vendas                 # últimos postbacks recebidos
//   npm run liberar -- --produtos               # códigos de produto vistos

import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("DATABASE_URL não configurada. Use `npm run liberar -- ...`.");
  process.exit(1);
}

// A saída fica dentro de node_modules/.cache: o bundle precisa enxergar o
// node_modules do projeto para resolver `redis` e o driver do Neon, que
// ficam de fora (`external`) em vez de serem empacotados.
const cache = join(process.cwd(), "node_modules", ".cache", "plataforma");
mkdirSync(cache, { recursive: true });
const saida = join(cache, "lib.mjs");

await build({
  entryPoints: [join(process.cwd(), "scripts", "lib-entrada.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  external: ["redis", "@neondatabase/serverless"],
  outfile: saida,
  logLevel: "warning",
});

const { criarLinkAcesso, lerConta, registrarVenda, enviarAcesso, emailConfigurado } =
  await import(pathToFileURL(saida).href);

/* ───────────────────────── argumentos ──────────────────────────────── */

const args = process.argv.slice(2);
function opcao(nome) {
  const i = args.indexOf(`--${nome}`);
  if (i === -1) return undefined;
  const valor = args[i + 1];
  return valor && !valor.startsWith("--") ? valor : "";
}
const tem = (nome) => args.includes(`--${nome}`);

const sql = neon(url);

/* ─────────────────────────── consultas ─────────────────────────────── */

if (tem("vendas")) {
  const linhas = await sql`
    select code, status, telefone, email, produto_code, recebido_em
      from plataforma_vendas order by recebido_em desc limit 20`;
  if (!linhas.length) {
    console.log("Nenhum postback recebido ainda.");
  } else {
    console.log(`${linhas.length} postback(s) mais recentes:\n`);
    for (const l of linhas) {
      console.log(
        `  ${l.recebido_em.toISOString().slice(0, 16).replace("T", " ")}  ` +
          `status=${String(l.status).padStart(2)}  produto=${l.produto_code ?? "—"}  ` +
          `${l.telefone ?? "—"}  ${l.email ?? ""}`
      );
    }
  }
  process.exit(0);
}

if (tem("produtos")) {
  // Para descobrir o que colocar em PERFECTPAY_PRODUTO_* sem adivinhar.
  const linhas = await sql`
    select produto_code,
           count(*)::int as vendas,
           max(recebido_em) as ultima,
           (payload -> 'product' ->> 'name') as nome,
           (payload -> 'plan' ->> 'name') as plano
      from plataforma_vendas
     where produto_code is not null
     group by produto_code, nome, plano
     order by ultima desc`;
  if (!linhas.length) {
    console.log(
      "Nenhum produto visto ainda. Faça uma venda de teste em cada oferta:\n" +
        "o código aparece aqui e vai para PERFECTPAY_PRODUTO_PRINCIPAL/UPSELL1/UPSELL2."
    );
  } else {
    console.log("Códigos de produto já recebidos:\n");
    for (const l of linhas) {
      console.log(`  ${l.produto_code}  ${l.vendas}x  ${l.nome ?? ""} ${l.plano ? `/ ${l.plano}` : ""}`);
    }
  }
  process.exit(0);
}

const ver = opcao("ver");
if (ver !== undefined) {
  const conta = await lerConta(ver);
  if (!conta) {
    console.log(`Nenhuma conta para o telefone ${ver}.`);
    process.exit(1);
  }
  console.log(JSON.stringify(conta, null, 2));
  process.exit(0);
}

/* ────────────────────────── liberação ──────────────────────────────── */

const telefone = opcao("telefone");
if (!telefone) {
  console.error(
    "Faltou --telefone (o do COMPRADOR, que é o login).\n\n" +
      "  npm run liberar -- --telefone 43999998888 --email joao@x.com \\\n" +
      "                     --nome \"João Pedro\" --alvo 43999992222 \\\n" +
      "                     --alvo-nome \"Maria\" --upsell1 --enviar\n\n" +
      "  npm run liberar -- --ver <telefone> | --vendas | --produtos"
  );
  process.exit(1);
}

const resultado = await registrarVenda({
  telefone,
  email: opcao("email"),
  comprador: opcao("nome"),
  alvoTelefone: opcao("alvo"),
  alvoNome: opcao("alvo-nome"),
  cidade: opcao("cidade"),
  estado: opcao("estado"),
  // Sem --so-upsell, liberar sempre garante o relatório principal: quem
  // comprou o adicional obviamente comprou o principal antes.
  principal: !tem("so-upsell"),
  upsell1: tem("upsell1"),
  upsell2: tem("upsell2"),
});

if (!resultado) {
  console.error(
    `Telefone inválido: "${telefone}". Precisa ter 10 ou 11 dígitos com DDD.`
  );
  process.exit(1);
}

const { conta, nova } = resultado;
console.log(`${nova ? "Conta criada" : "Conta atualizada"}: ${conta.telefone}`);
console.log(`  código de acesso : ${conta.codigo}`);
console.log(`  principal        : ${conta.pago ? "sim" : "NÃO"}`);
console.log(`  upsell 1         : ${conta.upsell1 ? "sim" : "não"}`);
console.log(`  upsell 2         : ${conta.upsell2 ? "sim" : "não"}`);
console.log(`  alvo             : ${conta.nome || "—"} ${conta.alvoTelefone || ""}`);

// --link: gera o link de entrada sem enviar nada. É o que o suporte usa
// para mandar o acesso por WhatsApp quando o e-mail não chegou.
if (tem("link") && !tem("enviar")) {
  const token = await criarLinkAcesso(conta.telefone);
  const base = (process.env.NEXT_PUBLIC_URL_APP ?? "https://app.zaplens.online").replace(/\/$/, "");
  console.log(`\nLink de entrada (30 dias):\n  ${base}/e/${token}`);
}

if (tem("enviar")) {
  if (!conta.email) {
    console.error("\nSem --email não dá para enviar o acesso.");
    process.exit(1);
  }
  if (!emailConfigurado()) {
    console.error(
      "\nRESEND_API_KEY/EMAIL_REMETENTE ausentes — o acesso existe, mas não enviei."
    );
    process.exit(1);
  }
  const token = await criarLinkAcesso(conta.telefone);
  const base = (process.env.NEXT_PUBLIC_URL_APP ?? "https://app.zaplens.online").replace(/\/$/, "");
  await enviarAcesso({
    email: conta.email,
    nome: conta.comprador,
    codigo: conta.codigo,
    token,
    origem: base,
  });
  console.log(`\nAcesso enviado para ${conta.email}`);
  console.log(`  link: ${base}/e/${token}`);
}
