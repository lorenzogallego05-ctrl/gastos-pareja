import { createClient } from "@supabase/supabase-js";
import { parseGastoRapido } from "@/lib/parseGastoRapido";
import { formatMonto } from "@/lib/formato";

// Carga rápida desde afuera de la app: el Atajo de iOS (o cualquier cosa
// que pueda hacer un POST) manda el token de la persona y una frase
// dictada, y acá se traduce a un gasto de verdad.
//
// No se usa la clave de servicio de Supabase a propósito: esto llama a la
// función `crear_gasto_rapido` con la clave pública, y es esa función la
// que valida el token y decide qué se puede escribir (ver la migración
// 0009). Así, incluso si este endpoint tuviera un bug, no puede tocar
// nada más que crear un gasto del dueño del token.

interface Entrada {
  token?: unknown;
  texto?: unknown;
  descripcion?: unknown;
  monto?: unknown;
  categoria?: unknown;
  modo?: unknown;
  fecha?: unknown;
}

function respuesta(cuerpo: object, status: number) {
  return Response.json(cuerpo, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function texto(valor: unknown): string | undefined {
  return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return respuesta(
      { ok: false, mensaje: "Fairo no está bien configurado en el servidor." },
      500
    );
  }

  // Lo normal es un JSON, pero si el Atajo manda los datos en la URL
  // también se aceptan: es una pavada y ahorra una pregunta.
  let entrada: Entrada = {};
  try {
    const json = await request.json();
    if (json && typeof json === "object") entrada = json as Entrada;
  } catch {
    // Sin cuerpo JSON válido: se sigue con lo que venga en la URL.
  }
  const params = new URL(request.url).searchParams;
  const dato = (clave: keyof Entrada) =>
    texto(entrada[clave]) ?? texto(params.get(clave)) ?? undefined;

  const cabecera = request.headers.get("authorization");
  const token =
    dato("token") ??
    (cabecera?.toLowerCase().startsWith("bearer ")
      ? cabecera.slice(7).trim()
      : undefined);

  if (!token) {
    return respuesta({ ok: false, mensaje: "Falta el token de Fairo." }, 401);
  }

  let descripcion = dato("descripcion");
  // El monto puede venir como número (JSON) o como texto (Atajos manda
  // todo como texto, y encima con coma decimal).
  let monto: number | undefined;
  if (typeof entrada.monto === "number") {
    monto = entrada.monto;
  } else {
    const crudo = dato("monto");
    if (crudo) monto = Number(crudo.replace(/\./g, "").replace(",", "."));
  }
  let categoria = dato("categoria");

  const frase = dato("texto");
  if (frase && (!descripcion || monto === undefined)) {
    const dictado = parseGastoRapido(frase);
    if (!dictado) {
      return respuesta(
        {
          ok: false,
          mensaje:
            "No entendí el monto. Probá algo como: tres mil quinientos café.",
        },
        400
      );
    }
    descripcion = descripcion ?? dictado.descripcion;
    monto = monto ?? dictado.monto;
    categoria = categoria ?? dictado.categoria;
  }

  if (!descripcion || monto === undefined || !Number.isFinite(monto) || monto <= 0) {
    return respuesta(
      { ok: false, mensaje: "Decime cuánto gastaste y en qué." },
      400
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.rpc("crear_gasto_rapido", {
    p_token: token,
    p_descripcion: descripcion,
    p_monto: monto,
    p_categoria: categoria ?? null,
    p_modo: dato("modo") ?? null,
    p_fecha: dato("fecha") ?? null,
  });

  if (error) {
    // 28000 es el código que usa la función para "token inválido".
    const invalido = error.code === "28000" || /token/i.test(error.message);
    return respuesta(
      {
        ok: false,
        mensaje: invalido
          ? "Ese token ya no sirve. Generá uno nuevo en Fairo > Ajustes."
          : "No se pudo anotar el gasto.",
      },
      invalido ? 401 : 400
    );
  }

  const creado = data as { descripcion: string; monto: number; categoria: string };
  return respuesta(
    {
      ok: true,
      mensaje: `Anotado: ${creado.descripcion}, ${formatMonto(
        Number(creado.monto)
      )}, en ${creado.categoria}.`,
      gasto: creado,
    },
    201
  );
}
