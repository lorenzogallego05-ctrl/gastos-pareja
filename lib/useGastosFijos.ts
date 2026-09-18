"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerGastosFijos } from "./api";
import { supabase } from "./supabaseClient";
import { GastoFijo } from "./types";

const POLLING_MS = 30000;

export function useGastosFijos() {
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerGastosFijos();
      setGastosFijos(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();

    const channel = supabase
      .channel(`gastos-fijos-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "gastos_fijos" },
        () => recargar()
      )
      .subscribe();

    const intervalo = setInterval(recargar, POLLING_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [recargar]);

  return { gastosFijos, cargando, recargar };
}
