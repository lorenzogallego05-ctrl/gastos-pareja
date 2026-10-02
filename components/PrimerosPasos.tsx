"use client";

import { useState } from "react";
import Link from "next/link";

export interface Paso {
  id: string;
  texto: string;
  // Qué hacer para completarlo. El botón del próximo paso lleva acá.
  href: string;
  accion: string;
  hecho: boolean;
}

const STORAGE_KEY = "fairo:primeros_pasos_oculto";

// "Tus primeros pasos": en vez de una barra de progreso suelta, muestra
// cuál es el próximo paso concreto y un botón que lleva justo ahí. Una vez
// completados todos (o si la persona la cierra) la tarjeta no vuelve.
export default function PrimerosPasos({ pasos }: { pasos: Paso[] }) {
  const [oculto, setOculto] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const hechos = pasos.filter((p) => p.hecho).length;
  const proximo = pasos.find((p) => !p.hecho);

  if (oculto || !proximo) return null;

  function cerrar() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // Si no se puede guardar, al menos se cierra por esta sesión.
    }
    setOculto(true);
  }

  return (
    <div className="glass flex flex-col gap-4 rounded-[28px] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Tus primeros pasos
          </h2>
          <p className="text-xs text-subtle">
            {hechos} de {pasos.length} listos
          </p>
        </div>
        <button
          type="button"
          onClick={cerrar}
          aria-label="Ocultar los primeros pasos"
          className="-mt-1 -mr-1 flex h-8 w-8 items-center justify-center rounded-full text-base text-subtle active:bg-border/60"
        >
          ✕
        </button>
      </div>

      <div className="flex gap-1.5" aria-hidden>
        {pasos.map((p, i) => (
          <div
            key={p.id}
            className={`h-1.5 flex-1 rounded-full ${
              i < hechos ? "bg-accent" : "bg-border"
            }`}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-1.5 text-sm">
        {pasos.map((p) => (
          <li
            key={p.id}
            className={`flex items-center gap-2 ${
              p.hecho
                ? "text-subtle line-through"
                : p.id === proximo.id
                  ? "font-semibold text-foreground"
                  : "text-muted"
            }`}
          >
            <span aria-hidden>{p.hecho ? "✅" : p.id === proximo.id ? "👉" : "⬜️"}</span>
            {p.texto}
          </li>
        ))}
      </ul>

      <Link
        href={proximo.href}
        className="flex min-h-[44px] items-center justify-center rounded-full bg-accent px-5 text-sm font-semibold text-white active:opacity-80"
      >
        {proximo.accion}
      </Link>
    </div>
  );
}
