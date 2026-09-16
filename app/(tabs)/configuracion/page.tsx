"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTheme, Tema } from "@/lib/useTheme";
import { usePerfilesHogar } from "@/lib/usePerfilesHogar";
import { useToast } from "@/lib/useToast";
import SegmentedControl from "@/components/SegmentedControl";

export default function ConfiguracionPage() {
  const { tema, elegirTema } = useTheme();
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
      </div>

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
