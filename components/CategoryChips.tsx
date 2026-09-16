"use client";

import { useState } from "react";
import { useCategorias } from "@/lib/useCategorias";
import { useAuth } from "@/lib/useAuth";
import { crearCategoria } from "@/lib/api";
import { EMOJIS_CATEGORIA } from "@/lib/categorias";
import { Categoria } from "@/lib/types";
import { useToast } from "@/lib/useToast";

export default function CategoryChips({
  value,
  onChange,
}: {
  value: Categoria | null;
  onChange: (categoria: Categoria) => void;
}) {
  const { categorias, cargando } = useCategorias();
  const { hogar } = useAuth();
  const { mostrarToast } = useToast();
  const [agregando, setAgregando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [iconoNuevo, setIconoNuevo] = useState(EMOJIS_CATEGORIA[0]);
  const [guardando, setGuardando] = useState(false);

  async function crear() {
    const nombre = nombreNuevo.trim();
    if (!nombre || !hogar) return;
    if (categorias.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      onChange(nombre);
      setAgregando(false);
      setNombreNuevo("");
      return;
    }
    setGuardando(true);
    try {
      const nueva = await crearCategoria(hogar.id, nombre, iconoNuevo);
      onChange(nueva.nombre);
      mostrarToast("Categoría creada");
      setAgregando(false);
      setNombreNuevo("");
    } catch {
      mostrarToast("No se pudo crear la categoría");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {!cargando &&
          categorias.map((cat) => {
            const activo = cat.nombre === value;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onChange(cat.nombre)}
                className={`flex min-h-[44px] items-center gap-1.5 rounded-full px-3.5 text-sm font-medium ${
                  activo
                    ? "bg-accent text-white shadow-sm"
                    : "glass text-muted"
                }`}
              >
                <span aria-hidden>{cat.icono}</span>
                {cat.nombre}
              </button>
            );
          })}
        <button
          type="button"
          onClick={() => setAgregando((v) => !v)}
          className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-dashed border-accent/60 px-3.5 text-sm font-medium text-accent"
        >
          + Nueva
        </button>
      </div>

      {agregando && (
        <div className="glass flex flex-col gap-3 rounded-2xl p-3">
          <input
            type="text"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre de la categoría"
            autoFocus
            className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-accent"
          />
          <div className="flex flex-wrap gap-2">
            {EMOJIS_CATEGORIA.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setIconoNuevo(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                  iconoNuevo === e
                    ? "bg-accent/20 ring-2 ring-accent"
                    : "bg-background"
                }`}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAgregando(false)}
              className="min-h-[40px] flex-1 rounded-full border border-border text-sm font-semibold text-muted"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={crear}
              disabled={!nombreNuevo.trim() || guardando}
              className="min-h-[40px] flex-1 rounded-full bg-accent text-sm font-semibold text-white disabled:opacity-50"
            >
              {guardando ? "Creando..." : "Crear"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
