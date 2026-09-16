"use client";

import { useEffect, useMemo, useState } from "react";
import { useIngreso } from "@/lib/useIngreso";
import { useMovimientos } from "@/lib/useMovimientos";
import { useCategorias } from "@/lib/useCategorias";
import { usePresupuestos } from "@/lib/usePresupuestos";
import { useAuth } from "@/lib/useAuth";
import { guardarIngreso, guardarPresupuesto } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import { formatMes, formatMonto, mesActual } from "@/lib/formato";
import { mapaPresupuestos, movimientosVisibles, totalesPorCategoria } from "@/lib/calculos";
import SegmentedControl from "@/components/SegmentedControl";

type Vista = "ingresos" | "presupuestos";

export default function IngresosPage() {
  const [mes, setMes] = useState(mesActual());
  const [vista, setVista] = useState<Vista>("ingresos");

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-1">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight text-foreground">
          Finanzas
        </h1>
        <p className="text-sm text-subtle">
          Ingresos, % de reparto y presupuestos por categoría.
        </p>
      </header>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">Mes</label>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="glass min-h-[44px] w-full rounded-2xl px-4 py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      <SegmentedControl
        value={vista}
        onChange={setVista}
        options={[
          { value: "ingresos", label: "Ingresos" },
          { value: "presupuestos", label: "Presupuestos" },
        ]}
      />

      {vista === "ingresos" ? <SeccionIngresos mes={mes} /> : <SeccionPresupuestos mes={mes} />}
    </div>
  );
}

