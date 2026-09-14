"use client";

import { CATEGORIAS, Categoria } from "@/lib/types";
import { ICONO_CATEGORIA } from "@/lib/categorias";

export default function CategoryChips({
  value,
  onChange,
}: {
  value: Categoria | null;
  onChange: (categoria: Categoria) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIAS.map((cat) => {
        const activo = cat === value;
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(cat)}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium ${
              activo
                ? "border-accent bg-accent text-white"
                : "border-border bg-surface text-muted"
            }`}
          >
            <span aria-hidden>{ICONO_CATEGORIA[cat]}</span>
            {cat}
          </button>
        );
      })}
    </div>
  );
}
