"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerIngreso } from "./api";
import { supabase } from "./supabaseClient";
import { Ingreso } from "./types";

const POLLING_MS = 20000;

export function useIngreso(mes: string) {
  const [ingreso, setIngreso] = useState<Ingreso | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerIngreso(mes);
      setIngreso(data);
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
      .channel(`ingresos-realtime-${mes}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingresos",
          filter: `mes=eq.${mes}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            setIngreso(null);
          } else {
            setIngreso(payload.new as Ingreso);
          }
        }
      )
      .subscribe();

    const intervalo = setInterval(recargar, POLLING_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [mes, recargar]);

  return { ingreso, cargando, recargar };
}
