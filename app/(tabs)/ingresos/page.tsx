"use client";

import { useEffect, useMemo, useState } from "react";
import { useIngresosMes } from "@/lib/useIngresosMes";
import { useMovimientos } from "@/lib/useMovimientos";
import { useCategorias } from "@/lib/useCategorias";
import { usePresupuestos } from "@/lib/usePresupuestos";
import { useCuentas } from "@/lib/useCuentas";
import { useAuth } from "@/lib/useAuth";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import {
  guardarIngreso,
  guardarPresupuesto,
  crearCuenta,
  actualizarCuenta,
  eliminarCuenta,
} from "@/lib/api";
import { useToast } from "@/lib/useToast";
import { formatMes, formatMonto, mesActual, fechaHoy } from "@/lib/formato";
import {
  mapaPresupuestos,
  movimientosVisibles,
  totalesPorCategoria,
  saldoCuenta,
  consumoCuentaMes,
} from "@/lib/calculos";
import { Cuenta, TipoCuenta } from "@/lib/types";
import { ENTIDADES_ORDEN, EMOJIS_CUENTA, infoDeEntidad } from "@/lib/entidades";
import SegmentedControl from "@/components/SegmentedControl";
import EntidadLogo from "@/components/EntidadLogo";
import MoneyInput from "@/components/MoneyInput";

type Vista = "ingresos" | "presupuestos" | "cuentas";

const COLORES_PERSONA = ["var(--accent)", "var(--pink)"];

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
          { value: "cuentas", label: "Cuentas" },
        ]}
      />

      {vista === "ingresos" && <SeccionIngresos mes={mes} />}
      {vista === "presupuestos" && <SeccionPresupuestos mes={mes} />}
      {vista === "cuentas" && <SeccionCuentas mes={mes} />}
    </div>
  );
}

