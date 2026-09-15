import { formatMonto } from "./formato";
import { Ingreso, Movimiento, Persona, Presupuesto } from "./types";

export interface Reparto {
  pctLolo: number;
  pctJaz: number;
  totalCompartido: number;
  pagadoLolo: number;
  pagadoJaz: number;
  leCorrespondeLolo: number;
  leCorrespondeJaz: number;
  diferenciaLolo: number;
  diferenciaJaz: number;
}

const TOLERANCIA = 1;

export function calcularReparto(
  ingreso: Ingreso | null,
  movimientos: Movimiento[]
): Reparto {
  const ingresoLolo = ingreso?.ingreso_lolo ?? 0;
  const ingresoJaz = ingreso?.ingreso_jaz ?? 0;
  const totalIngresos = ingresoLolo + ingresoJaz;

  const pctLolo = totalIngresos > 0 ? ingresoLolo / totalIngresos : 0.5;
  const pctJaz = totalIngresos > 0 ? ingresoJaz / totalIngresos : 0.5;

  const compartidos = movimientos.filter((m) => m.compartido);
  const totalCompartido = compartidos.reduce((sum, m) => sum + m.monto, 0);

  const pagadoLolo = sumaPorPersona(compartidos, "Lolo");
  const pagadoJaz = sumaPorPersona(compartidos, "Jaz");

  const leCorrespondeLolo = totalCompartido * pctLolo;
  const leCorrespondeJaz = totalCompartido * pctJaz;

  const diferenciaLolo = pagadoLolo - leCorrespondeLolo;
  const diferenciaJaz = pagadoJaz - leCorrespondeJaz;

  return {
    pctLolo,
    pctJaz,
    totalCompartido,
    pagadoLolo,
    pagadoJaz,
    leCorrespondeLolo,
    leCorrespondeJaz,
    diferenciaLolo,
    diferenciaJaz,
  };
}

function sumaPorPersona(movimientos: Movimiento[], persona: Persona): number {
  return movimientos
    .filter((m) => m.pagado_por === persona)
    .reduce((sum, m) => sum + m.monto, 0);
}

export function fraseDeuda(reparto: Reparto): string {
  const { diferenciaLolo } = reparto;
  if (Math.abs(diferenciaLolo) < TOLERANCIA) return "Están al día";
  if (diferenciaLolo > 0) {
    return `Jaz le debe ${formatMonto(diferenciaLolo)} a Lolo`;
  }
  return `Lolo le debe ${formatMonto(-diferenciaLolo)} a Jaz`;
}

export function estanAlDia(reparto: Reparto): boolean {
  return Math.abs(reparto.diferenciaLolo) < TOLERANCIA;
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

// Lo que gastó realmente cada uno: lo personal (no compartido) que pagó,
// más su parte proporcional de lo compartido (según calcularReparto).
export function calcularMisGastos(
  movimientos: Movimiento[],
  reparto: Reparto,
  usuario: Persona
): MisGastos {
  const personal = movimientos
    .filter((m) => !m.compartido && m.pagado_por === usuario)
    .reduce((sum, m) => sum + m.monto, 0);
  const miParteCompartido =
    usuario === "Lolo" ? reparto.leCorrespondeLolo : reparto.leCorrespondeJaz;
  return { personal, miParteCompartido, total: personal + miParteCompartido };
}

export function mapaPresupuestos(
  presupuestos: Presupuesto[]
): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const p of presupuestos) mapa[p.categoria] = p.monto;
  return mapa;
}
