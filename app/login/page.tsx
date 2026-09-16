"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";
import { iniciarSesion } from "@/lib/api";

export default function LoginPage() {
  const { session, perfil, cargando } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (cargando) return;
    if (session && perfil) router.replace("/");
    else if (session && !perfil) router.replace("/onboarding");
  }, [cargando, session, perfil, router]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(email.trim(), password);
      // La redirección la maneja el efecto de arriba cuando llegue la sesión.
    } catch {
      setError("Email o contraseña incorrectos.");
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
          <h1 className="text-2xl font-bold text-foreground">Gastos Pareja</h1>
          <p className="mt-1 text-sm text-muted">
            Control de gastos compartidos
          </p>
        </div>
      </div>

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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-[44px] w-full rounded-2xl border border-border bg-background px-4 text-base text-foreground outline-none focus:border-accent"
          />
        </div>

        {error && <p className="text-sm font-medium text-danger">{error}</p>}

        <button
          type="submit"
          disabled={enviando}
          className="min-h-[48px] w-full rounded-full bg-accent text-base font-bold text-white shadow-sm active:opacity-80 disabled:opacity-50"
        >
          {enviando ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-center text-sm text-muted">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-semibold text-accent">
            Registrate
          </Link>
        </p>
      </form>
    </main>
  );
}
