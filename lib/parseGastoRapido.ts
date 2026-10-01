// Interpreta un gasto dictado en una sola frase, como llega desde el
// Atajo de iOS: "gasté 12.500 en nafta", "3500 café", "un café 3.500",
// "2k bondi". No pretende entender cualquier cosa: saca el monto, deja el
// resto como descripción y, si la frase dice "... en X", prueba X como
// categoría (si no existe en el hogar, la base la manda a "Otros").

export interface GastoDictado {
  monto: number;
  descripcion: string;
  categoria?: string;
}

// Palabras de relleno que la gente dice al dictar y no aportan nada a la
// descripción. Se recortan solo de los extremos, nunca del medio.
const RELLENO =
  /^(?:gast[eé]|gastar|pagu[eé]|pagar|compr[eé]|comprar|anot[aá]|anotar|cargar|carg[aá]|puse|son|fue|fueron|de|del|por|para|un|una|unos|unas|el|la|los|las|pesos|peso|mangos|\$|y|,|\.|-|:)$/i;

const NUMERO =
  /(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?)\s*(k|mil)?\b/i;

function aNumero(crudo: string, sufijo?: string): number | null {
  let texto = crudo;
  const tieneComa = texto.includes(",");
  const grupoMiles = /\.\d{3}(?:\D|$)/.test(texto + " ");

  if (tieneComa) {
    // Formato argentino completo: el punto separa miles, la coma decimales.
    texto = texto.replace(/\./g, "").replace(",", ".");
  } else if (grupoMiles) {
    // "12.500" son doce mil quinientos, no doce con medio.
    texto = texto.replace(/\./g, "");
  }

  let valor = Number(texto);
  if (!Number.isFinite(valor)) return null;
  if (sufijo) valor *= 1000;
  return valor;
}

function recortarRelleno(palabras: string[]): string[] {
  const copia = [...palabras];
  while (copia.length && RELLENO.test(copia[0])) copia.shift();
  while (copia.length && RELLENO.test(copia[copia.length - 1])) copia.pop();
  return copia;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export function parseGastoRapido(texto: string): GastoDictado | null {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) return null;

  const match = NUMERO.exec(limpio);
  if (!match) return null;

  const monto = aNumero(match[1], match[2]);
  if (monto === null || monto <= 0) return null;

  const resto = (limpio.slice(0, match.index) + " " + limpio.slice(match.index + match[0].length))
    .replace(/\s+/g, " ")
    .trim();

  let palabras = recortarRelleno(resto.split(" ").filter(Boolean));

  // "... en nafta": lo de después de "en" es el mejor candidato a
  // categoría. Si no queda nada antes, también es la descripción.
  let categoria: string | undefined;
  const dondeEn = palabras.findIndex((p) => /^en$/i.test(p));
  if (dondeEn !== -1 && dondeEn < palabras.length - 1) {
    categoria = palabras.slice(dondeEn + 1).join(" ");
    palabras = recortarRelleno(palabras.slice(0, dondeEn));
  }

  const descripcion = palabras.join(" ") || categoria || "";
  if (!descripcion) return null;

  return {
    monto,
    descripcion: capitalizar(descripcion),
    ...(categoria ? { categoria } : {}),
  };
}
