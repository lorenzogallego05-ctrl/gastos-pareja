"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMovimientos } from "@/lib/useMovimientos";
import { useIngreso } from "@/lib/useIngreso";
import { calcularReparto, totalGastadoMes, totalesPorCategoria } from "@/lib/calculos";
import { formatMes, formatMonto, mesActual } from "@/lib/formato";
import DebtCard from "@/components/DebtCard";
import CategoryChart from "@/components/CategoryChart";
import MovementList from "@/components/MovementList";

export default function DashboardPage() {
  const { usuario, cerrarSesion } = useAuth();
  const router = useRouter();
  const mes = mesActual();
  const { movimientos, cargando, error } = useMovimientos();
  const { ingreso } = useIngreso(mes);

  const movimientosMes = useMemo(
    () => movimientos.filter((m) => m.fecha.startsWith(mes)),
    [movimientos, mes]
  );

  const reparto = useMemo(
    () => calcularReparto(ingreso, movimientosMes),
    [ingreso, movimientosMes]
  );

  const totalMes = useMemo(() => totalGastadoMes(movimientosMes), [movimientosMes]);
  const categorias = useMemo(
    () => totalesPorCategoria(movimientosMes),
    [movimientosMes]
  );
  const ultimos = movimientos.slice(0, 10);

  function cambiarUsuario() {
    cerrarSesion();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between pt-1">
        <div>
          <p className="text-xs text-subtle">Hola, {usuario} 👋</p>
          <h1 className="text-lg font-bold text-foreground">{formatMes(mes)}</h1>
        </div>
        <button
          onClick={cambiarUsuario}
          className="min-h-[44px] rounded-full border border-border px-3 text-sm font-medium text-muted active:opacity-70"
        >
          Cambiar
        </button>
      </header>

      {cargando ? (
        <p className="text-sm text-subtle">Cargando...</p>
      ) : (
        <>
          {error && (
            <p className="rounded-2xl bg-[#d03b3b]/10 px-4 py-3 text-sm font-medium text-[#d03b3b]">
              {error}
            </p>
          )}

          <DebtCard reparto={reparto} />

          <div className="rounded-3xl bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">
              Total gastado este mes
            </p>
            <p className="mt-1 text-3xl font-extrabold text-foreground">
              {formatMonto(totalMes)}
            </p>
            <p className="mt-1 text-xs text-subtle">
              Lolo: {formatMonto(reparto.pagadoLolo)} compartido · Jaz:{" "}
              {formatMonto(reparto.pagadoJaz)} compartido
            </p>
          </div>

          <div className="rounded-3xl bg-surface p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Gasto por categoría
            </h2>
            <CategoryChart datos={categorias} />
          </div>

          <MovementList movimientos={ultimos} verTodosHref="/historial" />
        </>
      )}
    </div>
  );
}
