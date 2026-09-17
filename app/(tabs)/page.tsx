"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMovimientos } from "@/lib/useMovimientos";
import { useIngresosMes } from "@/lib/useIngresosMes";
import { useIngresos } from "@/lib/useIngresos";
import { useLiquidaciones } from "@/lib/useLiquidaciones";
import { useCategorias } from "@/lib/useCategorias";
import { usePresupuestos } from "@/lib/usePresupuestos";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import {
  calcularBalanceGeneral,
  calcularMisGastos,
  calcularReparto,
  mapaPresupuestos,
  movimientosVisibles,
  totalGastadoMes,
  totalesPorCategoria,
} from "@/lib/calculos";
import { formatMes, formatMonto, mesActual } from "@/lib/formato";
import DebtCard from "@/components/DebtCard";
import CuentasCard from "@/components/CuentasCard";
import CategoryChart from "@/components/CategoryChart";
import MovementList from "@/components/MovementList";

export default function DashboardPage() {
  const { perfil, salir } = useAuth();
  const router = useRouter();
  const mes = mesActual();
  const { movimientos, cargando, error } = useMovimientos();
  const { ingresos } = useIngresosMes(mes);
  const { ingresos: ingresosTodos } = useIngresos();
  const { liquidaciones, recargar: recargarLiquidaciones } = useLiquidaciones();
  const { categorias } = useCategorias();
  const { presupuestos } = usePresupuestos(mes);
  const { perfiles } = usePerfilesHogar();

  const movimientosMes = useMemo(
    () => movimientos.filter((m) => m.fecha.startsWith(mes)),
    [movimientos, mes]
  );

  const reparto = useMemo(
    () => calcularReparto(perfiles, ingresos, movimientosMes),
    [perfiles, ingresos, movimientosMes]
  );

  // Balance general: a diferencia de "reparto" (solo este mes), arrastra
  // entre meses y descuenta las liquidaciones ya registradas.
  const balance = useMemo(
    () => calcularBalanceGeneral(perfiles, ingresosTodos, movimientos, liquidaciones),
    [perfiles, ingresosTodos, movimientos, liquidaciones]
  );

  // Lo que ve ESTE usuario: los gastos personales del otro nunca aparecen
  // acá (ni en la lista, ni sumados en categorías o en el total del mes).
  // Además, la base de datos ya filtra esto por RLS: ni siquiera llegan.
  const movimientosMesVisibles = useMemo(
    () => (perfil ? movimientosVisibles(movimientosMes, perfil.id) : []),
    [movimientosMes, perfil]
  );

  const totalMes = useMemo(
    () => totalGastadoMes(movimientosMesVisibles),
    [movimientosMesVisibles]
  );
  const categoriaTotales = useMemo(
    () => totalesPorCategoria(movimientosMesVisibles),
    [movimientosMesVisibles]
  );
  const presupuestosMapa = useMemo(() => mapaPresupuestos(presupuestos), [presupuestos]);
  const misGastos = useMemo(
    () => (perfil ? calcularMisGastos(movimientosMes, reparto, perfil.id) : null),
    [movimientosMes, reparto, perfil]
  );
  const ultimos = useMemo(
    () => (perfil ? movimientosVisibles(movimientos, perfil.id).slice(0, 10) : []),
    [movimientos, perfil]
  );

  async function cambiarUsuario() {
    await salir();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-subtle">
            Hola, {perfil?.nombre} 👋
          </p>
          <button
            onClick={cambiarUsuario}
            className="glass min-h-[32px] rounded-full px-3.5 text-xs font-semibold text-accent active:opacity-70"
          >
            Salir
          </button>
        </div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground">
          Inicio
        </h1>
        <p className="text-sm text-subtle">{formatMes(mes)}</p>
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

          {balance.personas.length >= 2 && (
            <DebtCard
              balance={balance}
              perfiles={perfiles}
              liquidaciones={liquidaciones}
              onLiquidado={recargarLiquidaciones}
            />
          )}

          <CuentasCard />

          <div className="glass rounded-[28px] p-5">
            <p className="text-sm font-medium text-muted">
              Total gastado este mes
            </p>
            <p className="mt-1 text-3xl font-extrabold text-foreground">
              {formatMonto(totalMes)}
            </p>
            {reparto.personas.length >= 2 && (
              <p className="mt-1 text-xs text-subtle">
                Compartido —{" "}
                {reparto.personas
                  .map((p) => `${p.nombre}: ${formatMonto(p.pagado)}`)
                  .join(" · ")}
              </p>
            )}
          </div>

          {misGastos && reparto.personas.length >= 2 && (
            <div className="glass rounded-[28px] p-5">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                Mis gastos ({perfil?.nombre})
              </h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Personales (no divididos)</span>
                  <span className="font-semibold text-foreground">
                    {formatMonto(misGastos.personal)}
                  </span>
                </div>
                {misGastos.paraOtroRecibido > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Pagados por el otro (100% tuyos)</span>
                    <span className="font-semibold text-foreground">
                      {formatMonto(misGastos.paraOtroRecibido)}
                    </span>
                  </div>
                )}
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
            perfiles={perfiles}
            verTodosHref="/historial"
          />
        </>
      )}
    </div>
  );
}
