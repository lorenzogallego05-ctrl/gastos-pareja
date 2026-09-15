export type Persona = "Lolo" | "Jaz";

export const PERSONAS: Persona[] = ["Lolo", "Jaz"];

// Las categorías son dinámicas (tabla "categorias" en Supabase): cualquiera
// de los dos puede agregar categorías nuevas desde la app. Ver useCategorias.
export type Categoria = string;

export interface CategoriaRow {
  id: string;
  nombre: string;
  icono: string;
  orden: number;
  creado_en: string;
}

export interface Movimiento {
  id: string;
  fecha: string;
  descripcion: string;
  categoria: Categoria;
  monto: number;
  pagado_por: Persona;
  compartido: boolean;
  notas: string | null;
  creado_en: string;
}

export type MovimientoInput = Omit<Movimiento, "id" | "creado_en">;

export interface Ingreso {
  id: string;
  mes: string;
  ingreso_lolo: number;
  ingreso_jaz: number;
}

export interface Presupuesto {
  id: string;
  mes: string;
  categoria: Categoria;
  monto: number;
}
