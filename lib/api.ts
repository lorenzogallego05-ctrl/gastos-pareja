import { supabase } from "./supabaseClient";
import {
  CategoriaRow,
  Cuenta,
  CuentaInput,
  Hogar,
  Ingreso,
  Liquidacion,
  LiquidacionInput,
  Movimiento,
  MovimientoInput,
  Perfil,
  Presupuesto,
} from "./types";

// ── Auth ──────────────────────────────────────────────────────────────

export async function registrarse(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function iniciarSesion(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function cerrarSesion() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Hogar / perfil ──────────────────────────────────────────────────────

export async function obtenerMiPerfil(userId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as Perfil | null;
}

export async function obtenerPerfilesDeMiHogar(): Promise<Perfil[]> {
  const { data, error } = await supabase
    .from("perfiles")
    .select("*")
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Perfil[];
}

export async function obtenerMiHogar(): Promise<Hogar | null> {
  const { data, error } = await supabase.from("hogares").select("*").maybeSingle();
  if (error) throw error;
  return data as Hogar | null;
}

export async function crearHogar(
  nombre: string,
  capacidad: 1 | 2,
  nombreHogar?: string
): Promise<{ hogar_id: string; codigo: string }> {
  const { data, error } = await supabase
    .rpc("crear_hogar", {
      p_nombre: nombre,
      p_capacidad: capacidad,
      p_nombre_hogar: nombreHogar ?? null,
    })
    .single();
  if (error) throw error;
  return data as { hogar_id: string; codigo: string };
}

export async function unirseAHogar(codigo: string, nombre: string): Promise<string> {
  const { data, error } = await supabase.rpc("unirse_a_hogar", {
    p_codigo: codigo,
    p_nombre: nombre,
  });
  if (error) throw error;
  return data as string;
}

// ── Movimientos ──────────────────────────────────────────────────────────

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

// ── Ingresos (una fila por persona por mes) ──────────────────────────────

export async function obtenerIngresosMes(mes: string): Promise<Ingreso[]> {
  const { data, error } = await supabase
    .from("ingresos")
    .select("*")
    .eq("mes", mes);
  if (error) throw error;
  return (data ?? []) as Ingreso[];
}

// Todos los ingresos de todos los meses (para el balance general, que
// arrastra entre meses y necesita el % de aporte de cada mes pasado).
export async function obtenerIngresos(): Promise<Ingreso[]> {
  const { data, error } = await supabase.from("ingresos").select("*");
  if (error) throw error;
  return (data ?? []) as Ingreso[];
}

export async function guardarIngreso(
  hogarId: string,
  mes: string,
  perfilId: string,
  monto: number
): Promise<Ingreso> {
  const { data, error } = await supabase
    .from("ingresos")
    .upsert(
      { hogar_id: hogarId, mes, perfil_id: perfilId, monto },
      { onConflict: "hogar_id,mes,perfil_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as Ingreso;
}

// ── Categorías ────────────────────────────────────────────────────────────

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
  hogarId: string,
  nombre: string,
  icono: string
): Promise<CategoriaRow> {
  const { data, error } = await supabase
    .from("categorias")
    .insert({ hogar_id: hogarId, nombre, icono, orden: 999 })
    .select()
    .single();
  if (error) throw error;
  return data as CategoriaRow;
}

// ── Presupuestos ──────────────────────────────────────────────────────────

export async function obtenerPresupuestos(mes: string): Promise<Presupuesto[]> {
  const { data, error } = await supabase
    .from("presupuestos")
    .select("*")
    .eq("mes", mes);
  if (error) throw error;
  return (data ?? []) as Presupuesto[];
}

export async function guardarPresupuesto(
  hogarId: string,
  mes: string,
  categoria: string,
  monto: number
): Promise<Presupuesto> {
  const { data, error } = await supabase
    .from("presupuestos")
    .upsert(
      { hogar_id: hogarId, mes, categoria, monto },
      { onConflict: "hogar_id,mes,categoria" }
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

// ── Cuentas (privadas, por perfil) ──────────────────────────────────────

export async function obtenerMisCuentas(): Promise<Cuenta[]> {
  const { data, error } = await supabase
    .from("cuentas")
    .select("*")
    .order("creado_en", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Cuenta[];
}

export async function crearCuenta(input: CuentaInput): Promise<Cuenta> {
  const { data, error } = await supabase
    .from("cuentas")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Cuenta;
}

export async function actualizarCuenta(
  id: string,
  cambios: Partial<CuentaInput>
): Promise<Cuenta> {
  const { data, error } = await supabase
    .from("cuentas")
    .update(cambios)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Cuenta;
}

export async function eliminarCuenta(id: string): Promise<void> {
  const { error } = await supabase.from("cuentas").delete().eq("id", id);
  if (error) throw error;
}

// ── Liquidaciones (pagos entre integrantes del hogar) ──────────────────

export async function obtenerLiquidaciones(): Promise<Liquidacion[]> {
  const { data, error } = await supabase
    .from("liquidaciones")
    .select("*")
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Liquidacion[];
}

export async function crearLiquidacion(
  input: LiquidacionInput
): Promise<Liquidacion> {
  const { data, error } = await supabase
    .from("liquidaciones")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Liquidacion;
}

export async function eliminarLiquidacion(id: string): Promise<void> {
  const { error } = await supabase.from("liquidaciones").delete().eq("id", id);
  if (error) throw error;
}
