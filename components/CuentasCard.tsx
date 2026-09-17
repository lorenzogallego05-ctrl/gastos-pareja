"use client";

import { useMemo, useState } from "react";
import { useCuentas } from "@/lib/useCuentas";
import { actualizarCuenta } from "@/lib/api";
import { saldoCuenta, consumoCuentaMes } from "@/lib/calculos";
import { formatMonto, mesActual } from "@/lib/formato";
import { Cuenta, Movimiento } from "@/lib/types";
import EntidadLogo from "@/components/EntidadLogo";

// Tarjeta de Inicio con las cuentas propias (son privadas, cada uno ve
// solo las suyas). En modo edición se pueden reordenar (con flechas, más
// confiable en mobile que arrastrar) y ocultar/mostrar cada una acá sin
// borrarla ni afectar la lista completa en Finanzas > Cuentas.
// Recibe `movimientos` por prop (en vez de pedirlos con su propio hook)
// porque la página de Inicio ya los tiene: pedirlos de nuevo acá abriría
// una segunda suscripción realtime al mismo canal, y Supabase tira error
// si se intenta escuchar un canal que la primera ya dejó suscripto.
export default function CuentasCard({ movimientos }: { movimientos: Movimiento[] }) {
  const { cuentas, cargando } = useCuentas();
  const [editando, setEditando] = useState(false);
  const mes = mesActual();

  const ordenadas = useMemo(
    () => [...cuentas].sort((a, b) => a.orden - b.orden),
    [cuentas]
  );
  const visibles = useMemo(
    () => ordenadas.filter((c) => !c.oculta_en_inicio),
    [ordenadas]
  );

  if (cargando || cuentas.length === 0) return null;

  const lista = editando ? ordenadas : visibles;

  async function mover(cuenta: Cuenta, direccion: -1 | 1) {
    const idx = ordenadas.findIndex((c) => c.id === cuenta.id);
    const vecino = ordenadas[idx + direccion];
    if (!vecino) return;
    await Promise.all([
      actualizarCuenta(cuenta.id, { orden: vecino.orden }),
      actualizarCuenta(vecino.id, { orden: cuenta.orden }),
    ]);
  }

  async function alternarOculta(cuenta: Cuenta) {
    await actualizarCuenta(cuenta.id, {
      oculta_en_inicio: !cuenta.oculta_en_inicio,
    });
  }

  return (
    <div className="glass rounded-[28px] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Tus cuentas</h2>
        <button
          type="button"
          onClick={() => setEditando((v) => !v)}
          className="min-h-[32px] rounded-full px-2 text-xs font-semibold text-accent active:opacity-70"
        >
          {editando ? "Listo" : "Editar"}
        </button>
      </div>

      {lista.length === 0 && (
        <p className="text-sm text-subtle">Tenés todas tus cuentas ocultas acá.</p>
      )}

      <div className="flex flex-col gap-2">
        {lista.map((c, idx) => {
          const monto =
            c.tipo === "debito"
              ? saldoCuenta(c, movimientos)
              : consumoCuentaMes(c, movimientos, mes);
          const negativo = c.tipo === "debito" && monto < 0;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 rounded-2xl p-2 transition-opacity ${
                c.oculta_en_inicio ? "opacity-40" : ""
              }`}
            >
              <EntidadLogo entidad={c.entidad} icono={c.icono} tamano={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {c.nombre}
                </p>
                <p className="text-xs text-subtle">
                  {c.tipo === "debito" ? "Saldo actual" : "Consumido este mes"}
                </p>
              </div>
              {editando ? (
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => mover(c, -1)}
                    disabled={idx === 0}
                    aria-label={`Subir ${c.nombre}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted disabled:opacity-25 active:bg-border/60"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(c, 1)}
                    disabled={idx === lista.length - 1}
                    aria-label={`Bajar ${c.nombre}`}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-muted disabled:opacity-25 active:bg-border/60"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => alternarOculta(c)}
                    aria-label={
                      c.oculta_en_inicio
                        ? `Mostrar ${c.nombre} en Inicio`
                        : `Ocultar ${c.nombre} de Inicio`
                    }
                    className="flex h-8 w-8 items-center justify-center rounded-full text-base active:bg-border/60"
                  >
                    {c.oculta_en_inicio ? "🙈" : "👁️"}
                  </button>
                </div>
              ) : (
                <span
                  className={`shrink-0 text-sm font-semibold whitespace-nowrap ${
                    negativo ? "text-danger" : "text-foreground"
                  }`}
                >
                  {formatMonto(monto)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
