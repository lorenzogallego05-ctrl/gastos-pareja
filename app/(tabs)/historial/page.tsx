"use client";

import { useMemo, useState } from "react";
import { useMovimientos } from "@/lib/useMovimientos";
import { useCategorias } from "@/lib/useCategorias";
import { useAuth } from "@/lib/useAuth";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import { Categoria } from "@/lib/types";
import { formatMonto } from "@/lib/formato";
import { movimientosVisibles } from "@/lib/calculos";
import MovementRow from "@/components/MovementRow";

export default function HistorialPage() {
  const { movimientos, cargando } = useMovimientos();
  const { categorias } = useCategorias();
  const { perfil } = useAuth();
  const { perfiles } = usePerfilesHogar();
  const [mes, setMes] = useState("");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [pagadoPor, setPagadoPor] = useState<string>("");

  // Los gastos personales del otro usuario no aparecen ni en los filtros
  // ni en la lista.
  const visibles = useMemo(
    () => (perfil ? movimientosVisibles(movimientos, perfil.id) : []),
    [movimientos, perfil]
  );

  const meses = useMemo(() => {
    const set = new Set(visibles.map((m) => m.fecha.slice(0, 7)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [visibles]);

  const filtrados = useMemo(() => {
    return visibles.filter((m) => {
      if (mes && !m.fecha.startsWith(mes)) return false;
      if (categoria && m.categoria !== categoria) return false;
      if (pagadoPor && m.pagado_por !== pagadoPor) return false;
      return true;
    });
  }, [visibles, mes, categoria, pagadoPor]);

  const total = filtrados.reduce((sum, m) => sum + m.monto, 0);

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight text-foreground">
          Historial
        </h1>
        <p className="text-sm text-subtle">
          {filtrados.length} movimiento{filtrados.length === 1 ? "" : "s"} ·{" "}
          {formatMonto(total)}
        </p>
      </header>

      <div className="glass grid grid-cols-3 divide-x divide-border rounded-2xl p-1">
        <select
          value={mes}
          onChange={(e) => setMes(e.target.value)}
          className="min-h-[40px] rounded-xl bg-transparent px-1 text-sm text-foreground outline-none"
        >
          <option value="">Mes</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as Categoria | "")}
          className="min-h-[40px] rounded-xl bg-transparent px-1 text-sm text-foreground outline-none"
        >
          <option value="">Categoría</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>

        <select
          value={pagadoPor}
          onChange={(e) => setPagadoPor(e.target.value)}
          className="min-h-[40px] rounded-xl bg-transparent px-1 text-sm text-foreground outline-none"
        >
          <option value="">Quién</option>
          {perfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
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
              <MovementRow movimiento={m} categorias={categorias} perfiles={perfiles} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
