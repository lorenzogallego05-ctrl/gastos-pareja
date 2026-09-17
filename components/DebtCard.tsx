"use client";

import { useState } from "react";
import { estanAlDia, fraseDeuda, Balance } from "@/lib/calculos";
import { crearLiquidacion } from "@/lib/api";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import { formatFechaCorta, formatMonto, formatUSD } from "@/lib/formato";
import { useDolarOficial } from "@/lib/useDolar";
import { Liquidacion, Perfil } from "@/lib/types";
import MoneyInput from "@/components/MoneyInput";

export default function DebtCard({
  balance,
  perfiles,
  liquidaciones,
  onLiquidado,
}: {
  balance: Balance;
  perfiles: Perfil[];
  liquidaciones: Liquidacion[];
  onLiquidado: () => void;
}) {
  const alDia = estanAlDia(balance);
  const tinte = alDia ? "var(--good)" : "var(--accent)";
  const [formAbierto, setFormAbierto] = useState(false);
  const dolarOficial = useDolarOficial();
  const diferenciaAbs = Math.abs(balance.personas[0]?.diferencia ?? 0);

  return (
    <div
      className="glass-strong relative overflow-hidden rounded-[32px] p-6 text-center"
      style={{
        background: `linear-gradient(155deg, color-mix(in srgb, ${tinte} 22%, var(--glass-surface-strong)), var(--glass-surface-strong) 70%)`,
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full"
        style={{
          background: `radial-gradient(circle, color-mix(in srgb, ${tinte} 35%, transparent), transparent 70%)`,
        }}
      />
      <p className="relative text-sm font-medium text-muted">Balance general</p>
      <p
        className={`relative mt-2 text-2xl leading-snug font-extrabold ${
          alDia ? "text-good" : "text-foreground"
        }`}
      >
        {alDia && "✅ "}
        {fraseDeuda(balance)}
      </p>

      {!alDia && dolarOficial && (
        <p className="relative mt-1 text-xs text-subtle">
          ≈ {formatUSD(diferenciaAbs, dolarOficial)} (dólar oficial)
        </p>
      )}

      {!alDia && (
        <div className="relative mt-4">
          {!formAbierto ? (
            <button
              type="button"
              onClick={() => setFormAbierto(true)}
              className="min-h-[40px] rounded-full bg-accent px-5 text-sm font-semibold text-white shadow-sm active:opacity-80"
            >
              Marcar pago
            </button>
          ) : (
            <FormLiquidar
              balance={balance}
              onCerrar={() => setFormAbierto(false)}
              onListo={() => {
                setFormAbierto(false);
                onLiquidado();
              }}
            />
          )}
        </div>
      )}

      {liquidaciones.length > 0 && (
        <div className="relative mt-5 border-t border-border pt-4 text-left">
          <p className="mb-2 text-xs font-semibold text-subtle">
            Pagos registrados
          </p>
          <ul className="flex flex-col gap-1.5">
            {liquidaciones.slice(0, 3).map((l) => {
              const de = perfiles.find((p) => p.id === l.de_perfil_id)?.nombre ?? "—";
              const a = perfiles.find((p) => p.id === l.a_perfil_id)?.nombre ?? "—";
              return (
                <li key={l.id} className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {de} → {a} · {formatFechaCorta(l.fecha)}
                  </span>
                  <span className="font-semibold text-foreground">
                    {formatMonto(l.monto)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function FormLiquidar({
  balance,
  onCerrar,
  onListo,
}: {
  balance: Balance;
  onCerrar: () => void;
  onListo: () => void;
}) {
  const { hogar } = useAuth();
  const { mostrarToast } = useToast();

  const [a, b] = balance.personas;
  const deudor = a.diferencia > 0 ? b : a;
  const acreedor = a.diferencia > 0 ? a : b;

  const [monto, setMonto] = useState(String(Math.round(Math.abs(acreedor.diferencia))));
  const [guardando, setGuardando] = useState(false);

  async function confirmar() {
    if (!hogar) return;
    const montoNum = Number(monto.replace(",", "."));
    if (!montoNum || montoNum <= 0) return;
    setGuardando(true);
    try {
      await crearLiquidacion({
        hogar_id: hogar.id,
        de_perfil_id: deudor.perfilId,
        a_perfil_id: acreedor.perfilId,
        monto: montoNum,
        fecha: new Date().toISOString().slice(0, 10),
        nota: null,
      });
      mostrarToast("Pago registrado");
      onListo();
    } catch {
      mostrarToast("No se pudo registrar el pago");
      setGuardando(false);
    }
  }

  return (
    <div className="glass flex flex-col gap-3 rounded-2xl p-4 text-left">
      <p className="text-sm text-foreground">
        <strong>{deudor.nombre}</strong> le pagó a <strong>{acreedor.nombre}</strong>:
      </p>
      <div className="flex items-center rounded-xl border border-border bg-background px-3">
        <span className="text-lg font-bold text-subtle">$</span>
        <MoneyInput
          autoFocus
          value={monto}
          onChange={setMonto}
          className="w-full bg-transparent px-2 py-2 text-lg font-semibold text-foreground outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCerrar}
          className="min-h-[40px] flex-1 rounded-full border border-border text-sm font-semibold text-muted"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={confirmar}
          disabled={guardando}
          className="min-h-[40px] flex-1 rounded-full bg-accent text-sm font-semibold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando..." : "Confirmar"}
        </button>
      </div>
    </div>
  );
}
