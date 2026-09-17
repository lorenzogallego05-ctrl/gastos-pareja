"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CategoriaRow, Movimiento, Perfil } from "@/lib/types";
import { iconoDeCategoria } from "@/lib/categorias";
import { formatFechaCorta, formatMonto } from "@/lib/formato";
import { eliminarMovimiento, eliminarCuotasRestantes } from "@/lib/api";
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
  const nombreBeneficiario = perfiles.find(
    (p) => p.id === movimiento.beneficiario_id
  )?.nombre;
  const router = useRouter();
  const { mostrarToast } = useToast();
  const [eliminando, setEliminando] = useState(false);
  const [cancelandoCuotas, setCancelandoCuotas] = useState(false);

  const esCuota =
    movimiento.cuota_actual != null &&
    movimiento.cuota_total != null &&
    movimiento.cuota_grupo_id != null;
  const cuotasQueFaltan = esCuota ? movimiento.cuota_total! - movimiento.cuota_actual! : 0;

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

  async function cancelarCuotasRestantes(e: React.MouseEvent) {
    e.stopPropagation();
    if (
      !window.confirm(
        `¿Borrar esta cuota y las ${cuotasQueFaltan} que faltan? Las que ya pasaron quedan.`
      )
    )
      return;
    setCancelandoCuotas(true);
    try {
      await eliminarCuotasRestantes(movimiento.cuota_grupo_id!, movimiento.cuota_actual!);
      mostrarToast("Cuotas canceladas");
    } catch {
      mostrarToast("No se pudieron cancelar las cuotas");
      setCancelandoCuotas(false);
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
      className="flex cursor-pointer items-center gap-3 rounded-[20px] border border-border/60 bg-surface/90 px-4 py-3 shadow-sm backdrop-blur-md active:opacity-80"
    >
      <span className="text-2xl" aria-hidden>
        {iconoDeCategoria(categorias, movimiento.categoria)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">
          {movimiento.descripcion}
          {esCuota && (
            <span className="ml-1.5 rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
              {movimiento.cuota_actual}/{movimiento.cuota_total}
            </span>
          )}
        </p>
        <p className="text-xs leading-snug text-subtle">
          {formatFechaCorta(movimiento.fecha)} · {movimiento.categoria} ·{" "}
          {nombrePagador}
          {movimiento.modo === "personal" && " · personal"}
          {movimiento.modo === "para_otro" &&
            nombreBeneficiario &&
            ` · 100% de ${nombreBeneficiario}`}
        </p>
        {esCuota && cuotasQueFaltan > 0 && (
          <button
            type="button"
            onClick={cancelarCuotasRestantes}
            disabled={cancelandoCuotas}
            className="mt-0.5 text-[11px] font-medium text-danger underline disabled:opacity-50"
          >
            {cancelandoCuotas
              ? "Cancelando..."
              : `Cancelar ${cuotasQueFaltan} cuota${cuotasQueFaltan > 1 ? "s" : ""} que faltan`}
          </button>
        )}
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
