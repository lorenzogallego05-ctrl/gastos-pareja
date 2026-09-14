"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Movimiento } from "@/lib/types";
import { ICONO_CATEGORIA } from "@/lib/categorias";
import { formatFechaCorta, formatMonto } from "@/lib/formato";
import { eliminarMovimiento } from "@/lib/api";
import { useToast } from "@/lib/useToast";

const REVEAL = 144;

export default function MovementRow({ movimiento }: { movimiento: Movimiento }) {
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [offset, setOffset] = useState(0);
  const [arrastrando, setArrastrando] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [inicio, setInicio] = useState({ x: 0, offset: 0 });

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    setArrastrando(true);
    setInicio({ x: e.clientX, offset });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!arrastrando) return;
    const delta = e.clientX - inicio.x;
    setOffset(Math.min(0, Math.max(-REVEAL, inicio.offset + delta)));
  }

  function cerrarArrastre() {
    setArrastrando(false);
    setOffset((actual) => (actual < -REVEAL / 2 ? -REVEAL : 0));
  }

  async function borrar() {
    if (!window.confirm(`¿Borrar "${movimiento.descripcion}"?`)) return;
    setEliminando(true);
    try {
      await eliminarMovimiento(movimiento.id);
      mostrarToast("Gasto borrado");
    } catch {
      mostrarToast("No se pudo borrar el gasto");
      setEliminando(false);
      setOffset(0);
    }
  }

  function editar() {
    router.push(`/nuevo?id=${movimiento.id}`);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          onClick={editar}
          className="flex w-[72px] items-center justify-center bg-accent text-sm font-semibold text-white"
        >
          Editar
        </button>
        <button
          onClick={borrar}
          disabled={eliminando}
          className="flex w-[72px] items-center justify-center bg-[#d03b3b] text-sm font-semibold text-white disabled:opacity-60"
        >
          Borrar
        </button>
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cerrarArrastre}
        onPointerCancel={cerrarArrastre}
        style={{ transform: `translateX(${offset}px)` }}
        className={`relative flex touch-pan-y items-center gap-3 rounded-2xl bg-surface px-4 py-3 shadow-sm ${
          arrastrando ? "" : "transition-transform duration-200"
        }`}
      >
        <span className="text-2xl" aria-hidden>
          {ICONO_CATEGORIA[movimiento.categoria]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {movimiento.descripcion}
          </p>
          <p className="truncate text-xs text-subtle">
            {formatFechaCorta(movimiento.fecha)} · {movimiento.categoria} ·{" "}
            {movimiento.pagado_por}
            {!movimiento.compartido && " · personal"}
          </p>
        </div>
        <span className="whitespace-nowrap font-semibold text-foreground">
          {formatMonto(movimiento.monto)}
        </span>
      </div>
    </div>
  );
}
