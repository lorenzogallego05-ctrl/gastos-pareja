"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTheme, Tema } from "@/lib/useTheme";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import { usePrivacidad } from "@/lib/usePrivacidad";
import { useToast } from "@/lib/useToast";
import SegmentedControl from "@/components/SegmentedControl";
import CargaRapidaCard from "@/components/CargaRapidaCard";

export default function ConfiguracionPage() {
  const { tema, elegirTema } = useTheme();
  const { montosOcultos, alternarMontos } = usePrivacidad();
  const { perfil, hogar, salir } = useAuth();
  const { perfiles } = usePerfilesHogar();
  const { mostrarToast } = useToast();
  const router = useRouter();

  async function cerrarSesion() {
    await salir();
    router.replace("/login");
  }

  async function copiarCodigo() {
    if (!hogar) return;
    try {
      await navigator.clipboard.writeText(hogar.codigo);
      mostrarToast("Código copiado");
    } catch {
      mostrarToast("No se pudo copiar");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="pt-1">
        <h1 className="text-[28px] leading-tight font-extrabold tracking-tight text-foreground">
          Configuración
        </h1>
      </header>

      <div className="glass flex flex-col gap-3 rounded-[28px] p-5">
        <h2 className="text-base font-semibold text-foreground">Apariencia</h2>
        <p className="text-sm text-subtle">
          &ldquo;Automático&rdquo; sigue la configuración de tu celular o navegador.
        </p>
        <SegmentedControl<Tema>
          value={tema}
          onChange={elegirTema}
          options={[
            { value: "claro", label: "Claro" },
            { value: "oscuro", label: "Oscuro" },
            { value: "auto", label: "Automático" },
          ]}
        />

        <div className="mt-1 flex items-center justify-between gap-3 border-t border-border pt-3">
          <div>
            <p className="text-sm font-medium text-foreground">Ocultar los montos</p>
            <p className="text-xs text-subtle">
              Difumina toda la plata, para abrir la app al lado de otra persona.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={montosOcultos}
            onClick={alternarMontos}
            aria-label="Ocultar los montos"
            className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
              montosOcultos ? "bg-accent" : "bg-border"
            }`}
          >
            <span
              className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                montosOcultos ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {perfil && <CargaRapidaCard perfilId={perfil.id} />}

      {hogar && (
        <div className="glass flex flex-col gap-3 rounded-[28px] p-5">
          <h2 className="text-base font-semibold text-foreground">Tu hogar</h2>
          <p className="text-sm text-subtle">
            {perfiles.length} de {hogar.capacidad}{" "}
            {hogar.capacidad === 1 ? "persona" : "personas"}:{" "}
            {perfiles.map((p) => p.nombre).join(", ")}
          </p>
          {perfiles.length < hogar.capacidad && (
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-accent/10 p-4">
              <p className="text-xs text-muted">
                Compartile este código para que se sume a tu hogar:
              </p>
              <p className="text-xl font-extrabold tracking-widest text-accent">
                {hogar.codigo}
              </p>
              <button
                onClick={copiarCodigo}
                className="min-h-[36px] rounded-full border border-border px-4 text-xs font-semibold text-foreground active:opacity-70"
              >
                Copiar código
              </button>
            </div>
          )}
        </div>
      )}

      <div className="glass flex flex-col gap-3 rounded-[28px] p-5">
        <h2 className="text-base font-semibold text-foreground">
          Instalar Fairo en el celular
        </h2>
        <p className="text-sm text-subtle">
          Instalada se abre a pantalla completa, entra más rápido y queda con su
          ícono entre tus apps.
        </p>
        <div className="flex flex-col gap-1 text-sm text-muted">
          <p>
            <strong className="text-foreground">iPhone:</strong> abrila en Safari,
            tocá Compartir y elegí &ldquo;Agregar a inicio&rdquo;.
          </p>
          <p>
            <strong className="text-foreground">Android:</strong> abrila en Chrome,
            tocá el menú de tres puntos y elegí &ldquo;Instalar aplicación&rdquo;.
          </p>
        </div>
      </div>

      <div className="glass flex flex-col gap-3 rounded-[28px] p-5">
        <h2 className="text-base font-semibold text-foreground">Cuenta</h2>
        <p className="text-sm text-subtle">
          Estás usando la app como{" "}
          <strong className="text-foreground">{perfil?.nombre}</strong>.
        </p>
        <button
          onClick={cerrarSesion}
          className="min-h-[44px] rounded-full border border-border text-sm font-semibold text-foreground active:opacity-70"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
