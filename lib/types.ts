export type Persona = "Lolo" | "Jaz";

export const PERSONAS: Persona[] = ["Lolo", "Jaz"];

export const CATEGORIAS = [
  "Vivienda",
  "Supermercado",
  "Comida afuera",
  "Transporte",
  "Servicios",
  "Salud",
  "Ocio",
  "Ropa",
  "Educación",
  "Mascotas",
  "Regalos",
  "Otros",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

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
