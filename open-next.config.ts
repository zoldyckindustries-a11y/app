// Configuração do adapter OpenNext para Cloudflare Workers.
//
// Versionado de propósito: quando não existe, `opennextjs-cloudflare build`
// gera um sozinho e deduz o nome do Worker do `name` do package.json — que
// quase nunca é o nome do Worker publicado. Essa divergência quebra o
// service binding WORKER_SELF_REFERENCE de wrangler.jsonc.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig({
  // Sem `incrementalCache`: tudo aqui é por sessão e muda por pessoa, não há
  // ISR para cachear. Para ligar o cache R2, importe o override e declare o
  // binding NEXT_INC_CACHE_R2_BUCKET em wrangler.jsonc.
  // https://opennext.js.org/cloudflare/caching
});

// O adapter faz o build do Next chamando `npm run build` por padrão. Como o
// script `build` daqui é o build do Worker — para o Workers Builds funcionar
// com o comando padrão —, o padrão causaria recursão infinita.
config.buildCommand = "npm run build:next";

export default config;
