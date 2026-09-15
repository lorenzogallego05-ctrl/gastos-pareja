"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMovimientos } from "@/lib/useMovimientos";
import { useIngreso } from "@/lib/useIngreso";
import { useCategorias } from "@/lib/useCategorias";
import { usePresupuestos } from "@/lib/usePresupuestos";
import {
  calcularMisGastos,
  calcularReparto,
  mapaPresupuestos,
  totalGastadoMes,
  totalesPorCategoria,
} from "@/lib/calculos";
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
  const { categorias } = useCategorias();
  const { presupuestos } = usePresupuestos(mes);

  const movimientosMes = useMemo(
    () => movimientos.filter((m) => m.fecha.startsWith(mes)),
    [movimientos, mes]
  );

  const reparto = useMemo(
    () => calcularReparto(ingreso, movimientosMes),
    [ingreso, movimientosMes]
  );

  const totalMes = useMemo(() => totalGastadoMes(movimientosMes), [movimientosMes]);
  const categoriaTotales = useMemo(
    () => totalesPorCategoria(movimientosMes),
    [movimientosMes]
  );
  const presupuestosMapa = useMemo(() => mapaPresupuestos(presupuestos), [presupuestos]);
  const misGastos = useMemo(
    () => (usuario ? calcularMisGastos(movimientosMes, reparto, usuario) : null),
    [movimientosMes, reparto, usuario]
  );
  const ultimos = movimientos.slice(0, 10);

  function cambiarUsuario() {
    cerrarSesion();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-subtle">Hola, {usuario} 👋</p>
          <button
            onClick={cambiarUsuario}
            className="glass min-h-[32px] rounded-full px-3.5 text-xs font-semibold text-accent active:opacity-70"
          >
            Cambiar
          </button>
        </div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground">
          {formatMes(mes)}
        </h1>
      </header>

      {cargando ? (
        <p className="text-sm text-subtle">Cargando...</p>
      ) : (
        <>
          {error && (
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          <DebtCard reparto={reparto} />

          <div className="glass rounded-[28px] p-5">
            <p className="text-sm font-medium text-muted">
              Total gastado este mes
            </p>
            <p className="mt-1 text-3xl font-extrabold text-foreground">
              {formatMonto(totalMes)}
            </p>
            <p className="mt-1 text-xs text-subtle">
              Compartido — Lolo: {formatMonto(reparto.pagadoLolo)} · Jaz:{" "}
              {formatMonto(reparto.pagadoJaz)}
            </p>
          </div>

          {misGastos && (
            <div className="glass rounded-[28px] p-5">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                Mis gastos ({usuario})
              </h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Personales (no divididos)</span>
                  <span className="font-semibold text-foreground">
                    {formatMonto(misGastos.personal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted">Tu parte de lo compartido</span>
                  <span className="font-semibold text-foreground">
                    {formatMonto(misGastos.miParteCompartido)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                  <span className="font-medium text-foreground">Total tuyo</span>
                  <span className="text-lg font-extrabold text-accent">
                    {formatMonto(misGastos.total)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="glass rounded-[28px] p-5">
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Gasto por categoría
            </h2>
            <CategoryChart
              datos={categoriaTotales}
              categorias={categorias}
              presupuestos={presupuestosMapa}
            />
          </div>

          <MovementList
            movimientos={ultimos}
            categorias={categorias}
            verTodosHref="/historial"
          />
        </>
      )}
    </div>
  );
}
