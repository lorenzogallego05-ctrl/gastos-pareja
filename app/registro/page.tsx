"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { registrarse } from "@/lib/api";

export default function RegistroPage() {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    if (cargando) return;
    if (session && perfil) router.replace("/");
    else if (session && !perfil) router.replace("/onboarding");
  }, [cargando, session, perfil, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("La contraseña tiene que tener al menos 6 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setEnviando(true);
    try {
      await registrarse(email.trim(), password);
      setEnviado(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No se pudo crear la cuenta."
      );
      setEnviando(false);
    }
  }

  if (cargando || session) return null;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-6 py-[calc(2rem+var(--safe-top))]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={72}
          height={72}
          className="rounded-[20px] shadow-md"
          priority
        />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Crear cuenta</h1>
          <p className="mt-1 text-sm text-muted">Fairo</p>
        </div>
      </div>

      {enviado ? (
        <div className="glass flex w-full max-w-xs flex-col gap-3 rounded-[32px] p-6 text-center">
          <p className="text-2xl" aria-hidden>
            📩
          </p>
          <p className="text-base font-semibold text-foreground">
            Revisá tu email
          </p>
          <p className="text-sm text-muted">
            Te mandamos un link para confirmar la cuenta. Cuando lo confirmes,
            volvé a la app e iniciá sesión.
          </p>
          <Link
            href="/login"
            className="mt-2 min-h-[44px] rounded-full bg-accent px-4 py-3 text-base font-semibold text-white active:opacity-80"
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : (
        <form
          onSubmit={enviar}
          className="glass flex w-full max-w-xs flex-col gap-4 rounded-[32px] p-6"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Email
            </label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Contraseña
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">
              Repetir contraseña
            </label>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-accent"
            />
          </div>

          {error && <p className="text-sm font-medium text-danger">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="min-h-[48px] w-full rounded-full bg-accent text-base font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
          >
            {enviando ? "Creando cuenta..." : "Crear cuenta"}
          </button>

          <p className="text-center text-sm text-muted">
            ¿Ya tenés cuenta?{" "}
            <Link href="/login" className="font-semibold text-accent">
              Iniciar sesión
            </Link>
          </p>
        </form>
      )}
    </main>
  );
}
