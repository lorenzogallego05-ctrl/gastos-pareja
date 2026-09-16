"use client";

import type { Session } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { obtenerMiHogar, obtenerMiPerfil, cerrarSesion } from "./api";
import { supabase } from "./supabaseClient";
import { Hogar, Perfil } from "./types";

interface AuthContextValue {
  cargando: boolean;
  session: Session | null;
  perfil: Perfil | null;
  hogar: Hogar | null;
  recargarPerfil: () => Promise<void>;
  salir: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [cargando, setCargando] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [hogar, setHogar] = useState<Hogar | null>(null);

  const cargarPerfilYHogar = useCallback(async (userId: string) => {
    const miPerfil = await obtenerMiPerfil(userId);
    setPerfil(miPerfil);
    if (miPerfil) {
      const miHogar = await obtenerMiHogar();
      setHogar(miHogar);
    } else {
      setHogar(null);
    }
  }, []);

  const recargarPerfil = useCallback(async () => {
    if (session?.user.id) await cargarPerfilYHogar(session.user.id);
  }, [session, cargarPerfilYHogar]);

  useEffect(() => {
    let activo = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!activo) return;
      setSession(data.session);
      if (data.session) {
        await cargarPerfilYHogar(data.session.user.id);
      }
      if (activo) setCargando(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_evento, nuevaSession) => {
        if (!activo) return;
        setSession(nuevaSession);
        if (nuevaSession) {
          await cargarPerfilYHogar(nuevaSession.user.id);
        } else {
          setPerfil(null);
          setHogar(null);
        }
        setCargando(false);
      }
    );

    return () => {
      activo = false;
      listener.subscription.unsubscribe();
    };
  }, [cargarPerfilYHogar]);

  const salir = useCallback(async () => {
    await cerrarSesion();
    setSession(null);
    setPerfil(null);
    setHogar(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ cargando, session, perfil, hogar, recargarPerfil, salir }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
