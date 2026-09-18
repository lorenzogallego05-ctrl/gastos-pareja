export function formatMonto(monto: number): string {
  const signo = monto < 0 ? "-" : "";
  const abs = Math.abs(monto);
  return `${signo}$${abs.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatUSD(montoArs: number, venta: number): string {
  const usd = Math.abs(montoArs) / venta;
  return `US$${usd.toLocaleString("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

// Línea de referencia en dólares: además de la conversión, muestra a
// cuánto está el oficial hoy, así se entiende de dónde sale el número.
export function textoUSD(montoArs: number, venta: number): string {
  return `≈ ${formatUSD(montoArs, venta)} · oficial ${formatMonto(venta)}`;
}

export function mesActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMes(mes: string): string {
  const [anio, mesNum] = mes.split("-").map(Number);
  const fecha = new Date(anio, mesNum - 1, 1);
  const texto = fecha.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function formatFechaCorta(fecha: string): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const date = new Date(anio, mes - 1, dia);
  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
  });
}

// Separador de miles mientras se escribe en un input de dinero (a
// diferencia de formatMonto, trabaja sobre el texto crudo que el
// usuario está tipeando, sin "$" ni asumir que ya es un número válido).
export function formatMiles(valor: string): string {
  const limpio = valor.replace(/[^0-9,]/g, "");
  const [entero, decimal] = limpio.split(",");
  if (!entero) return limpio;
  const enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return decimal !== undefined ? `${enteroFormateado},${decimal}` : enteroFormateado;
}

// Suma meses a una fecha, "recortando" el día si el mes destino es más
// corto (ej: 31 de enero + 1 mes = 28/29 de febrero, no "3 de marzo"
// como haría sumar directo con Date).
export function sumarMeses(fechaISO: string, meses: number): string {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const base = new Date(anio, mes - 1 + meses, 1);
  const ultimoDiaDelMes = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const diaFinal = Math.min(dia, ultimoDiaDelMes);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(
    diaFinal
  ).padStart(2, "0")}`;
}

export function fechaHoy(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
}
