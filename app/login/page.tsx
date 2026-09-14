"use client";

import { useAuth } from "@/lib/useAuth";
import { Persona } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PIN_STORAGE_KEY = "gastos-pareja:pin-ok";
const PIN_CONFIGURADO = process.env.NEXT_PUBLIC_APP_PIN ?? "";

export default function LoginPage() {
  const { usuario, cargando, elegirUsuario } = useAuth();
  const router = useRouter();
  const [pinValidado, setPinValidado] = useState(!PIN_CONFIGURADO);
  const [pin, setPin] = useState("");
  const [errorPin, setErrorPin] = useState(false);

  useEffect(() => {
    // Lee el PIN validado guardado en este dispositivo (localStorage).
    if (PIN_CONFIGURADO) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPinValidado(window.localStorage.getItem(PIN_STORAGE_KEY) === "1");
    }
  }, []);

  useEffect(() => {
    if (!cargando && usuario) {
      router.replace("/");
    }
  }, [cargando, usuario, router]);

  function confirmarPin(e: React.FormEvent) {
    e.preventDefault();
    if (pin === PIN_CONFIGURADO) {
      window.localStorage.setItem(PIN_STORAGE_KEY, "1");
      setPinValidado(true);
      setErrorPin(false);
    } else {
      setErrorPin(true);
      setPin("");
    }
  }

  function seleccionar(persona: Persona) {
    elegirUsuario(persona);
    router.replace("/");
  }

  if (cargando) return null;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-10 bg-background px-6 py-[calc(2rem+var(--safe-top))]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">Gastos Pareja</h1>
        <p className="mt-1 text-sm text-muted">
          Control de gastos compartidos
        </p>
      </div>

      {!pinValidado ? (
        <form
          onSubmit={confirmarPin}
          className="flex w-full max-w-xs flex-col items-center gap-4"
        >
          <label htmlFor="pin" className="text-sm font-medium text-muted">
            Ingresá el PIN
          </label>
          <input
            id="pin"
            type="tel"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, ""));
              setErrorPin(false);
            }}
            className="w-full rounded-2xl border border-border bg-surface px-4 py-4 text-center text-3xl font-semibold tracking-[0.4em] text-foreground outline-none focus:border-accent"
            placeholder="••••"
            autoFocus
          />
          {errorPin && (
            <p className="text-sm font-medium text-red-600">PIN incorrecto</p>
          )}
          <button
            type="submit"
            disabled={pin.length === 0}
            className="min-h-[44px] w-full rounded-2xl bg-accent px-4 py-3 text-base font-semibold text-white active:opacity-80 disabled:opacity-40"
          >
            Continuar
          </button>
        </form>
      ) : (
        <div className="flex w-full max-w-xs flex-col gap-4">
          <p className="text-center text-sm font-medium text-muted">
            ¿Quién sos?
          </p>
          <button
            onClick={() => seleccionar("Lolo")}
            className="min-h-[64px] w-full rounded-2xl bg-accent text-xl font-bold text-white shadow-sm active:opacity-80"
          >
            Lolo
          </button>
          <button
            onClick={() => seleccionar("Jaz")}
            className="min-h-[64px] w-full rounded-2xl bg-[#e87ba4] text-xl font-bold text-white shadow-sm active:opacity-80"
          >
            Jaz
          </button>
        </div>
      )}
    </main>
  );
}
