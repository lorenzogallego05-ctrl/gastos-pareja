"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoriaRow, Movimiento, Perfil } from "@/lib/types";
import { iconoDeCategoria } from "@/lib/categorias";
import { formatFechaCorta, formatMonto } from "@/lib/formato";
import { eliminarMovimiento } from "@/lib/api";
import { useToast } from "@/lib/useToast";

export default function MovementRow({
  movimiento,
  categorias,
  perfiles,
}: {
  movimiento: Movimiento;
  categorias: CategoriaRow[];
  perfiles: Perfil[];
}) {
  const nombrePagador =
    perfiles.find((p) => p.id === movimiento.pagado_por)?.nombre ?? "—";
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);

  function editar() {
    router.push(`/nuevo?id=${movimiento.id}`);
  }

  async function borrar(e: React.MouseEvent) {
    e.stopPropagation();
    if (!window.confirm(`¿Borrar "${movimiento.descripcion}"?`)) return;
    setEliminando(true);
    try {
      await eliminarMovimiento(movimiento.id);
      mostrarToast("Gasto borrado");
    } catch {
      mostrarToast("No se pudo borrar el gasto");
      setEliminando(false);
    }
  }

  return (
    <div
      onClick={editar}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") editar();
      }}
      aria-label={`Editar ${movimiento.descripcion}`}
      className="mr-20 flex cursor-pointer items-center gap-3 rounded-[20px] border border-border/60 bg-surface/90 px-4 py-3 shadow-sm backdrop-blur-md active:opacity-80"
    >
      <span className="text-2xl" aria-hidden>
        {iconoDeCategoria(categorias, movimiento.categoria)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {movimiento.descripcion}
        </p>
        <p className="truncate text-xs text-subtle">
          {formatFechaCorta(movimiento.fecha)} · {movimiento.categoria} ·{" "}
          {nombrePagador}
          {!movimiento.compartido && " · personal"}
        </p>
      </div>
      <span className="whitespace-nowrap font-semibold text-foreground">
        {formatMonto(movimiento.monto)}
      </span>
      <button
        type="button"
        onClick={borrar}
        disabled={eliminando}
        aria-label={`Borrar ${movimiento.descripcion}`}
        className="flex min-h-[36px] min-w-[36px] shrink-0 items-center justify-center rounded-full text-lg text-danger active:bg-danger/10 disabled:opacity-50"
      >
        🗑️
      </button>
    </div>
  );
}
