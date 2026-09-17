"use client";

import { useState } from "react";
import { formatMiles } from "@/lib/formato";

// Input de monto que muestra el separador de miles cuando no está
// enfocado (para leerlo cómodo) y el valor crudo mientras se edita
// (para no pelearse con la posición del cursor mientras se formatea en
// vivo). El valor que maneja el padre siempre es el crudo (sin puntos).
export default function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [enfocado, setEnfocado] = useState(false);

  return (
    <input
      type="text"
      inputMode="decimal"
      autoFocus={autoFocus}
      value={enfocado || !value ? value : formatMiles(value)}
      onFocus={() => setEnfocado(true)}
      onBlur={() => setEnfocado(false)}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9,]/g, ""))}
      placeholder={placeholder}
      className={className}
    />
  );
}
