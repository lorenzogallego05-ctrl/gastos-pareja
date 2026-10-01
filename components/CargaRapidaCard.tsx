"use client";

import { useCallback, useEffect, useState } from "react";
import {
  borrarMiTokenRapido,
  generarMiTokenRapido,
  obtenerMiTokenRapido,
} from "@/lib/api";
import { useToast } from "@/lib/useToast";

// "Anotar gasto" sin abrir la app: se genera un token, se pega una vez en
// un Atajo de iOS y desde ahí se dicta el gasto ("Hey Siri, anotar
// gasto"). El token solo habilita crear gastos propios: no sirve para leer
// nada ni para entrar a la cuenta.
export default function CargaRapidaCard({ perfilId }: { perfilId: string }) {
  const { mostrarToast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [trabajando, setTrabajando] = useState(false);
  const [verPasos, setVerPasos] = useState(false);
  // La dirección que hay que pegar en el atajo es la de este mismo
  // deploy, así sirve igual en producción y probando en la compu.
  const [origen] = useState(() =>
    typeof window === "undefined" ? "" : window.location.origin
  );

  useEffect(() => {
    obtenerMiTokenRapido()
      .then(setToken)
      .catch(() => setToken(null))
      .finally(() => setCargando(false));
  }, []);

  const copiar = useCallback(
    async (valor: string, aviso: string) => {
      try {
        await navigator.clipboard.writeText(valor);
        mostrarToast(aviso);
      } catch {
        mostrarToast("No se pudo copiar");
      }
    },
    [mostrarToast]
  );

  async function generar() {
    setTrabajando(true);
    try {
      setToken(await generarMiTokenRapido(perfilId));
      setVerPasos(true);
      mostrarToast("Token listo");
    } catch {
      mostrarToast("No se pudo generar el token");
    } finally {
      setTrabajando(false);
    }
  }

  async function revocar() {
    if (!window.confirm("¿Desactivar la carga por voz? El atajo deja de funcionar.")) {
      return;
    }
    setTrabajando(true);
    try {
      await borrarMiTokenRapido(perfilId);
      setToken(null);
      mostrarToast("Carga por voz desactivada");
    } catch {
      mostrarToast("No se pudo desactivar");
    } finally {
      setTrabajando(false);
    }
  }

  const url = `${origen}/api/entrada-rapida`;

  return (
    <div className="glass flex flex-col gap-3 rounded-[28px] p-5">
      <h2 className="text-base font-semibold text-foreground">
        Anotar gastos por voz 🎙️
      </h2>
      <p className="text-sm text-subtle">
        Con un atajo en el celular podés decir &ldquo;Hey Siri, anotar
        gasto&rdquo; y dictar &ldquo;tres mil quinientos café&rdquo; sin abrir
        Fairo.
      </p>

      {cargando ? (
        <p className="text-sm text-subtle">Cargando...</p>
      ) : token ? (
        <>
          <div className="flex flex-col gap-2 rounded-2xl bg-accent/10 p-4">
            <p className="text-xs font-medium text-muted">Tu token</p>
            <p className="break-all font-mono text-xs text-foreground">{token}</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => copiar(token, "Token copiado")}
                className="min-h-[36px] rounded-full bg-accent px-4 text-xs font-semibold text-white active:opacity-80"
              >
                Copiar token
              </button>
              <button
                onClick={() => copiar(url, "Dirección copiada")}
                className="min-h-[36px] rounded-full border border-border px-4 text-xs font-semibold text-foreground active:opacity-70"
              >
                Copiar dirección
              </button>
            </div>
          </div>

          <button
            onClick={() => setVerPasos((v) => !v)}
            className="self-start text-sm font-semibold text-accent active:opacity-70"
          >
            {verPasos ? "Ocultar los pasos" : "Cómo armar el atajo"}
          </button>

          {verPasos && (
            <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-muted">
              <li>
                Abrí la app <strong className="text-foreground">Atajos</strong> de
                tu iPhone y tocá <strong className="text-foreground">+</strong>.
              </li>
              <li>
                Agregá la acción{" "}
                <strong className="text-foreground">Dictar texto</strong>.
              </li>
              <li>
                Agregá{" "}
                <strong className="text-foreground">
                  Obtener contenido de la URL
                </strong>{" "}
                con esta dirección:
                <span className="mt-1 block break-all font-mono text-xs text-foreground">
                  {url}
                </span>
              </li>
              <li>
                En esa acción, abrí las opciones: método{" "}
                <strong className="text-foreground">POST</strong>, cuerpo{" "}
                <strong className="text-foreground">JSON</strong>, y dos campos de
                texto: <code className="text-foreground">token</code> con el token
                de arriba y <code className="text-foreground">texto</code> con el{" "}
                <strong className="text-foreground">Texto dictado</strong> del paso
                2.
              </li>
              <li>
                Agregá{" "}
                <strong className="text-foreground">
                  Obtener valor del diccionario
                </strong>{" "}
                con la clave <code className="text-foreground">mensaje</code>, y
                después <strong className="text-foreground">Mostrar
                notificación</strong> (o <strong className="text-foreground">Decir</strong>)
                con ese valor.
              </li>
              <li>
                Ponele de nombre{" "}
                <strong className="text-foreground">Anotar gasto</strong>: eso es
                lo que le vas a decir a Siri.
              </li>
            </ol>
          )}

          <p className="text-xs text-subtle">
            El gasto entra con la categoría que digas después de
            &ldquo;en&rdquo; (&ldquo;800 pan en supermercado&rdquo;); si no, cae
            en Otros y lo acomodás cuando quieras. Si decís &ldquo;en&rdquo; y la
            categoría no existe, también va a Otros.
          </p>

          <button
            onClick={revocar}
            disabled={trabajando}
            className="self-start text-xs font-semibold text-danger active:opacity-70 disabled:opacity-50"
          >
            Desactivar la carga por voz
          </button>
        </>
      ) : (
        <button
          onClick={generar}
          disabled={trabajando}
          className="min-h-[44px] rounded-full bg-accent text-sm font-semibold text-white active:opacity-80 disabled:opacity-50"
        >
          {trabajando ? "Generando..." : "Activar la carga por voz"}
        </button>
      )}
    </div>
  );
}
