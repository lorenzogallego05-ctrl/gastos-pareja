"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import { useToast } from "@/lib/useToast";
import { crearMovimiento, actualizarMovimiento, obtenerMovimiento } from "@/lib/api";
import { Categoria } from "@/lib/types";
import { fechaHoy } from "@/lib/formato";
import CategoryChips from "@/components/CategoryChips";

export default function NuevoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idEditar = searchParams.get("id");
  const { perfil, hogar } = useAuth();
  const { perfiles } = usePerfilesHogar();
  const { mostrarToast } = useToast();

  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [pagadoPor, setPagadoPor] = useState<string>(perfil?.id ?? "");
  const [compartido, setCompartido] = useState(perfiles.length > 1);
  const [fecha, setFecha] = useState(fechaHoy());
  const [guardando, setGuardando] = useState(false);
  const [cargandoEdicion, setCargandoEdicion] = useState(!!idEditar);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!idEditar) return;
    obtenerMovimiento(idEditar)
      .then((m) => {
        if (!m) return;
        setMonto(String(m.monto));
        setDescripcion(m.descripcion);
        setCategoria(m.categoria);
        setPagadoPor(m.pagado_por);
        setCompartido(m.compartido);
        setFecha(m.fecha);
      })
      .finally(() => setCargandoEdicion(false));
  }, [idEditar]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const montoNum = Number(monto.replace(",", "."));
    if (!montoNum || montoNum <= 0) {
      setErrorMsg("Ingresá un monto válido");
      return;
    }
    if (!descripcion.trim()) {
      setErrorMsg("Ingresá una descripción");
      return;
    }
    if (!categoria) {
      setErrorMsg("Elegí una categoría");
      return;
    }
    if (!hogar || !pagadoPor) {
      setErrorMsg("No se pudo identificar tu hogar. Volvé a iniciar sesión.");
      return;
    }

    setGuardando(true);
    try {
      const input = {
        hogar_id: hogar.id,
        fecha,
        descripcion: descripcion.trim(),
        categoria,
        monto: montoNum,
        pagado_por: pagadoPor,
        compartido: perfiles.length > 1 ? compartido : false,
        notas: null,
      };
      if (idEditar) {
        await actualizarMovimiento(idEditar, input);
        mostrarToast("Gasto actualizado");
      } else {
        await crearMovimiento(input);
        mostrarToast("Gasto guardado");
      }
      router.replace("/");
    } catch {
      setErrorMsg("No se pudo guardar. Probá de nuevo.");
      setGuardando(false);
    }
  }

  if (cargandoEdicion) {
    return (
      <main className="flex min-h-svh items-center justify-center">
        <p className="text-sm text-subtle">Cargando...</p>
      </main>
    );
  }

  const coloresPersona = ["bg-accent", "bg-pink"];

  return (
    <main
      className="mx-auto flex min-h-svh w-full max-w-md flex-col gap-5 px-4 pb-[calc(1.5rem+var(--safe-bottom))]"
      style={{ paddingTop: "calc(1.25rem + var(--safe-top))" }}
    >
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          aria-label="Cancelar"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-2xl text-muted"
        >
          ✕
        </button>
        <h1 className="text-lg font-bold text-foreground">
          {idEditar ? "Editar gasto" : "Nuevo gasto"}
        </h1>
        <div className="min-w-[44px]" />
      </div>

      <form onSubmit={guardar} className="flex flex-1 flex-col gap-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">
            Monto
          </label>
          <div className="glass flex items-center rounded-2xl px-4">
            <span className="text-2xl font-bold text-subtle">$</span>
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/[^0-9.,]/g, ""))}
              placeholder="0"
              className="w-full bg-transparent px-2 py-4 text-3xl font-bold text-foreground outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-muted">
            Descripción
          </label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Ej: Verdulería"
            className="glass min-h-[44px] w-full rounded-2xl px-4 py-3 text-base text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-muted">
            Categoría
          </label>
          <CategoryChips value={categoria} onChange={setCategoria} />
        </div>

        {perfiles.length > 1 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">
              Pagado por
            </label>
            <div className="grid grid-cols-2 gap-3">
              {perfiles.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPagadoPor(p.id)}
                  className={`min-h-[52px] rounded-full text-base font-bold transition-colors ${
                    pagadoPor === p.id
                      ? `${coloresPersona[i % coloresPersona.length]} text-white shadow-sm`
                      : "glass text-muted"
                  }`}
                >
                  {p.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {perfiles.length > 1 && (
          <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
            <span className="text-base font-medium text-foreground">
              Gasto compartido
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={compartido}
              onClick={() => setCompartido((v) => !v)}
              className={`relative h-8 w-14 rounded-full transition-colors ${
                compartido ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                  compartido ? "translate-x-7" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        )}

        {errorMsg && (
          <p className="text-sm font-medium text-danger">{errorMsg}</p>
        )}

        <div className="mt-auto pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="min-h-[52px] w-full rounded-full bg-accent text-lg font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </main>
  );
}
