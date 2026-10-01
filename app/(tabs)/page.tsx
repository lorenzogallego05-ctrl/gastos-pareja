"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useMovimientos } from "@/lib/useMovimientos";
import { useIngresosMes } from "@/lib/useIngresosMes";
import { useIngresos } from "@/lib/useIngresos";
import { useLiquidaciones } from "@/lib/useLiquidaciones";
import { useCategorias } from "@/lib/useCategorias";
import { usePresupuestos } from "@/lib/usePresupuestos";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import { useCuentas } from "@/lib/useCuentas";
import {
  calcularBalanceGeneral,
  calcularMisGastos,
  calcularReparto,
  compromisosDelMes,
  mapaPresupuestos,
  movimientosVisibles,
  totalGastadoMes,
  totalesPorCategoria,
} from "@/lib/calculos";
import { formatMes, formatMonto, mesActual, textoUSD } from "@/lib/formato";
import { useDolarOficial } from "@/lib/useDolar";
import { usePrivacidad } from "@/lib/usePrivacidad";
import DebtCard from "@/components/DebtCard";
import CuentasCard from "@/components/CuentasCard";
import CompromisosCard from "@/components/CompromisosCard";
import SeccionInicio from "@/components/SeccionInicio";
import PrimerosPasos, { Paso } from "@/components/PrimerosPasos";
import { useGastosFijos } from "@/lib/useGastosFijos";
import { useSeccionesInicio } from "@/lib/useSeccionesInicio";
import CategoryChart from "@/components/CategoryChart";
import MovementList from "@/components/MovementList";

