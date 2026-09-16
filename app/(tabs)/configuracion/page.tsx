"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { useTheme, Tema } from "@/lib/useTheme";
import SegmentedControl from "@/components/SegmentedControl";

export default function ConfiguracionPage() {
  const { tema, elegirTema } = useTheme();
  const { usuario, cerrarSesion } = useAuth();
  const router = useRouter();

  function cambiarUsuario() {
    cerrarSesion();
    router.replace("/login");
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

      <div className="glass flex flex-col gap-3 rounded-[28px] p-5">
        <h2 className="text-base font-semibold text-foreground">Cuenta</h2>
        <p className="text-sm text-subtle">
          Estás usando la app como <strong className="text-foreground">{usuario}</strong>.
        </p>
        <button
          onClick={cambiarUsuario}
          className="min-h-[44px] rounded-full border border-border text-sm font-semibold text-foreground active:opacity-70"
        >
          Cambiar de usuario
        </button>
      </div>
    </div>
  );
}
