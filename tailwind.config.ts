import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        // Mesma paleta do funil (src/app/components/PitchPage.tsx de lá): o
        // WhatsApp escuro. Quem compra vê a oferta em verde sobre #0B141A e
        // cai aqui — se a área logada fosse azul, pareceria outro produto, e
        // o que a pessoa está procurando é exatamente a tela que viu antes.
        base: {
          DEFAULT: "#0B141A", // fundo do app
          raise: "#111B21", // painel
          card: "#182229", // cartão sobre o painel
          panel: "#202C33", // barra do chat, balão recebido
          line: "#2A3942", // divisórias
        },
        texto: {
          DEFAULT: "#E9EDEF",
          mute: "#AEBAC1",
          dim: "#8696A0",
        },
        zap: {
          DEFAULT: "#25D366", // verde da marca
          soft: "#4ADE80",
          deep: "#005C4B", // balão enviado
          dark: "#16A34A",
        },
        /** Azul do visto-por-último. Só nos tiques — não é cor de interface. */
        tick: "#53BDEB",
        alerta: "#F59E0B",
        perigo: "#EF4444",

        // Nomes antigos mantidos como apelido para a tela de entrada não
        // divergir da paleta nova.
        acento: { DEFAULT: "#25D366", soft: "#4ADE80", deep: "#005C4B" },
        ok: "#25D366",
        trava: "#F59E0B",
      },
      keyframes: {
        subir: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulsar: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        eco: {
          "0%": { transform: "scale(1)", opacity: "0.45" },
          "100%": { transform: "scale(2.4)", opacity: "0" },
        },
        brilho: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        subir: "subir 420ms cubic-bezier(0.16,1,0.3,1) both",
        pulsar: "pulsar 2s ease-in-out infinite",
        eco: "eco 2.2s ease-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