function SeccionIngresos({ mes }: { mes: string }) {
  const { ingreso, cargando } = useIngreso(mes);
  const { mostrarToast } = useToast();

  const [ingresoLolo, setIngresoLolo] = useState("");
  const [ingresoJaz, setIngresoJaz] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Sincroniza los campos del formulario cuando cambia el mes o llegan
    // datos nuevos por Supabase Realtime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIngresoLolo(ingreso ? String(ingreso.ingreso_lolo) : "");
    setIngresoJaz(ingreso ? String(ingreso.ingreso_jaz) : "");
  }, [ingreso, mes]);

  const totalIngresos = (Number(ingresoLolo) || 0) + (Number(ingresoJaz) || 0);
  const pctLolo = useMemo(
    () => (totalIngresos > 0 ? (Number(ingresoLolo) || 0) / totalIngresos : 0),
    [ingresoLolo, totalIngresos]
  );
  const pctJaz = totalIngresos > 0 ? 1 - pctLolo : 0;

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      await guardarIngreso(
        mes,
        Number(ingresoLolo.replace(",", ".")) || 0,
        Number(ingresoJaz.replace(",", ".")) || 0
      );
      mostrarToast("Ingresos guardados");
    } catch {
      mostrarToast("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="text-sm text-subtle">Cargando...</p>;

  return (
    <form onSubmit={guardar} className="flex flex-col gap-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-muted">
          Ingreso de Lolo
        </label>
        <div className="glass flex items-center rounded-2xl px-4">
          <span className="text-lg font-bold text-subtle">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={ingresoLolo}
            onChange={(e) => setIngresoLolo(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder="0"
            className="w-full bg-transparent px-2 py-3 text-xl font-semibold text-foreground outline-none"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">
          Ingreso de Jaz
        </label>
        <div className="glass flex items-center rounded-2xl px-4">
          <span className="text-lg font-bold text-subtle">$</span>
          <input
            type="text"
            inputMode="decimal"
            value={ingresoJaz}
            onChange={(e) => setIngresoJaz(e.target.value.replace(/[^0-9.,]/g, ""))}
            placeholder="0"
            className="w-full bg-transparent px-2 py-3 text-xl font-semibold text-foreground outline-none"
          />
        </div>
      </div>

      <div className="glass rounded-[28px] p-5">
        <p className="mb-3 text-sm font-medium text-muted">
          % de reparto en {formatMes(mes)}
        </p>
        {totalIngresos > 0 ? (
          <div className="flex flex-col gap-3">
            <PorcentajeBar
              nombre="Lolo"
              pct={pctLolo}
              monto={Number(ingresoLolo) || 0}
              color="var(--accent)"
            />
            <PorcentajeBar
              nombre="Jaz"
              pct={pctJaz}
              monto={Number(ingresoJaz) || 0}
              color="var(--pink)"
            />
          </div>
        ) : (
          <p className="text-sm text-subtle">
            Cargá los dos ingresos para ver el porcentaje.
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={guardando}
        className="min-h-[52px] w-full rounded-full bg-accent text-lg font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}

function SeccionPresupuestos({ mes }: { mes: string }) {
  const { categorias, cargando: cargandoCategorias } = useCategorias();
  const { movimientos, cargando: cargandoMovimientos } = useMovimientos();
  const { presupuestos, cargando: cargandoPresupuestos } = usePresupuestos(mes);
  const { usuario } = useAuth();
  const { mostrarToast } = useToast();

  const [montos, setMontos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const presupuestosMapa = useMemo(() => mapaPresupuestos(presupuestos), [presupuestos]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontos(
      Object.fromEntries(
        Object.entries(presupuestosMapa).map(([cat, monto]) => [cat, String(monto)])
      )
    );
  }, [presupuestosMapa, mes]);

  const movimientosMesVisibles = useMemo(() => {
    const delMes = movimientos.filter((m) => m.fecha.startsWith(mes));
    return usuario ? movimientosVisibles(delMes, usuario) : [];
  }, [movimientos, mes, usuario]);
  const gastadoPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const d of totalesPorCategoria(movimientosMesVisibles)) mapa[d.categoria] = d.total;
    return mapa;
  }, [movimientosMesVisibles]);

  async function guardarTodo() {
    setGuardando(true);
    try {
      const cambios = Object.entries(montos).filter(([, v]) => v.trim() !== "");
      await Promise.all(
        cambios.map(([categoria, valor]) =>
          guardarPresupuesto(mes, categoria, Number(valor.replace(",", ".")) || 0)
        )
      );
      mostrarToast("Presupuestos guardados");
    } catch {
      mostrarToast("No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  }

  if (cargandoCategorias || cargandoMovimientos || cargandoPresupuestos) {
    return <p className="text-sm text-subtle">Cargando...</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-subtle">
        Definí un límite mensual por categoría. Si te pasás, la barra del
        dashboard se pone en rojo.
      </p>
      <div className="flex flex-col gap-3 pr-16">
        {categorias.map((cat) => {
          const gastado = gastadoPorCategoria[cat.nombre] ?? 0;
          const limite = Number(montos[cat.nombre]?.replace(",", ".")) || 0;
          const pct = limite > 0 ? Math.min(100, (gastado / limite) * 100) : 0;
          const excedido = limite > 0 && gastado > limite;
          return (
            <div key={cat.id} className="glass rounded-2xl p-3">
              <div className="flex items-center gap-3">
                <span className="text-lg" aria-hidden>
                  {cat.icono}
                </span>
                <span className="flex-1 truncate text-sm font-medium text-foreground">
                  {cat.nombre}
                </span>
                <div className="flex items-center gap-1 rounded-xl border border-border bg-background px-2">
                  <span className="text-sm text-subtle">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={montos[cat.nombre] ?? ""}
                    onChange={(e) =>
                      setMontos((m) => ({
                        ...m,
                        [cat.nombre]: e.target.value.replace(/[^0-9.,]/g, ""),
                      }))
                    }
                    placeholder="Sin límite"
                    className="min-h-[36px] w-24 bg-transparent py-1 text-right text-sm font-semibold text-foreground outline-none"
                  />
                </div>
              </div>
              {limite > 0 && (
                <div className="mt-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${excedido ? "bg-danger" : "bg-accent"}`}
                      style={{ width: `${Math.max(4, pct)}%` }}
                    />
                  </div>
                  <p
                    className={`mt-1 text-xs ${excedido ? "font-semibold text-danger" : "text-subtle"}`}
                  >
                    {formatMonto(gastado)} de {formatMonto(limite)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={guardarTodo}
        disabled={guardando}
        className="min-h-[52px] w-full rounded-full bg-accent text-lg font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar presupuestos"}
      </button>
    </div>
  );
}

function PorcentajeBar({
  nombre,
  pct,
  monto,
  color,
}: {
  nombre: string;
  pct: number;
  monto: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">
          {nombre} · {formatMonto(monto)}
        </span>
        <span className="font-semibold text-foreground">
          {(pct * 100).toFixed(0)}%
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
