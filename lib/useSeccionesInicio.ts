"use client";

import { useCallback, useState } from "react";

// Qué recuadros de Inicio tiene ocultos esta persona. Va en el
// localStorage (igual que la preferencia de tema): es una preferencia de
// cómo se ve la pantalla en ESTE dispositivo, no un dato del hogar.
const STORAGE_KEY = "fairo:secciones_ocultas";

function leer(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function useSeccionesInicio() {
  const [ocultas, setOcultas] = useState<string[]>(() => leer());

  const alternar = useCallback((id: string) => {
    setOcultas((previas) => {
      const nuevas = previas.includes(id)
        ? previas.filter((x) => x !== id)
        : [...previas, id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevas));
      } catch {
        // Si el navegador no deja guardar, el cambio vale igual para
        // esta sesión.
      }
      return nuevas;
    });
  }, []);

  const estaVisible = useCallback(
    (id: string) => !ocultas.includes(id),
    [ocultas]
  );

  return { estaVisible, alternar };
}
