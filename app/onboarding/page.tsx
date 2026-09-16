"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";
import { crearHogar, unirseAHogar } from "@/lib/api";
import { useToast } from "@/lib/useToast";

type Modo = "elegir" | "crear" | "unirse";

export default function OnboardingPage() {
  const { session, perfil, cargando, recargarPerfil } = useAuth();
  const router = useRouter();
  const { mostrarToast } = useToast();

  const [modo, setModo] = useState<Modo>("elegir");
  const [codigoGenerado, setCodigoGenerado] = useState<string | null>(null);

  useEffect(() => {
    if (cargando) return;
    if (!session) router.replace("/login");
    else if (perfil) router.replace("/");
  }, [cargando, session, perfil, router]);

  async function continuar() {
    await recargarPerfil();
    router.replace("/");
  }

  if (cargando || !session || perfil) return null;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 py-[calc(2rem+var(--safe-top))]">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-foreground">¡Ya casi!</h1>
        <p className="mt-1 text-sm text-muted">
          Configurá tu hogar para empezar a usar la app
        </p>
      </div>

      {codigoGenerado ? (
        <CodigoGenerado codigo={codigoGenerado} onContinuar={continuar} />
      ) : modo === "elegir" ? (
        <div className="glass flex w-full max-w-xs flex-col gap-3 rounded-[32px] p-6">
          <button
            onClick={() => setModo("crear")}
            className="min-h-[64px] rounded-2xl bg-accent px-4 text-left text-white active:opacity-80"
          >
            <span className="block text-base font-bold">Crear mi hogar</span>
            <span className="block text-xs opacity-90">
              Empezá de cero, sola/o o para compartir después
            </span>
          </button>
          <button
            onClick={() => setModo("unirse")}
            className="glass min-h-[64px] rounded-2xl px-4 text-left text-foreground active:opacity-80"
          >
            <span className="block text-base font-bold">
              Unirme con un código
            </span>
            <span className="block text-xs text-muted">
              Alguien ya te pasó el código de su hogar
            </span>
          </button>
        </div>
      ) : modo === "crear" ? (
        <FormCrearHogar
          onVolver={() => setModo("elegir")}
          onCreado={(codigo, compartido) => {
            if (compartido) setCodigoGenerado(codigo);
            else continuar();
          }}
        />
      ) : (
        <FormUnirse
          onVolver={() => setModo("elegir")}
          onUnido={() => {
            mostrarToast("¡Listo, te uniste al hogar!");
            continuar();
          }}
        />
      )}
    </main>
  );
}

function FormCrearHogar({
  onVolver,
  onCreado,
}: {
  onVolver: () => void;
  onCreado: (codigo: string, compartido: boolean) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [compartido, setCompartido] = useState<boolean | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    if (compartido === null) return;
    setError(null);
    setGuardando(true);
    try {
      const { codigo } = await crearHogar(nombre.trim(), compartido ? 2 : 1);
      onCreado(codigo, compartido);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear el hogar.");
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={crear}
      className="glass flex w-full max-w-xs flex-col gap-4 rounded-[32px] p-6"
    >
      <button
        type="button"
        onClick={onVolver}
        className="self-start text-sm font-medium text-accent"
      >
        ← Volver
      </button>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">
          Tu nombre
        </label>
        <input
          type="text"
          required
          autoFocus
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Lolo"
          className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-muted">
          ¿Vas a compartir gastos con alguien?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCompartido(false)}
            className={`min-h-[52px] rounded-2xl text-sm font-bold ${
              compartido === false
                ? "bg-accent text-white"
                : "glass text-muted"
            }`}
          >
            Solo yo
          </button>
          <button
            type="button"
            onClick={() => setCompartido(true)}
            className={`min-h-[52px] rounded-2xl text-sm font-bold ${
              compartido === true ? "bg-accent text-white" : "glass text-muted"
            }`}
          >
            Voy a compartir
          </button>
        </div>
      </div>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <button
        type="submit"
        disabled={!nombre.trim() || compartido === null || guardando}
        className="min-h-[48px] w-full rounded-full bg-accent text-base font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
      >
        {guardando ? "Creando..." : "Crear hogar"}
      </button>
    </form>
  );
}

function FormUnirse({
  onVolver,
  onUnido,
}: {
  onVolver: () => void;
  onUnido: () => void;
}) {
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unirse(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setGuardando(true);
    try {
      await unirseAHogar(codigo.trim(), nombre.trim());
      onUnido();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo unir al hogar."
      );
      setGuardando(false);
    }
  }

  return (
    <form
      onSubmit={unirse}
      className="glass flex w-full max-w-xs flex-col gap-4 rounded-[32px] p-6"
    >
      <button
        type="button"
        onClick={onVolver}
        className="self-start text-sm font-medium text-accent"
      >
        ← Volver
      </button>

      <div>
        <label className="mb-1 block text-sm font-medium text-muted">
          Código de invitación
        </label>
        <input
          type="text"
          required
          autoFocus
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
          placeholder="AB3F-92K1"
          className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 text-center text-lg font-semibold tracking-widest text-foreground outline-none focus:border-accent"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-muted">
          Tu nombre
        </label>
        <input
          type="text"
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Ej: Jaz"
          className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      {error && <p className="text-sm font-medium text-danger">{error}</p>}

      <button
        type="submit"
        disabled={!codigo.trim() || !nombre.trim() || guardando}
        className="min-h-[48px] w-full rounded-full bg-accent text-base font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
      >
        {guardando ? "Uniéndome..." : "Unirme"}
      </button>
    </form>
  );
}

function CodigoGenerado({
  codigo,
  onContinuar,
}: {
  codigo: string;
  onContinuar: () => void;
}) {
  const { mostrarToast } = useToast();

  async function copiar() {
    try {
      await navigator.clipboard.writeText(codigo);
      mostrarToast("Código copiado");
    } catch {
      mostrarToast("No se pudo copiar");
    }
  }

  return (
    <div className="glass flex w-full max-w-xs flex-col items-center gap-4 rounded-[32px] p-6 text-center">
      <p className="text-2xl" aria-hidden>
        🎉
      </p>
      <p className="text-base font-semibold text-foreground">
        Tu hogar está listo
      </p>
      <p className="text-sm text-muted">
        Compartile este código a tu pareja para que se una:
      </p>
      <p className="rounded-2xl bg-accent/10 px-6 py-4 text-2xl font-extrabold tracking-widest text-accent">
        {codigo}
      </p>
      <button
        onClick={copiar}
        className="glass min-h-[44px] w-full rounded-full text-sm font-semibold text-foreground active:opacity-80"
      >
        Copiar código
      </button>
      <button
        onClick={onContinuar}
        className="min-h-[48px] w-full rounded-full bg-accent text-base font-bold text-white shadow-sm active:opacity-80"
      >
        Continuar
      </button>
    </div>
  );
}
