import { CategoriaTotal } from "@/lib/calculos";
import { ICONO_CATEGORIA } from "@/lib/categorias";
import { formatMonto } from "@/lib/formato";
import { Categoria } from "@/lib/types";

export default function CategoryChart({ datos }: { datos: CategoriaTotal[] }) {
  if (datos.length === 0) {
    return (
      <p className="text-sm text-subtle">
        Todavía no cargaste gastos este mes.
      </p>
    );
  }

  const max = datos[0].total;

  return (
    <ul className="flex flex-col gap-3 pr-12">
      {datos.map((d) => (
        <li key={d.categoria} className="flex items-center gap-3">
          <span className="w-6 text-lg" aria-hidden>
            {ICONO_CATEGORIA[d.categoria as Categoria]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium text-foreground">
                {d.categoria}
              </span>
              <span className="whitespace-nowrap text-muted">
                {formatMonto(d.total)}
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${Math.max(4, (d.total / max) * 100)}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
