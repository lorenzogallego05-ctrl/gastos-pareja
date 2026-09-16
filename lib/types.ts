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

export interface Movimiento {
  id: string;
  hogar_id: string;
  fecha: string;
  descripcion: string;
  categoria: Categoria;
  monto: number;
  pagado_por: string; // perfil.id de quien pagó
  compartido: boolean;
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
