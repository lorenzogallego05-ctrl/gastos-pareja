// Catálogo de entidades conocidas para las cuentas/medios de pago. Si
// una cuenta usa una de estas, se le pone el logo automáticamente; si
// no, la persona la crea como "otro" y elige un emoji.
export interface EntidadInfo {
  nombre: string;
  logo: string | null;
  color: string;
  // "cover": el logo ya trae su propio fondo (llena el cuadrado entero).
  // "contain": el logo es transparente, se apoya sobre `color`.
  ajuste: "cover" | "contain";
}

export const ENTIDADES: Record<string, EntidadInfo> = {
  bbva: {
    nombre: "BBVA",
    logo: "/bbva.png",
    color: "#0a2540",
    ajuste: "cover",
  },
  santander: {
    nombre: "Banco Santander",
    logo: "/santander.png",
    color: "#ec0000",
    ajuste: "contain",
  },
  mercadopago: {
    nombre: "Mercado Pago",
    logo: "/mercadopago.png",
    color: "#00aeef",
    ajuste: "contain",
  },
  uala: {
    nombre: "Ualá",
    logo: "/uala.png",
    color: "#0d1b4c",
    ajuste: "contain",
  },
  personalpay: {
    nombre: "Personal Pay",
    logo: "/personalpay.png",
    color: "#5b4fe9",
    ajuste: "cover",
  },
  visa: {
    nombre: "Visa",
    logo: "/visa.png",
    color: "#1434cb",
    ajuste: "contain",
  },
  otro: {
    nombre: "Otra",
    logo: null,
    color: "#6b5d4f",
    ajuste: "contain",
  },
};

export const ENTIDADES_ORDEN = [
  "bbva",
  "santander",
  "mercadopago",
  "uala",
  "personalpay",
  "visa",
  "otro",
];

export function infoDeEntidad(entidad: string): EntidadInfo {
  return ENTIDADES[entidad] ?? ENTIDADES.otro;
}

// Íconos para cuando alguien crea una cuenta "otro" y elige uno a mano.
export const EMOJIS_CUENTA = ["🏦", "💳", "💰", "👛", "💵", "🪙", "📱", "🔒"];
