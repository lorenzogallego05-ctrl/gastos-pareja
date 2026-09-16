"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Tema = "claro" | "oscuro" | "auto";

const STORAGE_KEY = "gastos-pareja:tema";

interface ThemeContextValue {
  tema: Tema;
  elegirTema: (tema: Tema) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function aplicarTema(tema: Tema) {
  const root = document.documentElement;
  if (tema === "auto") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = tema === "oscuro" ? "dark" : "light";
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("auto");

  useEffect(() => {
    const guardado = window.localStorage.getItem(STORAGE_KEY) as Tema | null;
    const inicial = guardado ?? "auto";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTema(inicial);
    aplicarTema(inicial);
  }, []);

  const elegirTema = useCallback((nuevo: Tema) => {
    setTema(nuevo);
    window.localStorage.setItem(STORAGE_KEY, nuevo);
    aplicarTema(nuevo);
  }, []);

  return (
    <ThemeContext.Provider value={{ tema, elegirTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return ctx;
}
