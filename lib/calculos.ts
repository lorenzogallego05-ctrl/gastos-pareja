import { formatMonto } from "./formato";
import { Cuenta, Ingreso, Liquidacion, Movimiento, Perfil, Presupuesto } from "./types";

const TOLERANCIA = 1;

// fraseDeuda/estanAlDia sirven tanto para el reparto de un mes puntual
// (Reparto) como para el balance general acumulado (Balance): a ambos
// les alcanza con nombre + diferencia por persona.
interface ConDiferencias {
  personas: { nombre: string; diferencia: number }[];
}

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
  const compartidos = movimientos.filter((m) => m.modo === "compartido");
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

export function fraseDeuda(datos: ConDiferencias): string {
  if (datos.personas.length < 2) return "";
  const [a, b] = datos.personas;
  if (Math.abs(a.diferencia) < TOLERANCIA) return "Están al día";
  const acreedor = a.diferencia > 0 ? a : b;
  const deudor = a.diferencia > 0 ? b : a;
  return `${deudor.nombre} le debe ${formatMonto(
    Math.abs(acreedor.diferencia)
  )} a ${acreedor.nombre}`;
}

export function estanAlDia(datos: ConDiferencias): boolean {
  if (datos.personas.length < 2) return true;
  return Math.abs(datos.personas[0].diferencia) < TOLERANCIA;
}

export interface SaldoPersona {
  perfilId: string;
  nombre: string;
  // positivo = le deben esa plata; negativo = la debe.
  diferencia: number;
}

export interface Balance {
  personas: SaldoPersona[];
}

// Balance histórico entre los integrantes del hogar: a diferencia de
// calcularReparto (que mira un solo mes), este arrastra entre meses —
// si algo queda sin saldar, sigue apareciendo hasta que se registre una
// liquidación. La parte proporcional de lo compartido se sigue
// calculando mes a mes (el % de ingreso de cada uno puede cambiar de un
// mes a otro), y después se suman los "para_otro" (100% de una persona,
// sin importar el mes) y se restan las liquidaciones ya hechas.
export function calcularBalanceGeneral(
  perfiles: Perfil[],
  ingresos: Ingreso[],
  movimientos: Movimiento[],
  liquidaciones: Liquidacion[]
): Balance {
  const diferencias = new Map<string, number>();
  for (const p of perfiles) diferencias.set(p.id, 0);

  const meses = new Set<string>();
  for (const m of movimientos) {
    if (m.modo === "compartido") meses.add(m.fecha.slice(0, 7));
  }
  for (const i of ingresos) meses.add(i.mes);

  for (const mes of meses) {
    const ingresosDelMes = ingresos.filter((i) => i.mes === mes);
    const movimientosDelMes = movimientos.filter(
      (m) => m.modo === "compartido" && m.fecha.startsWith(mes)
    );
    const reparto = calcularReparto(perfiles, ingresosDelMes, movimientosDelMes);
    for (const persona of reparto.personas) {
      diferencias.set(
        persona.perfilId,
        (diferencias.get(persona.perfilId) ?? 0) + persona.diferencia
      );
    }
  }

  for (const m of movimientos) {
    if (m.modo !== "para_otro" || !m.beneficiario_id) continue;
    diferencias.set(m.pagado_por, (diferencias.get(m.pagado_por) ?? 0) + m.monto);
    diferencias.set(
      m.beneficiario_id,
      (diferencias.get(m.beneficiario_id) ?? 0) - m.monto
    );
  }

  for (const l of liquidaciones) {
    diferencias.set(l.de_perfil_id, (diferencias.get(l.de_perfil_id) ?? 0) + l.monto);
    diferencias.set(l.a_perfil_id, (diferencias.get(l.a_perfil_id) ?? 0) - l.monto);
  }

  return {
    personas: perfiles.map((p) => ({
      perfilId: p.id,
      nombre: p.nombre,
      diferencia: diferencias.get(p.id) ?? 0,
    })),
  };
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
  paraOtroRecibido: number; // pagó la otra persona, pero es 100% tuyo
  miParteCompartido: number;
  total: number;
}

// Lo que gastó realmente esta persona: lo personal que pagó, más lo que
// le pagaron a ella (100% suyo aunque lo haya puesto la otra persona),
// más su parte proporcional de lo compartido (según calcularReparto).
// Lo "para_otro" que ESTA persona pagó para la otra no cuenta acá — es
// un adelanto, no un consumo propio (impacta el balance, no el gasto).
export function calcularMisGastos(
  movimientos: Movimiento[],
  reparto: Reparto,
  perfilId: string
): MisGastos {
  const personal = movimientos
    .filter((m) => m.modo === "personal" && m.pagado_por === perfilId)
    .reduce((sum, m) => sum + m.monto, 0);
  const paraOtroRecibido = movimientos
    .filter((m) => m.modo === "para_otro" && m.beneficiario_id === perfilId)
    .reduce((sum, m) => sum + m.monto, 0);
  const miParteCompartido =
    reparto.personas.find((p) => p.perfilId === perfilId)?.leCorresponde ?? 0;
  return {
    personal,
    paraOtroRecibido,
    miParteCompartido,
    total: personal + paraOtroRecibido + miParteCompartido,
  };
}

// Lo que puede VER cada persona en listas y gráficos: todo lo compartido
// y lo "para_otro" (involucran a los dos), más sus propios gastos
// personales. Los personales del otro integrante del hogar no aparecen
// en ningún lado (esto además está reforzado a nivel de base de datos
// con RLS, no es solo un filtro de la interfaz).
export function movimientosVisibles(
  movimientos: Movimiento[],
  perfilId: string
): Movimiento[] {
  return movimientos.filter((m) => m.modo !== "personal" || m.pagado_por === perfilId);
}

// Saldo actual de una cuenta de débito: el saldo que la persona cargó a
// mano, menos lo que gastó con esa cuenta desde esa fecha (se recalcula
// solo, así que editar/borrar un gasto viejo lo ajusta automáticamente).
export function saldoCuenta(cuenta: Cuenta, movimientos: Movimiento[]): number {
  const gastado = movimientos
    .filter((m) => m.cuenta_id === cuenta.id && m.fecha >= cuenta.saldo_base_fecha)
    .reduce((sum, m) => sum + m.monto, 0);
  return cuenta.saldo_base - gastado;
}

// Consumo del mes en una cuenta de crédito (no hay saldo que descontar,
// es lo que se va a tener que pagar cuando llegue el resumen).
export function consumoCuentaMes(
  cuenta: Cuenta,
  movimientos: Movimiento[],
  mes: string
): number {
  return movimientos
    .filter((m) => m.cuenta_id === cuenta.id && m.fecha.startsWith(mes))
    .reduce((sum, m) => sum + m.monto, 0);
}

export function mapaPresupuestos(
  presupuestos: Presupuesto[]
): Record<string, number> {
  const mapa: Record<string, number> = {};
  for (const p of presupuestos) mapa[p.categoria] = p.monto;
  return mapa;
}
