"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerCategorias } from "./api";
import { supabase } from "./supabaseClient";
import { CategoriaRow } from "./types";

const POLLING_MS = 30000;

function ordenar(lista: CategoriaRow[]): CategoriaRow[] {
  return [...lista].sort((a, b) => {
    if (a.orden !== b.orden) return a.orden - b.orden;
    return a.creado_en.localeCompare(b.creado_en);
  });
}

export function useCategorias() {
  const [categorias, setCategorias] = useState<CategoriaRow[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerCategorias();
      setCategorias(ordenar(data));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial + suscripción en tiempo real.
    recargar();

    const channel = supabase
      .channel(`categorias-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categorias" },
        (payload) => {
          setCategorias((actuales) => {
            if (payload.eventType === "INSERT") {
              const nueva = payload.new as CategoriaRow;
              if (actuales.some((c) => c.id === nueva.id)) return actuales;
              return ordenar([...actuales, nueva]);
            }
            if (payload.eventType === "UPDATE") {
              const actualizada = payload.new as CategoriaRow;
              return ordenar(
                actuales.map((c) => (c.id === actualizada.id ? actualizada : c))
              );
            }
            if (payload.eventType === "DELETE") {
              const eliminada = payload.old as { id: string };
              return actuales.filter((c) => c.id !== eliminada.id);
            }
            return actuales;
          });
        }
      )
      .subscribe();

    const intervalo = setInterval(recargar, POLLING_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [recargar]);

  return { categorias, cargando, recargar };
}
