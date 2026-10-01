"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

// El "ojito": tapa todos los montos de la app de una vez, para poder
// abrirla delante de otra persona sin mostrar cuánta plata hay.
//
// Se implementa con un atributo en <html> y una regla CSS sobre la clase
// .monto (ver app/globals.css) en vez de cambiar cada número por
// asteriscos: así alcanza con marcar el elemento que muestra plata y no
// hay que pasar el estado por props hasta el último rincón.
const STORAGE_KEY = "fairo:montos_ocultos";

interface PrivacidadContextValue {
  montosOcultos: boolean;
  alternarMontos: () => void;
}

const PrivacidadContext = createContext<PrivacidadContextValue | null>(null);

function aplicar(ocultos: boolean) {
  const root = document.documentElement;
  if (ocultos) root.dataset.montos = "ocultos";
  else delete root.dataset.montos;
}

export function PrivacidadProvider({ children }: { children: React.ReactNode }) {
  const [montosOcultos, setMontosOcultos] = useState(false);

  useEffect(() => {
    const guardado = window.localStorage.getItem(STORAGE_KEY) === "1";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMontosOcultos(guardado);
    aplicar(guardado);
  }, []);

  const alternarMontos = useCallback(() => {
    setMontosOcultos((previo) => {
      const nuevo = !previo;
      try {
        window.localStorage.setItem(STORAGE_KEY, nuevo ? "1" : "0");
      } catch {
        // Si el navegador no deja guardar, vale para esta sesión igual.
      }
      aplicar(nuevo);
      return nuevo;
    });
  }, []);

  return (
    <PrivacidadContext.Provider value={{ montosOcultos, alternarMontos }}>
      {children}
    </PrivacidadContext.Provider>
  );
}

export function usePrivacidad(): PrivacidadContextValue {
  const ctx = useContext(PrivacidadContext);
  if (!ctx) throw new Error("usePrivacidad debe usarse dentro de PrivacidadProvider");
  return ctx;
}
