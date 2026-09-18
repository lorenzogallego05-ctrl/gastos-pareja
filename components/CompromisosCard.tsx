"use client";

import { useState } from "react";
import { CompromisosDelMes, FijoDelMes } from "@/lib/calculos";
import { confirmarGastoFijo } from "@/lib/api";
import { useToast } from "@/lib/useToast";
import { formatMonto, fechaHoy } from "@/lib/formato";
import { Perfil } from "@/lib/types";
import MoneyInput from "@/components/MoneyInput";

// Lo que el hogar ya tiene comprometido este mes: los gastos fijos y las
// cuotas que caen. Los fijos no se cargan solos a propósito — se
// confirman con el monto que de verdad salió, porque los precios cambian
// de un mes a otro.
export default function CompromisosCard({
  compromisos,
  perfiles,
  mostrarPendientes = true,
}: {
  compromisos: CompromisosDelMes;
  perfiles: Perfil[];
  mostrarPendientes?: boolean;
}) {
  const { fijos, cuotas, pendientes, total } = compromisos;

  if (fijos.length === 0 && cuotas.length === 0) return null;

  return (
    <div className="glass rounded-[28px] p-5">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">
          Fijos y cuotas
        </h2>
        <span className="text-lg font-extrabold text-foreground">
          {formatMonto(total)}
        </span>
      </div>
      <p className="mb-3 text-xs text-subtle">
        {pendientes > 0
          ? `Te ${pendientes === 1 ? "falta" : "faltan"} cargar ${pendientes} de este mes`
          : "Ya cargaste todos los de este mes"}
      </p>

      <div className="flex flex-col gap-2">
        {fijos.map((f) => (
          <FilaFijo
            key={f.fijo.id}
            item={f}
            perfiles={perfiles}
            permitirCargar={mostrarPendientes}
          />
        ))}

        {cuotas.map((c) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-2xl px-1 py-1.5"
          >
            <span className="text-base" aria-hidden>
              🧾
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {c.descripcion}
              </p>
              <p className="text-xs text-subtle">
                Cuota {c.cuota_actual}/{c.cuota_total}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-foreground">
              {formatMonto(c.monto)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilaFijo({
  item,
  perfiles,
  permitirCargar,
}: {
  item: FijoDelMes;
  perfiles: Perfil[];
  permitirCargar: boolean;
}) {
  const { mostrarToast } = useToast();
  const [abierto, setAbierto] = useState(false);
  const [monto, setMonto] = useState(String(item.fijo.monto_estimado));
  const [guardando, setGuardando] = useState(false);

  const yaCargado = item.movimiento !== null;
  const quienPaga = perfiles.find((p) => p.id === item.fijo.pagado_por)?.nombre;

  async function confirmar() {
    const montoNum = Number(monto.replace(/\./g, "").replace(",", "."));
    if (!montoNum || montoNum <= 0) return;
    setGuardando(true);
    try {
      await confirmarGastoFijo(item.fijo, montoNum, fechaHoy());
      mostrarToast(`${item.fijo.descripcion} cargado`);
      setAbierto(false);
    } catch {
      mostrarToast("No se pudo cargar. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="rounded-2xl">
      <div className="flex items-center gap-3 px-1 py-1.5">
        <span className="text-base" aria-hidden>
          {yaCargado ? "✅" : "⏳"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">
            {item.fijo.descripcion}
          </p>
          <p className="text-xs text-subtle">
            {yaCargado ? "Cargado" : "Pendiente"}
            {item.fijo.dia_del_mes ? ` · vence el ${item.fijo.dia_del_mes}` : ""}
            {item.fijo.modo === "personal" ? " · personal" : ""}
            {quienPaga ? ` · ${quienPaga}` : ""}
          </p>
        </div>
        <span
          className={`shrink-0 text-sm font-semibold ${
            yaCargado ? "text-foreground" : "text-subtle"
          }`}
        >
          {formatMonto(item.monto)}
        </span>
      </div>

      {!yaCargado && permitirCargar && !abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="ml-8 min-h-[32px] rounded-full px-2 text-xs font-semibold text-accent active:opacity-70"
        >
          Cargar este mes
        </button>
      )}

      {!yaCargado && permitirCargar && abierto && (
        <div className="mt-1 ml-8 flex flex-col gap-2 rounded-2xl border border-border p-3">
          <p className="text-xs text-subtle">
            ¿Cuánto salió este mes? Viene el del mes pasado, cambialo si no
            coincide.
          </p>
          <div className="flex items-center rounded-xl border border-border bg-background px-3">
            <span className="text-base font-bold text-subtle">$</span>
            <MoneyInput
              value={monto}
              onChange={setMonto}
              className="w-full bg-transparent px-2 py-2 text-base font-semibold text-foreground outline-none"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="min-h-[36px] flex-1 rounded-full border border-border text-xs font-semibold text-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              disabled={guardando}
              className="min-h-[36px] flex-1 rounded-full bg-accent text-xs font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Guardando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
