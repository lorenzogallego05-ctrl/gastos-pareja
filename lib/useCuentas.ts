"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerMisCuentas } from "./api";
import { supabase } from "./supabaseClient";
import { Cuenta } from "./types";

const POLLING_MS = 30000;

export function useCuentas() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerMisCuentas();
      setCuentas(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial + suscripción en tiempo real.
    recargar();

    const channel = supabase
      .channel("cuentas-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cuentas" },
        () => recargar()
      )
      .subscribe();

    const intervalo = setInterval(recargar, POLLING_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [recargar]);

  return { cuentas, cargando, recargar };
}
