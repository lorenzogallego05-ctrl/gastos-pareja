"use client";

import { useEffect, useMemo, useState } from "react";
import { useIngreso } from "@/lib/useIngreso";
import { guardarIngreso } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import { formatMes, formatMonto, mesActual } from "@/lib/formato";

export default function IngresosPage() {
  const [mes, setMes] = useState(mesActual());
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

  const totalIngresos =
    (Number(ingresoLolo) || 0) + (Number(ingresoJaz) || 0);
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

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-1">
        <h1 className="text-lg font-bold text-foreground">Ingresos</h1>
        <p className="text-sm text-subtle">
          Definí el ingreso de cada uno para calcular el % de reparto.
        </p>
      </header>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">Mes</label>
        <input
          type="month"
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="min-h-[44px] w-full rounded-2xl border border-border bg-surface px-4 py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      {cargando ? (
        <p className="text-sm text-subtle">Cargando...</p>
      ) : (
        <form onSubmit={guardar} className="flex flex-col gap-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Ingreso de Lolo
            </label>
            <div className="flex items-center rounded-2xl border border-border bg-surface px-4">
              <span className="text-lg font-bold text-subtle">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={ingresoLolo}
                onChange={(e) =>
                  setIngresoLolo(e.target.value.replace(/[^0-9.,]/g, ""))
                }
                placeholder="0"
                className="w-full bg-transparent px-2 py-3 text-xl font-semibold text-foreground outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Ingreso de Jaz
            </label>
            <div className="flex items-center rounded-2xl border border-border bg-surface px-4">
              <span className="text-lg font-bold text-subtle">$</span>
              <input
                type="text"
                inputMode="decimal"
                value={ingresoJaz}
                onChange={(e) =>
                  setIngresoJaz(e.target.value.replace(/[^0-9.,]/g, ""))
                }
                placeholder="0"
                className="w-full bg-transparent px-2 py-3 text-xl font-semibold text-foreground outline-none"
              />
            </div>
          </div>

          <div className="rounded-3xl bg-surface p-5 shadow-sm">
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
                  color="#e87ba4"
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
            className="min-h-[52px] w-full rounded-2xl bg-accent text-lg font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </form>
      )}
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
