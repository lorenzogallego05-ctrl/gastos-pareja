import { CategoriaTotal } from "@/lib/calculos";
import { iconoDeCategoria } from "@/lib/categorias";
import { formatMonto } from "@/lib/formato";
import { CategoriaRow } from "@/lib/types";

export default function CategoryChart({
  datos,
  categorias,
  presupuestos,
}: {
  datos: CategoriaTotal[];
  categorias: CategoriaRow[];
  presupuestos?: Record<string, number>;
}) {
  if (datos.length === 0) {
    return (
      <p className="text-sm text-subtle">
        Todavía no cargaste gastos este mes.
      </p>
    );
  }

  const max = Math.max(
    datos[0].total,
    ...(presupuestos ? datos.map((d) => presupuestos[d.categoria] ?? 0) : [])
  );

  return (
    <ul className="flex flex-col gap-3 pr-12">
      {datos.map((d) => {
        const limite = presupuestos?.[d.categoria];
        const excedido = !!limite && d.total > limite;
        const pctLimite = limite ? Math.min(100, (limite / max) * 100) : null;
        return (
          <li key={d.categoria} className="flex items-center gap-3">
            <span className="w-6 text-lg" aria-hidden>
              {iconoDeCategoria(categorias, d.categoria)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate font-medium text-foreground">
                  {d.categoria}
                </span>
                <span
                  className={`whitespace-nowrap ${
                    excedido ? "font-semibold text-danger" : "text-muted"
                  }`}
                >
                  {formatMonto(d.total)}
                  {limite ? ` / ${formatMonto(limite)}` : ""}
                </span>
              </div>
              <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full ${
                    excedido ? "bg-danger" : "bg-accent"
                  }`}
                  style={{ width: `${Math.max(4, (d.total / max) * 100)}%` }}
                />
                {pctLimite !== null && (
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/40"
                    style={{ left: `${pctLimite}%` }}
                    aria-hidden
                  />
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
