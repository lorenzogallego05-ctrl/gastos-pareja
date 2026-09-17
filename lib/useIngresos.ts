"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerIngresos } from "./api";
import { supabase } from "./supabaseClient";
import { Ingreso } from "./types";

// Todos los ingresos de todos los meses (no un mes puntual como
// useIngresosMes): lo usa el balance general, que arrastra entre meses.
const POLLING_MS = 30000;

export function useIngresos() {
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerIngresos();
      setIngresos(data);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial + suscripción en tiempo real.
    recargar();

    const channel = supabase
      .channel("ingresos-todos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ingresos" },
        () => recargar()
      )
      .subscribe();

    const intervalo = setInterval(recargar, POLLING_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(intervalo);
    };
  }, [recargar]);

  return { ingresos, cargando, recargar };
}