function SeccionIngresos({ mes }: { mes: string }) {
  const { hogar } = useAuth();
  const { perfiles } = usePerfilesHogar();
  const { ingresos, cargando } = useIngresosMes(mes);
  const { mostrarToast } = useToast();

  const [montos, setMontos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Sincroniza los campos del formulario cuando cambia el mes o llegan
    // datos nuevos por Supabase Realtime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontos(
      Object.fromEntries(
        perfiles.map((p) => [
          p.id,
          String(ingresos.find((i) => i.perfil_id === p.id)?.monto ?? ""),
        ])
      )
    );
  }, [ingresos, perfiles, mes]);

  const totalIngresos = perfiles.reduce(
    (sum, p) => sum + (Number(montos[p.id]?.replace(",", ".")) || 0),
    0
  );

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (!hogar) return;
    setGuardando(true);
    try {
      await Promise.all(
        perfiles.map((p) =>
          guardarIngreso(
            hogar.id,
            mes,
            p.id,
            Number(montos[p.id]?.replace(",", ".")) || 0
          )
        )
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
      {perfiles.map((p) => (
        <div key={p.id}>
          <label className="mb-1 block text-sm font-medium text-muted">
            Ingreso de {p.nombre}
          </label>
          <div className="glass flex items-center rounded-2xl px-4">
            <span className="text-lg font-bold text-subtle">$</span>
            <MoneyInput
              value={montos[p.id] ?? ""}
              onChange={(v) => setMontos((m) => ({ ...m, [p.id]: v }))}
              className="w-full bg-transparent px-2 py-3 text-xl font-semibold text-foreground outline-none"
            />
          </div>
        </div>
      ))}

      {perfiles.length > 1 && (
        <div className="glass rounded-[28px] p-5">
          <p className="mb-3 text-sm font-medium text-muted">
            % de reparto en {formatMes(mes)}
          </p>
          {totalIngresos > 0 ? (
            <div className="flex flex-col gap-3">
              {perfiles.map((p, i) => {
                const monto = Number(montos[p.id]?.replace(",", ".")) || 0;
                const pct = totalIngresos > 0 ? monto / totalIngresos : 0;
                return (
                  <PorcentajeBar
                    key={p.id}
                    nombre={p.nombre}
                    pct={pct}
                    monto={monto}
                    color={COLORES_PERSONA[i % COLORES_PERSONA.length]}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-subtle">
              Cargá los ingresos para ver el porcentaje.
            </p>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="mr-20 min-h-[52px] w-full rounded-full bg-accent text-lg font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}

function SeccionPresupuestos({ mes }: { mes: string }) {
  const { hogar, perfil } = useAuth();
  const { categorias, cargando: cargandoCategorias } = useCategorias();
  const { movimientos, cargando: cargandoMovimientos } = useMovimientos();
  const { presupuestos, cargando: cargandoPresupuestos } = usePresupuestos(mes);
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
    return perfil ? movimientosVisibles(delMes, perfil.id) : [];
  }, [movimientos, mes, perfil]);
  const gastadoPorCategoria = useMemo(() => {
    const mapa: Record<string, number> = {};
    for (const d of totalesPorCategoria(movimientosMesVisibles)) mapa[d.categoria] = d.total;
    return mapa;
  }, [movimientosMesVisibles]);

  async function guardarTodo() {
    if (!hogar) return;
    setGuardando(true);
    try {
      const cambios = Object.entries(montos).filter(([, v]) => v.trim() !== "");
      await Promise.all(
        cambios.map(([categoria, valor]) =>
          guardarPresupuesto(hogar.id, mes, categoria, Number(valor.replace(",", ".")) || 0)
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
                  <MoneyInput
                    value={montos[cat.nombre] ?? ""}
                    onChange={(v) => setMontos((m) => ({ ...m, [cat.nombre]: v }))}
                    placeholder="Sin límite"
                    className="min-h-[36px] w-24 bg-transparent py-1 text-right text-base font-semibold text-foreground outline-none"
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
        className="mr-20 min-h-[52px] w-full rounded-full bg-accent text-lg font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
      >
        {guardando ? "Guardando..." : "Guardar presupuestos"}
      </button>
    </div>
  );
}

function SeccionCuentas({ mes }: { mes: string }) {
  const { cuentas, cargando } = useCuentas();
  const { movimientos } = useMovimientos();

  const [creando, setCreando] = useState(false);
  const [editando, setEditando] = useState<Cuenta | null>(null);

  if (cargando) return <p className="text-sm text-subtle">Cargando...</p>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-subtle">
        Tus cuentas son privadas: el otro integrante del hogar no las ve.
      </p>

      {cuentas.length === 0 && !creando && (
        <p className="text-sm text-subtle">Todavía no agregaste ninguna cuenta.</p>
      )}

      <div className="flex flex-col gap-3">
        {cuentas.map((c) => {
          const monto =
            c.tipo === "debito"
              ? saldoCuenta(c, movimientos)
              : consumoCuentaMes(c, movimientos, mes);
          const negativo = c.tipo === "debito" && monto < 0;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setEditando(c);
                setCreando(false);
              }}
              className="glass flex items-center gap-3 rounded-2xl p-3 text-left"
            >
              <EntidadLogo entidad={c.entidad} icono={c.icono} tamano={40} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">{c.nombre}</p>
                <p className="text-xs text-subtle">
                  {c.tipo === "debito" ? "Saldo actual" : `Consumido en ${formatMes(mes)}`}
                </p>
              </div>
              <span
                className={`font-semibold whitespace-nowrap ${negativo ? "text-danger" : "text-foreground"}`}
              >
                {formatMonto(monto)}
              </span>
            </button>
          );
        })}
      </div>

      {!creando && !editando && (
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="mr-20 flex min-h-[52px] items-center justify-center rounded-full border border-dashed border-accent/60 text-sm font-semibold text-accent"
        >
          + Nueva cuenta
        </button>
      )}

      {(creando || editando) && (
        <FormCuenta
          cuenta={editando}
          onCerrar={() => {
            setCreando(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function FormCuenta({
  cuenta,
  onCerrar,
}: {
  cuenta: Cuenta | null;
  onCerrar: () => void;
}) {
  const { perfil } = useAuth();
  const { mostrarToast } = useToast();

  const [entidad, setEntidad] = useState(cuenta?.entidad ?? "bbva");
  const [nombre, setNombre] = useState(cuenta?.nombre ?? infoDeEntidad("bbva").nombre);
  const [tipo, setTipo] = useState<TipoCuenta>(cuenta?.tipo ?? "debito");
  const [icono, setIcono] = useState(cuenta?.icono ?? EMOJIS_CUENTA[0]);
  const [saldo, setSaldo] = useState(cuenta ? String(cuenta.saldo_base) : "0");
  const [guardando, setGuardando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function elegirEntidad(key: string) {
    // Si todavía no escribió un nombre propio (sigue siendo el sugerido
    // de la entidad anterior, o está vacío), le sugerimos el de la
    // entidad nueva. Si ya lo personalizó, lo dejamos como está.
    const eraSugerido = !nombre.trim() || nombre === infoDeEntidad(entidad).nombre;
    setEntidad(key);
    if (eraSugerido) {
      setNombre(key === "otro" ? "" : infoDeEntidad(key).nombre);
    }
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    if (!nombre.trim()) {
      setErrorMsg("Ponele un nombre a la cuenta");
      return;
    }
    if (!perfil) return;

    setGuardando(true);
    try {
      const saldoNum = tipo === "debito" ? Number(saldo.replace(",", ".")) || 0 : 0;
      if (cuenta) {
        const cambiaSaldo = tipo === "debito" && saldoNum !== cuenta.saldo_base;
        await actualizarCuenta(cuenta.id, {
          entidad,
          nombre: nombre.trim(),
          tipo,
          icono: entidad === "otro" ? icono : null,
          saldo_base: saldoNum,
          ...(cambiaSaldo ? { saldo_base_fecha: fechaHoy() } : {}),
        });
        mostrarToast("Cuenta actualizada");
      } else {
        await crearCuenta({
          perfil_id: perfil.id,
          entidad,
          nombre: nombre.trim(),
          tipo,
          icono: entidad === "otro" ? icono : null,
          saldo_base: saldoNum,
          saldo_base_fecha: fechaHoy(),
        });
        mostrarToast("Cuenta creada");
      }
      onCerrar();
    } catch {
      setErrorMsg("No se pudo guardar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  async function borrar() {
    if (!cuenta) return;
    if (!window.confirm(`¿Borrar "${cuenta.nombre}"? Los gastos que le asignaste quedan, solo pierden la etiqueta.`)) return;
    setBorrando(true);
    try {
      await eliminarCuenta(cuenta.id);
      mostrarToast("Cuenta borrada");
      onCerrar();
    } catch {
      mostrarToast("No se pudo borrar la cuenta");
      setBorrando(false);
    }
  }

  return (
    <form onSubmit={guardar} className="glass flex flex-col gap-4 rounded-[28px] p-5">
      <div>
        <label className="mb-2 block text-sm font-medium text-muted">Entidad</label>
        <div className="flex flex-wrap gap-2">
          {ENTIDADES_ORDEN.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => elegirEntidad(key)}
              className={`rounded-2xl p-1 ${entidad === key ? "ring-2 ring-accent" : ""}`}
              aria-label={infoDeEntidad(key).nombre}
              title={infoDeEntidad(key).nombre}
            >
              <EntidadLogo entidad={key} icono={icono} tamano={40} />
            </button>
          ))}
        </div>
      </div>

      {entidad === "otro" && (
        <div>
          <label className="mb-2 block text-sm font-medium text-muted">Ícono</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS_CUENTA.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIcono(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                  icono === e ? "bg-accent/20 ring-2 ring-accent" : "bg-background"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: BBVA débito"
          className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-muted">Tipo</label>
        <SegmentedControl<TipoCuenta>
          value={tipo}
          onChange={setTipo}
          options={[
            { value: "debito", label: "Débito / billetera" },
            { value: "credito", label: "Crédito" },
          ]}
        />
      </div>

      {tipo === "debito" && (
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">
            Saldo actual
          </label>
          <div className="flex items-center rounded-xl border border-border bg-background px-3">
            <span className="text-lg font-bold text-subtle">$</span>
            <MoneyInput
              value={saldo}
              onChange={setSaldo}
              className="w-full bg-transparent px-2 py-2 text-lg font-semibold text-foreground outline-none"
            />
          </div>
          <p className="mt-1 text-xs text-subtle">
            Cargá el saldo real de hoy. A partir de ahora se va a ir descontando
            solo con cada gasto que le asignes a esta cuenta.
          </p>
        </div>
      )}

      {errorMsg && <p className="text-sm font-medium text-danger">{errorMsg}</p>}

      <div className="mr-20 flex gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className="min-h-[44px] flex-1 rounded-full border border-border text-sm font-semibold text-muted"
        >
          Cancelar
        </button>
        {cuenta && (
          <button
            type="button"
            onClick={borrar}
            disabled={borrando}
            className="min-h-[44px] flex-1 rounded-full border border-danger/40 text-sm font-semibold text-danger disabled:opacity-50"
          >
            {borrando ? "Borrando..." : "Borrar"}
          </button>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="min-h-[44px] flex-1 rounded-full bg-accent text-sm font-semibold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
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
