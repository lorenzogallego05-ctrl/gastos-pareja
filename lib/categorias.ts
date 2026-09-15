import { CategoriaRow } from "./types";

// Ícono por defecto si una categoría no se encuentra (no debería pasar).
export const ICONO_POR_DEFECTO = "📦";

export function iconoDeCategoria(
  categorias: CategoriaRow[],
  nombre: string
): string {
  return categorias.find((c) => c.nombre === nombre)?.icono ?? ICONO_POR_DEFECTO;
}

// Paleta acotada para elegir ícono al crear una categoría nueva.
export const EMOJIS_CATEGORIA = [
  "📦",
  "🏠",
  "🛒",
  "🍽️",
  "🚗",
  "💡",
  "🩺",
  "🎉",
  "👕",
  "📚",
  "🐾",
  "🎁",
  "💻",
  "✈️",
  "🏋️",
  "🎵",
  "📱",
  "🔧",
  "☕",
  "🍺",
];
