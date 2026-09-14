"use client";

import { useMemo, useState } from "react";
import { useMovimientos } from "@/lib/useMovimientos";
import { CATEGORIAS, Categoria, Persona } from "@/lib/types";
import { formatMonto } from "@/lib/formato";
import MovementRow from "@/components/MovementRow";

export default function HistorialPage() {
  const { movimientos, cargando } = useMovimientos();
  const [mes, setMes] = useState("");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [pagadoPor, setPagadoPor] = useState<Persona | "">("");

  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [movimientos]);

  const filtrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (mes && !m.fecha.startsWith(mes)) return false;
      if (categoria && m.categoria !== categoria) return false;
      if (pagadoPor && m.pagado_por !== pagadoPor) return false;
      return true;
    });
  }, [movimientos, mes, categoria, pagadoPor]);

  const total = filtrados.reduce((sum, m) => sum + m.monto, 0);

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="text-lg font-bold text-foreground">Historial</h1>
        <p className="text-sm text-subtle">
          {filtrados.length} movimiento{filtrados.length === 1 ? "" : "s"} ·{" "}
          {formatMonto(total)}
        </p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="min-h-[44px] rounded-xl border border-border bg-surface px-2 text-sm text-foreground outline-none"
        >
          <option value="">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as Categoria | "")}
          className="min-h-[44px] rounded-xl border border-border bg-surface px-2 text-sm text-foreground outline-none"
        >
          <option value="">Toda categoría</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <select
          value={pagadoPor}
          onChange={(e) => setPagadoPor(e.target.value as Persona | "")}
          className="min-h-[44px] rounded-xl border border-border bg-surface px-2 text-sm text-foreground outline-none"
        >
          <option value="">Quién pagó</option>
          <option value="Lolo">Lolo</option>
          <option value="Jaz">Jaz</option>
        </select>
      </div>

      {cargando ? (
        <p className="text-sm text-subtle">Cargando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-subtle">
          No hay movimientos con esos filtros.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtrados.map((m) => (
            <li key={m.id}>
              <MovementRow movimiento={m} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
