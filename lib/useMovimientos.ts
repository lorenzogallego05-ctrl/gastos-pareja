"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerMovimientos } from "./api";
import { supabase } from "./supabaseClient";
import { Movimiento } from "./types";

// Refresco de respaldo por si la suscripción en tiempo real se corta
// (por ejemplo, la app pasó un rato en segundo plano en el iPhone).
const POLLING_MS = 20000;

function ordenar(lista: Movimiento[]): Movimiento[] {
  return [...lista].sort((a, b) => {
    if (a.fecha !== b.fecha) return b.fecha.localeCompare(a.fecha);
    return b.creado_en.localeCompare(a.creado_en);
  });
}

export function useMovimientos() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerMovimientos();
      setMovimientos(ordenar(data));
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudieron cargar los gastos"
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial + suscripción en tiempo real: es el propósito de este efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    recargar();

    const channel = supabase
      .channel(`movimientos-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movimientos" },
        (payload) => {
          setMovimientos((actuales) => {
            if (payload.eventType === "INSERT") {
              const nuevo = payload.new as Movimiento;
              if (actuales.some((m) => m.id === nuevo.id)) return actuales;
              return ordenar([...actuales, nuevo]);
            }
            if (payload.eventType === "UPDATE") {
              const actualizado = payload.new as Movimiento;
              return ordenar(
                actuales.map((m) =>
                  m.id === actualizado.id ? actualizado : m
                )
              );
            }
            if (payload.eventType === "DELETE") {
              const eliminado = payload.old as { id: string };
              return actuales.filter((m) => m.id !== eliminado.id);
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

  return { movimientos, cargando, error, recargar };
}
