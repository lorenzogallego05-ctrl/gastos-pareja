"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import { useCuentas } from "@/lib/useCuentas";
import { useToast } from "@/lib/useToast";
import {
  crearMovimiento,
  actualizarMovimiento,
  obtenerMovimiento,
  crearGastoEnCuotas,
} from "@/lib/api";
import { Categoria, ModoGasto } from "@/lib/types";
import { fechaHoy, formatMes, sumarMeses } from "@/lib/formato";
import CategoryChips from "@/components/CategoryChips";
import EntidadLogo from "@/components/EntidadLogo";
import SegmentedControl from "@/components/SegmentedControl";
import MoneyInput from "@/components/MoneyInput";

export default function NuevoForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const idEditar = searchParams.get("id");
  const { perfil, hogar } = useAuth();
  const { perfiles } = usePerfilesHogar();
  const { cuentas } = useCuentas();
  const { mostrarToast } = useToast();

  const [monto, setMonto] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [pagadoPor, setPagadoPor] = useState<string>(perfil?.id ?? "");
  const [modo, setModo] = useState<ModoGasto>(perfiles.length > 1 ? "compartido" : "personal");
  const [cuentaId, setCuentaId] = useState<string | null>(null);
  const [fecha, setFecha] = useState(fechaHoy());
  const [esCuota, setEsCuota] = useState(false);
  const [cuotaActual, setCuotaActual] = useState("1");
  const [cuotaTotal, setCuotaTotal] = useState("12");
  // Si estás editando una cuota existente, esto guarda su etiqueta
  // (actual/total/grupo) para no perderla al guardar los cambios — la
  // UI de cuotas de más abajo es solo para CREAR un plan nuevo.
  const [cuotaOriginal, setCuotaOriginal] = useState<{
    actual: number;
    total: number;
    grupoId: string;
  } | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cargandoEdicion, setCargandoEdicion] = useState(!!idEditar);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const otroPerfil = useMemo(
    () => perfiles.find((p) => p.id !== pagadoPor) ?? null,
    [perfiles, pagadoPor]
  );

  useEffect(() => {
    if (!idEditar) return;
    obtenerMovimiento(idEditar)
      .then((m) => {
        if (!m) return;
        setMonto(String(m.monto));
        setDescripcion(m.descripcion);
        setCategoria(m.categoria);
        setPagadoPor(m.pagado_por);
        setModo(m.modo);
        setCuentaId(m.cuenta_id);
        setFecha(m.fecha);
        if (m.cuota_actual && m.cuota_total && m.cuota_grupo_id) {
          setCuotaOriginal({
            actual: m.cuota_actual,
            total: m.cuota_total,
            grupoId: m.cuota_grupo_id,
          });
        }
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
    const modoFinal: ModoGasto = perfiles.length > 1 ? modo : "personal";
    if (modoFinal === "para_otro" && !otroPerfil) {
      setErrorMsg("No se pudo identificar a la otra persona del hogar.");
      return;
    }
    const beneficiarioId = modoFinal === "para_otro" ? otroPerfil!.id : null;
    // Solo tiene sentido si el gasto lo pagaste vos: tus cuentas son
    // privadas, no se pueden ver ni elegir las de la otra persona.
    const cuentaFinal = pagadoPor === perfil?.id ? cuentaId : null;

    if (esCuota && !idEditar) {
      const actual = Number(cuotaActual);
      const total = Number(cuotaTotal);
      if (!actual || !total || actual < 1 || actual > total) {
        setErrorMsg("Revisá el número de cuota (la actual no puede ser mayor al total)");
        return;
      }
      setGuardando(true);
      try {
        const filas = await crearGastoEnCuotas({
          hogar_id: hogar.id,
          fecha,
          descripcion: descripcion.trim(),
          categoria,
          monto: montoNum,
          pagado_por: pagadoPor,
          modo: modoFinal,
          beneficiario_id: beneficiarioId,
          cuenta_id: cuentaFinal,
          cuota_actual: actual,
          cuota_total: total,
          notas: null,
        });
        mostrarToast(`${filas.length} cuotas cargadas`);
        router.replace("/");
      } catch {
        setErrorMsg("No se pudo guardar. Probá de nuevo.");
        setGuardando(false);
      }
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
        modo: modoFinal,
        beneficiario_id: beneficiarioId,
        cuenta_id: cuentaFinal,
        cuota_actual: cuotaOriginal?.actual ?? null,
        cuota_total: cuotaOriginal?.total ?? null,
        cuota_grupo_id: cuotaOriginal?.grupoId ?? null,
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
            <MoneyInput
              autoFocus
              value={monto}
              onChange={setMonto}
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
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">
              ¿De quién es este gasto?
            </label>
            <SegmentedControl<ModoGasto>
              value={modo}
              onChange={setModo}
              options={[
                { value: "personal", label: "Mío" },
                { value: "compartido", label: "Compartido" },
                {
                  value: "para_otro",
                  label: otroPerfil ? `100% de ${otroPerfil.nombre}` : "100% del otro",
                },
              ]}
            />
            {modo === "para_otro" && otroPerfil && (
              <p className="mt-2 text-xs text-subtle">
                {otroPerfil.nombre} te va a deber el monto entero (no se reparte por
                porcentaje).
              </p>
            )}
          </div>
        )}

        {pagadoPor === perfil?.id && cuentas.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-muted">
              Cuenta (opcional)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCuentaId(null)}
                className={`flex min-h-[44px] items-center rounded-full px-3.5 text-sm font-medium ${
                  cuentaId === null ? "bg-accent text-white shadow-sm" : "glass text-muted"
                }`}
              >
                Sin especificar
              </button>
              {cuentas.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCuentaId(c.id)}
                  className={`flex min-h-[44px] items-center gap-2 rounded-full py-1 pl-1 pr-3.5 text-sm font-medium ${
                    cuentaId === c.id ? "bg-accent text-white shadow-sm" : "glass text-muted"
                  }`}
                >
                  <EntidadLogo entidad={c.entidad} icono={c.icono} tamano={28} />
                  {c.nombre}
                </button>
              ))}
            </div>
          </div>
        )}

        {!idEditar && (
          <div>
            <div className="glass flex items-center justify-between rounded-2xl px-4 py-3">
              <span className="text-base font-medium text-foreground">
                Es en cuotas
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={esCuota}
                onClick={() => setEsCuota((v) => !v)}
                className={`relative h-8 w-14 rounded-full transition-colors ${
                  esCuota ? "bg-accent" : "bg-border"
                }`}
              >
                <span
                  className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                    esCuota ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {esCuota && (
              <div className="mt-3 flex flex-col gap-3 rounded-2xl border border-border p-4">
                <p className="text-xs text-subtle">
                  El monto de arriba es el de cada cuota. Se cargan de una
                  todas las cuotas que faltan, una por mes.
                </p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted">
                      Cuota actual
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={cuotaActual}
                      onChange={(e) => setCuotaActual(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-accent"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1 block text-xs font-medium text-muted">
                      De un total de
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={cuotaTotal}
                      onChange={(e) => setCuotaTotal(e.target.value)}
                      className="min-h-[44px] w-full rounded-xl border border-border bg-background px-3 text-base text-foreground outline-none focus:border-accent"
                    />
                  </div>
                </div>
                {Number(cuotaActual) > 0 &&
                  Number(cuotaTotal) >= Number(cuotaActual) && (
                    <p className="text-xs text-subtle">
                      Se van a cargar {Number(cuotaTotal) - Number(cuotaActual) + 1}{" "}
                      cuotas, de {formatMes(fecha.slice(0, 7))} a{" "}
                      {formatMes(
                        sumarMeses(
                          fecha,
                          Number(cuotaTotal) - Number(cuotaActual)
                        ).slice(0, 7)
                      )}
                      .
                    </p>
                  )}
              </div>
            )}
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
            {guardando
              ? "Guardando..."
              : esCuota && !idEditar
                ? "Cargar cuotas"
                : "Guardar"}
          </button>
        </div>
      </form>
    </main>
  );
}
