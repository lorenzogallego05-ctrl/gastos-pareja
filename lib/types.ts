// Cada hogar (pareja) tiene su propio espacio: sus gastos, ingresos,
// categorías y presupuestos no se mezclan con los de otro hogar.
export interface Hogar {
  id: string;
  nombre: string | null;
  codigo: string;
  capacidad: number;
  creado_en: string;
}

// Una persona real dentro de un hogar (ligada a su cuenta de Supabase
// Auth: perfil.id === auth.uid()).
export interface Perfil {
  id: string;
  hogar_id: string;
  nombre: string;
  creado_en: string;
}

// Las categorías son dinámicas (tabla "categorias" en Supabase, una copia
// por hogar): cualquiera de los dos puede agregar categorías nuevas desde
// la app. Ver useCategorias.
export type Categoria = string;

export interface CategoriaRow {
  id: string;
  hogar_id: string;
  nombre: string;
  icono: string;
  orden: number;
  creado_en: string;
}

// personal: solo lo ve/cuenta quien lo pagó.
// compartido: se reparte proporcional al % de ingresos de cada uno.
// para_otro: pagó una persona, pero es 100% gasto de otra (esa persona
// debe el monto entero, no se reparte por porcentaje).
export type ModoGasto = "personal" | "compartido" | "para_otro";

export interface Movimiento {
  id: string;
  hogar_id: string;
  fecha: string;
  descripcion: string;
  categoria: Categoria;
  monto: number;
  pagado_por: string; // perfil.id de quien pagó
  modo: ModoGasto;
  beneficiario_id: string | null; // perfil.id, solo si modo === "para_otro"
  cuenta_id: string | null;
  // Gasto en cuotas: cuota_actual/cuota_total/cuota_grupo_id van juntos
  // o los tres en null (ver constraint en la migración 0006).
  cuota_actual: number | null;
  cuota_total: number | null;
  cuota_grupo_id: string | null;
  // Si salió de confirmar un gasto fijo del mes, queda apuntando a él.
  gasto_fijo_id: string | null;
  notas: string | null;
  creado_en: string;
}

export type MovimientoInput = Omit<Movimiento, "id" | "creado_en">;

// Un ingreso es por persona y por mes (no columnas fijas por nombre).
export interface Ingreso {
  id: string;
  hogar_id: string;
  mes: string;
  perfil_id: string;
  monto: number;
}

export interface Presupuesto {
  id: string;
  hogar_id: string;
  mes: string;
  categoria: Categoria;
  monto: number;
}

// Una cuenta/medio de pago es privada: solo la ve y administra el
// perfil dueño (no el resto del hogar). "credito" acumula consumo del
// mes; "debito" lleva un saldo que se descuenta con cada gasto propio.
export type TipoCuenta = "debito" | "credito";

export interface Cuenta {
  id: string;
  perfil_id: string;
  entidad: string; // clave del catálogo (ver lib/entidades.ts) o "otro"
  nombre: string;
  tipo: TipoCuenta;
  icono: string | null; // emoji, solo si entidad === "otro"
  saldo_base: number;
  saldo_base_fecha: string;
  // Orden manual y visibilidad en la tarjeta "Tus cuentas" de Inicio
  // (no afectan la lista completa en Finanzas > Cuentas).
  orden: number;
  oculta_en_inicio: boolean;
  creado_en: string;
}

export type CuentaInput = Omit<Cuenta, "id" | "creado_en">;

// Un pago entre dos integrantes del hogar (para saldar deuda).
export interface Liquidacion {
  id: string;
  hogar_id: string;
  de_perfil_id: string;
  a_perfil_id: string;
  monto: number;
  fecha: string;
  nota: string | null;
  creado_en: string;
}

export type LiquidacionInput = Omit<Liquidacion, "id" | "creado_en">;

// Un gasto que se repite todos los meses (alquiler, expensas, internet,
// suscripciones). No es un movimiento: es la plantilla. Cada mes aparece
// como pendiente y recién al confirmarlo se crea el movimiento real, con
// el monto que de verdad salió ese mes.
export interface GastoFijo {
  id: string;
  hogar_id: string;
  descripcion: string;
  categoria: Categoria;
  monto_estimado: number;
  dia_del_mes: number | null;
  modo: "personal" | "compartido";
  pagado_por: string;
  cuenta_id: string | null;
  activo: boolean;
  creado_en: string;
}

export type GastoFijoInput = Omit<GastoFijo, "id" | "creado_en">;
