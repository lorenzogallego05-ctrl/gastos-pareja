import { supabase } from "./supabaseClient";
import {
  CategoriaRow,
  Ingreso,
  Movimiento,
  MovimientoInput,
  Presupuesto,
} from "./types";

export async function obtenerMovimientos(): Promise<Movimiento[]> {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*")
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Movimiento[];
}

export async function obtenerMovimiento(id: string): Promise<Movimiento | null> {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Movimiento | null;
}

export async function crearMovimiento(
  input: MovimientoInput
): Promise<Movimiento> {
  const { data, error } = await supabase
    .from("movimientos")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Movimiento;
}

export async function actualizarMovimiento(
  id: string,
  cambios: Partial<MovimientoInput>
): Promise<Movimiento> {
  const { data, error } = await supabase
    .from("movimientos")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Movimiento;
}

export async function eliminarMovimiento(id: string): Promise<void> {
  const { error } = await supabase.from("movimientos").delete().eq("id", id);
  if (error) throw error;
}

export async function obtenerIngreso(mes: string): Promise<Ingreso | null> {
  const { data, error } = await supabase
    .from("ingresos")
    .select("*")
    .eq("mes", mes)
    .maybeSingle();
  if (error) throw error;
  return data as Ingreso | null;
}

export async function obtenerIngresos(): Promise<Ingreso[]> {
  const { data, error } = await supabase
    .from("ingresos")
    .select("*")
    .order("mes", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Ingreso[];
}

export async function guardarIngreso(
  mes: string,
  ingresoLolo: number,
  ingresoJaz: number
): Promise<Ingreso> {
  const { data, error } = await supabase
    .from("ingresos")
    .upsert(
      { mes, ingreso_lolo: ingresoLolo, ingreso_jaz: ingresoJaz },
      { onConflict: "mes" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Ingreso;
}

export async function obtenerCategorias(): Promise<CategoriaRow[]> {
  const { data, error } = await supabase
    .from("categorias")
    .select("*")
    .order("orden", { ascending: true })
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoriaRow[];
}

export async function crearCategoria(
  nombre: string,
  icono: string
): Promise<CategoriaRow> {
  const { data, error } = await supabase
    .from("categorias")
    .insert({ nombre, icono, orden: 999 })
    .select()
    .single();
  if (error) throw error;
  return data as CategoriaRow;
}

export async function obtenerPresupuestos(mes: string): Promise<Presupuesto[]> {
  const { data, error } = await supabase
    .from("presupuestos")
    .select("*")
    .eq("mes", mes);
  if (error) throw error;
  return (data ?? []) as Presupuesto[];
}

export async function guardarPresupuesto(
  mes: string,
  categoria: string,
  monto: number
): Promise<Presupuesto> {
  const { data, error } = await supabase
    .from("presupuestos")
    .upsert(
      { mes, categoria, monto },
      { onConflict: "mes,categoria" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Presupuesto;
}

export async function eliminarPresupuesto(id: string): Promise<void> {
  const { error } = await supabase.from("presupuestos").delete().eq("id", id);
  if (error) throw error;
}
