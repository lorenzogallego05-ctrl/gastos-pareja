import Link from "next/link";
import { CategoriaRow, Movimiento, Perfil } from "@/lib/types";
import MovementRow from "./MovementRow";

export default function MovementList({
  movimientos,
  categorias,
  perfiles,
  verTodosHref,
}: {
  movimientos: Movimiento[];
  categorias: CategoriaRow[];
  perfiles: Perfil[];
  verTodosHref?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">
          Últimos movimientos
        </h2>
        {verTodosHref && (
          <Link href={verTodosHref} className="text-sm font-medium text-accent">
            Ver todos
          </Link>
        )}
      </div>
      {movimientos.length === 0 ? (
        <p className="text-sm text-subtle">No hay movimientos cargados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {movimientos.map((m) => (
            <li key={m.id}>
              <MovementRow movimiento={m} categorias={categorias} perfiles={perfiles} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
