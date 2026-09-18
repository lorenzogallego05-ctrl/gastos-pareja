"use client";

import { useCallback, useEffect, useState } from "react";
import { obtenerPerfilesDeMiHogar } from "./api";
import { supabase } from "./supabaseClient";
import { Perfil } from "./types";

export function usePerfilesHogar() {
  const [perfiles, setPerfiles] = useState<Perfil[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      const data = await obtenerPerfilesDeMiHogar();
      setPerfiles(
        [...data].sort((a, b) => a.creado_en.localeCompare(b.creado_en))
      );
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();

    const channel = supabase
      .channel(`perfiles-realtime-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "perfiles" },
        () => recargar()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [recargar]);

  return { perfiles, cargando, recargar };
}
