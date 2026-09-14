"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Persona } from "./types";

const STORAGE_KEY = "gastos-pareja:usuario";

interface AuthContextValue {
  usuario: Persona | null;
  cargando: boolean;
  elegirUsuario: (persona: Persona) => void;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Persona | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(STORAGE_KEY);
      if (guardado === "Lolo" || guardado === "Jaz") {
        setUsuario(guardado);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  const elegirUsuario = useCallback((persona: Persona) => {
    window.localStorage.setItem(STORAGE_KEY, persona);
    setUsuario(persona);
  }, []);

  const cerrarSesion = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setUsuario(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ usuario, cargando, elegirUsuario, cerrarSesion }}
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
