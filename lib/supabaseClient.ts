import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Faltan las variables de entorno NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisá el archivo .env.local."
  );
}

// Se usan valores de relleno cuando faltan las variables de entorno (por
// ejemplo, durante el build sin .env.local) para que createClient no tire
// una excepción y rompa el prerenderizado estático. En tiempo de ejecución
// real las llamadas a Supabase van a fallar igual, pero de forma controlada.
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-anon-key",
  {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);
