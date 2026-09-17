"use client";

import { useEffect, useState } from "react";

// Dólar oficial (venta), para mostrar un "≈ USD" de referencia al lado de
// los totales grandes. No hace falta que sea al segundo: alcanza con
// pegarle una vez por día, después de que el oficial ya terminó de
// actualizarse (cerca de las 10am). Antes de esa hora reintenta en cada
// carga, para no quedarse pegado con el valor del día anterior toda la
// mañana.
const CACHE_KEY = "fairo:dolar_oficial";
const HORA_CORTE = 10;

interface DolarCache {
  venta: number;
  ts: number;
}

function cacheVigente(cache: DolarCache): boolean {
  const fechaCache = new Date(cache.ts);
  const ahora = new Date();
  return (
    fechaCache.toDateString() === ahora.toDateString() &&
    fechaCache.getHours() >= HORA_CORTE
  );
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

// Pedido compartido: la cotización se muestra en más de un lugar de la
// misma pantalla, así que sin esto cada componente pediría lo mismo por
// separado. Guardando la promesa acá, todos esperan el mismo pedido.
let pedidoEnCurso: Promise<number | null> | null = null;

function pedirDolar(): Promise<number | null> {
  const cache = leerCache();
  if (cache && cacheVigente(cache)) return Promise.resolve(cache.venta);
  if (pedidoEnCurso) return pedidoEnCurso;

  pedidoEnCurso = fetch("https://dolarapi.com/v1/dolares/oficial")
    .then((r) => (r.ok ? r.json() : null))
    .then((data: { venta?: number } | null) => {
      if (!data?.venta) return null;
      guardarCache(data.venta);
      return data.venta;
    })
    .catch(() => null)
    .finally(() => {
      pedidoEnCurso = null;
    });

  return pedidoEnCurso;
}

// Devuelve null mientras no hay dato (recién montado o la API falló sin
// caché previo) — los que lo usan deben ocultar el "≈ USD" en ese caso.
export function useDolarOficial(): number | null {
  const [venta, setVenta] = useState<number | null>(() => leerCache()?.venta ?? null);

  useEffect(() => {
    let activo = true;
    pedirDolar().then((valor) => {
      if (activo && valor) setVenta(valor);
    });
    return () => {
      activo = false;
    };
  }, []);

  return venta;
}
