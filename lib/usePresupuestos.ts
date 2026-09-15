"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerPresupuestos } from "./api";
import { supabase } from "./supabaseClient";
import { Presupuesto } from "./types";

const POLLING_MS = 20000;

export function usePresupuestos(mes: string) {
  const [presupuestos, setPresupuestos] = useState<Presupuesto[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerPresupuestos(mes);
      setPresupuestos(data);
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => {
    // Carga inicial (por mes) + suscripción en tiempo real.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCargando(true);
    recargar();

    const channel = supabase
      .channel(`presupuestos-realtime-${mes}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "presupuestos",
          filter: `mes=eq.${mes}`,
        },
        (payload) => {
          setPresupuestos((actuales) => {
            if (payload.eventType === "DELETE") {
              const eliminado = payload.old as { id: string };
              return actuales.filter((p) => p.id !== eliminado.id);
            }
            const actualizado = payload.new as Presupuesto;
            const existe = actuales.some((p) => p.id === actualizado.id);
            return existe
              ? actuales.map((p) => (p.id === actualizado.id ? actualizado : p))
              : [...actuales, actualizado];
          });
        }
      )
      .subscribe();

    const intervalo = setInterval(recargar, POLLING_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [mes, recargar]);

  return { presupuestos, cargando, recargar };
}