// ¿La app está abierta como app instalada y no como pestaña del navegador?
// Sirve para dar por cumplido el paso "instalala en tu celular".
function estaInstalada(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS no implementa display-mode: standalone en Safari viejo.
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export default function DashboardPage() {
  const { perfil, hogar, salir } = useAuth();
  const router = useRouter();
  const mes = mesActual();
  const { movimientos, cargando, error } = useMovimientos();
  const { ingresos } = useIngresosMes(mes);
  const { ingresos: ingresosTodos } = useIngresos();
  const { liquidaciones, recargar: recargarLiquidaciones } = useLiquidaciones();
  const { categorias } = useCategorias();
  const { presupuestos } = usePresupuestos(mes);
  const { perfiles } = usePerfilesHogar();
  const { gastosFijos } = useGastosFijos();
  // Las cuentas se piden acá (y no dentro de CuentasCard) porque también
  // las necesita la tarjeta de primeros pasos: un solo pedido para las dos.
  const { cuentas, cargando: cargandoCuentas } = useCuentas();
  const dolarOficial = useDolarOficial();
  const { estaVisible, alternar } = useSeccionesInicio();
  const { montosOcultos, alternarMontos } = usePrivacidad();
  const [personalizando, setPersonalizando] = useState(false);
  const [instalada] = useState(estaInstalada);

  const movimientosMes = useMemo(
    () => movimientos.filter((m) => m.fecha.startsWith(mes)),
    [movimientos, mes]
  );

  const reparto = useMemo(
    () => calcularReparto(perfiles, ingresos, movimientosMes),
    [perfiles, ingresos, movimientosMes]
  );

  // Balance general: a diferencia de "reparto" (solo este mes), arrastra
  // entre meses y descuenta las liquidaciones ya registradas.
  const balance = useMemo(
    () => calcularBalanceGeneral(perfiles, ingresosTodos, movimientos, liquidaciones),
    [perfiles, ingresosTodos, movimientos, liquidaciones]
  );

  // Lo que ve ESTE usuario: los gastos personales del otro nunca aparecen
  // acá (ni en la lista, ni sumados en categorías o en el total del mes).
  // Además, la base de datos ya filtra esto por RLS: ni siquiera llegan.
  const movimientosMesVisibles = useMemo(
    () => (perfil ? movimientosVisibles(movimientosMes, perfil.id) : []),
    [movimientosMes, perfil]
  );

  const totalMes = useMemo(
    () => totalGastadoMes(movimientosMesVisibles),
    [movimientosMesVisibles]
  );
  const categoriaTotales = useMemo(
    () => totalesPorCategoria(movimientosMesVisibles),
    [movimientosMesVisibles]
  );
  const presupuestosMapa = useMemo(() => mapaPresupuestos(presupuestos), [presupuestos]);
  const misGastos = useMemo(
    () => (perfil ? calcularMisGastos(movimientosMes, reparto, perfil.id) : null),
    [movimientosMes, reparto, perfil]
  );
  const compromisos = useMemo(
    () => compromisosDelMes(gastosFijos, movimientos, mes),
    [gastosFijos, movimientos, mes]
  );
  const ultimos = useMemo(
    () => (perfil ? movimientosVisibles(movimientos, perfil.id).slice(0, 10) : []),
    [movimientos, perfil]
  );

  const pasos = useMemo<Paso[]>(() => {
    const miIngreso = ingresos.find((i) => i.perfil_id === perfil?.id);
    const lista: Paso[] = [
      {
        id: "gasto",
        texto: "Anotá tu primer gasto",
        href: "/nuevo",
        accion: "Cargar un gasto",
        hecho: movimientos.length > 0,
      },
      {
        id: "ingreso",
        texto: "Cargá cuánto cobrás este mes",
        href: "/ingresos",
        accion: "Cargar mi ingreso",
        hecho: !!miIngreso && miIngreso.monto > 0,
      },
      {
        id: "cuentas",
        texto: "Sumá tus tarjetas y cuentas",
        href: "/ingresos",
        accion: "Agregar una cuenta",
        hecho: cuentas.length > 0,
      },
      {
        id: "fijos",
        texto: "Anotá un gasto fijo (alquiler, internet…)",
        href: "/ingresos",
        accion: "Agregar un gasto fijo",
        hecho: gastosFijos.length > 0,
      },
    ];
    if (hogar && hogar.capacidad > 1) {
      lista.push({
        id: "invitar",
        texto: "Invitá a la otra persona del hogar",
        href: "/configuracion",
        accion: "Ver el código del hogar",
        hecho: perfiles.length > 1,
      });
    }
    lista.push({
      id: "instalar",
      texto: "Instalá Fairo en la pantalla de inicio",
      href: "/configuracion",
      accion: "Cómo instalarla",
      hecho: instalada,
    });
    return lista;
  }, [ingresos, perfil, movimientos, cuentas, gastosFijos, hogar, perfiles, instalada]);

  async function cambiarUsuario() {
    await salir();
    router.replace("/login");
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 pt-1">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-subtle">
            Hola, {perfil?.nombre} 👋
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={alternarMontos}
              aria-label={montosOcultos ? "Mostrar los montos" : "Ocultar los montos"}
              title={montosOcultos ? "Mostrar los montos" : "Ocultar los montos"}
              className="glass flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full text-sm active:opacity-70"
            >
              {montosOcultos ? "🙈" : "👁️"}
            </button>
            <button
              onClick={() => setPersonalizando((v) => !v)}
              className="glass min-h-[32px] rounded-full px-3.5 text-xs font-semibold text-accent active:opacity-70"
            >
              {personalizando ? "Listo" : "Personalizar"}
            </button>
            <button
              onClick={cambiarUsuario}
              className="glass min-h-[32px] rounded-full px-3.5 text-xs font-semibold text-accent active:opacity-70"
            >
              Salir
            </button>
          </div>
        </div>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground">
          Inicio
        </h1>
        <p className="text-sm text-subtle">{formatMes(mes)}</p>
      </header>

      {cargando ? (
        <p className="text-sm text-subtle">Cargando...</p>
      ) : (
        <>
          {error && (
            <p className="rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
              {error}
            </p>
          )}

          {!cargandoCuentas && !personalizando && <PrimerosPasos pasos={pasos} />}

          {balance.personas.length >= 2 && (
            <SeccionInicio
              titulo="Balance general"
              visible={estaVisible("balance")}
              personalizando={personalizando}
              onAlternar={() => alternar("balance")}
            >
              <DebtCard
                balance={balance}
                perfiles={perfiles}
                liquidaciones={liquidaciones}
                onLiquidado={recargarLiquidaciones}
              />
            </SeccionInicio>
          )}

          <SeccionInicio
            titulo="Tus cuentas"
            visible={estaVisible("cuentas")}
            personalizando={personalizando}
            onAlternar={() => alternar("cuentas")}
          >
            <CuentasCard
              cuentas={cuentas}
              cargando={cargandoCuentas}
              movimientos={movimientos}
            />
          </SeccionInicio>

          <SeccionInicio
            titulo="Fijos y cuotas"
            visible={estaVisible("compromisos")}
            personalizando={personalizando}
            onAlternar={() => alternar("compromisos")}
          >
            <CompromisosCard compromisos={compromisos} perfiles={perfiles} />
          </SeccionInicio>

          <SeccionInicio
            titulo="Total gastado este mes"
            visible={estaVisible("total")}
            personalizando={personalizando}
            onAlternar={() => alternar("total")}
          >
          <div className="glass rounded-[28px] p-5">
            <p className="text-sm font-medium text-muted">
              Total gastado este mes
            </p>
            <p className="monto mt-1 text-3xl font-extrabold text-foreground">
              {formatMonto(totalMes)}
            </p>
            {dolarOficial && (
              <p className="monto text-xs text-subtle">
                {textoUSD(totalMes, dolarOficial)}
              </p>
            )}
            {reparto.personas.length >= 2 && (
              <p className="monto mt-1 text-xs text-subtle">
                Compartido —{" "}
                {reparto.personas
                  .map((p) => `${p.nombre}: ${formatMonto(p.pagado)}`)
                  .join(" · ")}
              </p>
            )}
          </div>
          </SeccionInicio>

          {misGastos && reparto.personas.length >= 2 && (
            <SeccionInicio
              titulo="Mis gastos"
              visible={estaVisible("misgastos")}
              personalizando={personalizando}
              onAlternar={() => alternar("misgastos")}
            >
            <div className="glass rounded-[28px] p-5">
              <h2 className="mb-3 text-base font-semibold text-foreground">
                Mis gastos ({perfil?.nombre})
              </h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted">Personales (no divididos)</span>
                  <span className="monto font-semibold text-foreground">
                    {formatMonto(misGastos.personal)}
                  </span>
                </div>
                {misGastos.paraOtroRecibido > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Pagados por el otro (100% tuyos)</span>
                    <span className="monto font-semibold text-foreground">
                      {formatMonto(misGastos.paraOtroRecibido)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-muted">Tu parte de lo compartido</span>
                  <span className="monto font-semibold text-foreground">
                    {formatMonto(misGastos.miParteCompartido)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                  <span className="font-medium text-foreground">Total tuyo</span>
                  <span className="monto text-lg font-extrabold text-accent">
                    {formatMonto(misGastos.total)}
                  </span>
                </div>
              </div>
            </div>
            </SeccionInicio>
          )}

          <SeccionInicio
            titulo="Gasto por categoría"
            visible={estaVisible("categorias")}
            personalizando={personalizando}
            onAlternar={() => alternar("categorias")}
          >
            <div className="glass rounded-[28px] p-5">
              <h2 className="mb-1 text-base font-semibold text-foreground">
                Gasto por categoría
              </h2>
              <p className="mb-3 text-xs text-subtle">
                Tocá una categoría para ver en qué se fue.
              </p>
              <CategoryChart
                datos={categoriaTotales}
                categorias={categorias}
                presupuestos={presupuestosMapa}
                enlaceMes={mes}
              />
            </div>
          </SeccionInicio>

          <SeccionInicio
            titulo="Últimos movimientos"
            visible={estaVisible("ultimos")}
            personalizando={personalizando}
            onAlternar={() => alternar("ultimos")}
          >
            <MovementList
              movimientos={ultimos}
              categorias={categorias}
              perfiles={perfiles}
              verTodosHref="/historial"
            />
          </SeccionInicio>
        </>
      )}
    </div>
  );
}
