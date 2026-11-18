// Ponto de entrada do bundle que o scripts/liberar.mjs importa.
//
// Existe só para o esbuild ter um arquivo com os imports já resolvidos pelo
// TypeScript: os módulos em src/lib importam sem extensão (`./config`), o
// que o Node puro não resolve, mas o esbuild sim.
//
// Não acrescenta lógica nenhuma — é um repasse.

export {
  criarLinkAcesso,
  lerConta,
  registrarVenda,
  revogarVenda,
} from "../src/lib/conta";

export { emailConfigurado, enviarAcesso } from "../src/lib/email";
