"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerLiquidaciones } from "./api";
import { supabase } from "./supabaseClient";
import { Liquidacion } from "./types";

const POLLING_MS = 20000;

export function useLiquidaciones() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerLiquidaciones();
      setLiquidaciones(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial + suscripción en tiempo real.
    recargar();

    const channel = supabase
      .channel("liquidaciones-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "liquidaciones" },
        () => recargar()
      )
      .subscribe();

    const intervalo = setInterval(recargar, POLLING_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [recargar]);

  return { liquidaciones, cargando, recargar };
}
