"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMovimientos } from "@/lib/useMovimientos";
import { useCategorias } from "@/lib/useCategorias";
import { useAuth } from "@/lib/useAuth";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import { Categoria } from "@/lib/types";
import { formatDiaRelativo, formatMes, formatMonto } from "@/lib/formato";
import { agruparPorDia, movimientosVisibles } from "@/lib/calculos";
import MovementRow from "@/components/MovementRow";

export default function HistorialPage() {
  // useSearchParams necesita un límite de Suspense para que la ruta pueda
  // seguir prerenderizándose estáticamente.
  return (
    <Suspense fallback={<p className="pt-6 text-sm text-subtle">Cargando...</p>}>
      <Historial />
    </Suspense>
  );
}

function Historial() {
  const { movimientos, cargando } = useMovimientos();
  const { categorias } = useCategorias();
  const { perfil } = useAuth();
  const { perfiles } = usePerfilesHogar();

  // Los filtros pueden llegar por la URL (tocando una categoría en el
  // gráfico de Inicio). Son el valor inicial, no una ligadura: desde acá
  // se siguen cambiando a mano.
  const params = useSearchParams();
  const [mes, setMes] = useState(() => params.get("mes") ?? "");
  const [categoria, setCategoria] = useState<Categoria | "">(
    () => params.get("categoria") ?? ""
  );
  const [pagadoPor, setPagadoPor] = useState<string>(
    () => params.get("pagadoPor") ?? ""
  );

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

  const dias = useMemo(() => agruparPorDia(filtrados), [filtrados]);
  const total = filtrados.reduce((sum, m) => sum + m.monto, 0);

  const filtrosActivos = [
    mes && { texto: formatMes(mes), limpiar: () => setMes("") },
    categoria && { texto: categoria, limpiar: () => setCategoria("") },
    pagadoPor && {
      texto: perfiles.find((p) => p.id === pagadoPor)?.nombre ?? "Alguien",
      limpiar: () => setPagadoPor(""),
    },
  ].filter(Boolean) as { texto: string; limpiar: () => void }[];

  return (
    <div className="flex flex-col gap-5">
      <header className="pt-1">
        <h1 className="text-[30px] leading-tight font-extrabold tracking-tight text-foreground">
          Historial
        </h1>
        <p className="text-sm text-subtle">
          {filtrados.length} movimiento{filtrados.length === 1 ? "" : "s"} ·{" "}
          <span className="monto">{formatMonto(total)}</span>
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

      {filtrosActivos.length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-2">
          {filtrosActivos.map((f) => (
            <button
              key={f.texto}
              type="button"
              onClick={f.limpiar}
              className="flex min-h-[32px] items-center gap-1.5 rounded-full bg-accent/12 px-3 text-xs font-semibold text-accent active:opacity-70"
            >
              {f.texto}
              <span aria-hidden>✕</span>
              <span className="sr-only">Quitar filtro</span>
            </button>
          ))}
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-subtle">Cargando...</p>
      ) : dias.length === 0 ? (
        <p className="text-sm text-subtle">
          No hay movimientos con esos filtros.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {dias.map((dia) => (
            <section key={dia.fecha} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold text-foreground">
                  {formatDiaRelativo(dia.fecha)}
                </h2>
                <span className="monto text-xs font-medium text-subtle">
                  {formatMonto(dia.total)}
                </span>
              </div>
              <ul className="flex flex-col gap-2">
                {dia.movimientos.map((m) => (
                  <li key={m.id}>
                    <MovementRow
                      movimiento={m}
                      categorias={categorias}
                      perfiles={perfiles}
                      mostrarFecha={false}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
