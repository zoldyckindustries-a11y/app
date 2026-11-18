"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** "(43) 9 9999-9999" conforme a pessoa digita. */
function mascararTelefone(bruto: string): string {
  const d = bruto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function FormularioEntrada() {
  const router = useRouter();
  const [telefone, setTelefone] = useState("");
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const digitos = telefone.replace(/\D/g, "");
  const podeEnviar = digitos.length >= 10 && codigo.length === 6 && !enviando;

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!podeEnviar) return;

    setEnviando(true);
    setErro("");
    try {
      const res = await fetch("/api/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefone: digitos, codigo }),
      });
      if (!res.ok) {
        const corpo = await res.json().catch(() => ({}));
        setErro(corpo?.erro ?? "Não consegui entrar. Tente de novo.");
        return;
      }
      // replace, não push: o botão voltar não deve retornar ao login.
      router.replace("/relatorio");
      router.refresh();
    } catch {
      setErro("Sem conexão. Verifique a internet e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="mt-6 space-y-4" noValidate>
      <div>
        <label
          htmlFor="telefone"
          className="mb-1.5 block text-[13px] font-medium text-texto-mute"
        >
          Telefone da compra
        </label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="(00) 0 0000-0000"
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          className="w-full rounded-xl border border-base-line bg-base-card px-4 py-3 text-[15px] text-texto placeholder:text-texto-dim focus:border-acento focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="codigo"
          className="mb-1.5 block text-[13px] font-medium text-texto-mute"
        >
          Código de acesso
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full rounded-xl border border-base-line bg-base-card px-4 py-3 font-mono text-[18px] tracking-[0.3em] text-texto placeholder:tracking-[0.3em] placeholder:text-texto-dim focus:border-acento focus:outline-none"
        />
      </div>

      {erro ? (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[13px] leading-snug text-red-300"
        >
          {erro}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!podeEnviar}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-acento px-4 py-3.5 text-[15px] font-semibold text-white transition enabled:hover:bg-acento-deep disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enviando ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Entrando
          </>
        ) : (
          "Entrar"
        )}
      </button>
    </form>
  );
}
