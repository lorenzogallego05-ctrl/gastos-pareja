"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useToast } from "@/lib/useToast";
import { crearMovimiento, actualizarMovimiento, obtenerMovimiento } from "@/lib/api";
import { Categoria, Persona } from "@/lib/types";
import { fechaHoy } from "@/lib/formato";
import CategoryChips from "@/components/CategoryChips";

export default function NuevoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idEditar = searchParams.get("id");
  const { usuario } = useAuth();
  const { mostrarToast } = useToast();

  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [pagadoPor, setPagadoPor] = useState<Persona>(usuario ?? "Lolo");
  const [compartido, setCompartido] = useState(true);
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

    setGuardando(true);
    try {
      const input = {
        fecha,
        descripcion: descripcion.trim(),
        categoria,
        monto: montoNum,
        pagado_por: pagadoPor,
        compartido,
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
        <h1 className="text-base font-semibold text-foreground">
          {idEditar ? "Editar gasto" : "Nuevo gasto"}
        </h1>
        <div className="min-w-[44px]" />
      </div>

      <form onSubmit={guardar} className="flex flex-1 flex-col gap-5">
        <div>
          <label className="mb-1 block text-sm font-medium text-muted">
            Monto
          </label>
          <div className="flex items-center rounded-2xl border border-border bg-surface px-4">
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
            className="min-h-[44px] w-full rounded-2xl border border-border bg-surface px-4 py-3 text-base text-foreground outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-muted">
            Categoría
          </label>
          <CategoryChips value={categoria} onChange={setCategoria} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-muted">
            Pagado por
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPagadoPor("Lolo")}
              className={`min-h-[52px] rounded-2xl text-base font-bold ${
                pagadoPor === "Lolo"
                  ? "bg-accent text-white"
                  : "border border-border bg-surface text-muted"
              }`}
            >
              Lolo
            </button>
            <button
              type="button"
              onClick={() => setPagadoPor("Jaz")}
              className={`min-h-[52px] rounded-2xl text-base font-bold ${
                pagadoPor === "Jaz"
                  ? "bg-[#e87ba4] text-white"
                  : "border border-border bg-surface text-muted"
              }`}
            >
              Jaz
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3">
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

        {errorMsg && (
          <p className="text-sm font-medium text-[#d03b3b]">{errorMsg}</p>
        )}

        <div className="mt-auto pt-2">
          <button
            type="submit"
            disabled={guardando}
            className="min-h-[52px] w-full rounded-2xl bg-accent text-lg font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </main>
  );
}
