"use client";

import { useEffect, useState } from "react";

// Dólar oficial (venta), para mostrar un "≈ USD" de referencia al lado de
// los totales grandes. Se cachea en localStorage porque no hace falta
// que sea al segundo, y si la API está caída usamos el último valor
// conocido antes que no mostrar nada.
const CACHE_KEY = "fairo:dolar_oficial";
const CACHE_MS = 30 * 60 * 1000;

interface DolarCache {
  venta: number;
  ts: number;
}

function leerCache(): DolarCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DolarCache) : null;
  } catch {
    return null;
  }
}

function guardarCache(venta: number) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ venta, ts: Date.now() }));
  } catch {
    // localStorage puede fallar (Safari privado, cuota llena, etc.):
    // no pasa nada, simplemente no se cachea.
  }
}

// Devuelve null mientras no hay dato (recién montado o la API falló sin
// caché previo) — los que lo usan deben ocultar el "≈ USD" en ese caso.
export function useDolarOficial(): number | null {
  const [venta, setVenta] = useState<number | null>(() => leerCache()?.venta ?? null);

  useEffect(() => {
    let activo = true;
    const cache = leerCache();
    if (cache && Date.now() - cache.ts < CACHE_MS) return;

    fetch("https://dolarapi.com/v1/dolares/oficial")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { venta?: number } | null) => {
        if (!activo || !data?.venta) return;
        setVenta(data.venta);
        guardarCache(data.venta);
      })
      .catch(() => {
        // Si falla y no había caché, `venta` queda en null y listo.
      });

    return () => {
      activo = false;
    };
  }, []);

  return venta;
}
