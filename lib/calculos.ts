import { formatMonto } from "./formato";
import { Ingreso, Movimiento, Perfil, Presupuesto } from "./types";

const TOLERANCIA = 1;

export interface AportePersona {
  perfilId: string;
  nombre: string;
  ingreso: number;
  pct: number;
  pagado: number;
  leCorresponde: number;
  // positivo = pagó de más este mes (le deben esa plata); negativo = debe.
  diferencia: number;
}

export interface Reparto {
  personas: AportePersona[];
  totalCompartido: number;
}

export function calcularReparto(
  perfiles: Perfil[],
  ingresos: Ingreso[],
  movimientos: Movimiento[]
): Reparto {
  const totalIngresos = ingresos.reduce((sum, i) => sum + i.monto, 0);
  const compartidos = movimientos.filter((m) => m.compartido);
  const totalCompartido = compartidos.reduce((sum, m) => sum + m.monto, 0);

  const personas: AportePersona[] = perfiles.map((p) => {
    const ingreso = ingresos.find((i) => i.perfil_id === p.id)?.monto ?? 0;
    const pct =
      totalIngresos > 0
        ? ingreso / totalIngresos
        : perfiles.length > 0
          ? 1 / perfiles.length
          : 0;
    const pagado = compartidos
      .filter((m) => m.pagado_por === p.id)
      .reduce((sum, m) => sum + m.monto, 0);
    const leCorresponde = totalCompartido * pct;
    return {
      perfilId: p.id,
      nombre: p.nombre,
      ingreso,
      pct,
      pagado,
      leCorresponde,
      diferencia: pagado - leCorresponde,
    };
  });

  return { personas, totalCompartido };
}

export function fraseDeuda(reparto: Reparto): string {
  if (reparto.personas.length < 2) return "";
  const [a, b] = reparto.personas;
  if (Math.abs(a.diferencia) < TOLERANCIA) return "Están al día";
  const acreedor = a.diferencia > 0 ? a : b;
  const deudor = a.diferencia > 0 ? b : a;
  return `${deudor.nombre} le debe ${formatMonto(
    Math.abs(acreedor.diferencia)
  )} a ${acreedor.nombre}`;
}

export function estanAlDia(reparto: Reparto): boolean {
  if (reparto.personas.length < 2) return true;
  return Math.abs(reparto.personas[0].diferencia) < TOLERANCIA;
}

export function totalGastadoMes(movimientos: Movimiento[]): number {
  return movimientos.reduce((sum, m) => sum + m.monto, 0);
}

export interface CategoriaTotal {
  categoria: string;
  total: number;
  porcentaje: number;
}

export function totalesPorCategoria(movimientos: Movimiento[]): CategoriaTotal[] {
  const total = totalGastadoMes(movimientos);
  const mapa = new Map<string, number>();
  for (const m of movimientos) {
    mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.monto);
  }
  return Array.from(mapa.entries())
    .map(([categoria, monto]) => ({
      categoria,
      total: monto,
      porcentaje: total > 0 ? monto / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface MisGastos {
  personal: number;
  miParteCompartido: number;
  total: number;
}

// Lo que gastó realmente esta persona: lo personal (no compartido) que
// pagó, más su parte proporcional de lo compartido (según calcularReparto).
export function calcularMisGastos(
  movimientos: Movimiento[],
  reparto: Reparto,
  perfilId: string
): MisGastos {
  const personal = movimientos
    .filter((m) => !m.compartido && m.pagado_por === perfilId)
    .reduce((sum, m) => sum + m.monto, 0);
  const miParteCompartido =
    reparto.personas.find((p) => p.perfilId === perfilId)?.leCorresponde ?? 0;
  return { personal, miParteCompartido, total: personal + miParteCompartido };
}

// Lo que puede VER cada persona en listas y gráficos: todo lo compartido,
// más sus propios gastos personales. Los personales del otro integrante
// del hogar no aparecen en ningún lado (esto además está reforzado a
// nivel de base de datos con RLS, no es solo un filtro de la interfaz).
export function movimientosVisibles(
  movimientos: Movimiento[],
  perfilId: string
): Movimiento[] {
  return movimientos.filter((m) => m.compartido || m.pagado_por === perfilId);
}

export function mapaPresupuestos(
  presupuestos: Presupuesto[]
): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const p of presupuestos) mapa[p.categoria] = p.monto;
  return mapa;
}
